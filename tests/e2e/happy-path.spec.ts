import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const db = hasDb
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null;

test.skip(!hasDb, "needs a Supabase project");

const title = `E2E ${Date.now()}`;
const MOCK = "This is a mock transcript.";

test("admin creates a survey, SME answers by text and voice, admin reviews and exports", async ({ page, browser }) => {
  // --- Admin: login, create, activate, generate link
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("e2e-admin@example.test");
  await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Surveys" })).toBeVisible();

  await page.getByRole("link", { name: "Create survey" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Question 1", { exact: true }).fill("How do you use AI?");
  await page.getByRole("button", { name: "+ Add question" }).click();
  await page.getByLabel("Question 2", { exact: true }).fill("Which tools?");
  await page.getByRole("button", { name: "+ Add question" }).click();
  await page.getByLabel("Question 3", { exact: true }).fill("Anything else?");
  await page.getByRole("checkbox").nth(2).uncheck(); // Q3 optional
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(title) })).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("(active)")).toBeVisible();
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText("SME-001")).toBeVisible();

  const { data: s } = await db!.from("surveys").select("id").eq("title", title).single();
  const { data: p } = await db!.from("participants").select("token").eq("survey_id", s!.id).single();
  const link = `/survey/${p!.token}`;

  // --- Participant (separate session, no admin cookies)
  const smeCtx = await browser.newContext({ baseURL: "http://localhost:3100", permissions: ["microphone"] });
  const sme = await smeCtx.newPage();
  await sme.goto(link);
  await sme.getByRole("button", { name: "Start" }).click();

  // required validation
  await sme.getByRole("button", { name: "Next →" }).click();
  await expect(sme.getByRole("alert").filter({ hasText: "Please provide an answer" })).toBeVisible();

  // text answer
  await sme.getByPlaceholder("Type your answer...").fill("We use Copilot, mostly for code.");
  await sme.getByRole("button", { name: "Next →" }).click();
  await expect(sme.getByText("Question 2 of 3")).toBeVisible();

  // voice answer (mock provider) + edit transcript
  await sme.getByRole("button", { name: /Record Answer/ }).click();
  await expect(sme.getByText(/Recording…/)).toBeVisible();
  await sme.getByRole("button", { name: "Stop Recording" }).click();
  await expect(sme.getByPlaceholder("Type your answer...")).toHaveValue(MOCK);
  await sme.getByPlaceholder("Type your answer...").fill(`${MOCK} Edited.`);

  // refresh keeps progress
  await sme.reload();
  await expect(sme.getByText("Question 2 of 3")).toBeVisible();
  await expect(sme.getByPlaceholder("Type your answer...")).toHaveValue(`${MOCK} Edited.`);

  // optional Q3 can be skipped, then review + edit + submit
  await sme.getByRole("button", { name: "Next →" }).click();
  await sme.getByRole("button", { name: "Review" }).click();
  await expect(sme.getByRole("heading", { name: "Review your answers" })).toBeVisible();
  await sme.getByRole("button", { name: "Edit" }).first().click();
  await sme.getByPlaceholder("Type your answer...").fill("We use Copilot for code and ChatGPT for docs.");
  await sme.getByRole("button", { name: "Next →" }).click();
  await sme.getByRole("button", { name: "Next →" }).click();
  await sme.getByRole("button", { name: "Review" }).click();
  await sme.getByRole("button", { name: "Submit Interview" }).click();
  await expect(sme.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  // submitted response is read-only after reload
  await sme.reload();
  await expect(sme.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(sme.getByPlaceholder("Type your answer...")).toHaveCount(0);

  // --- Admin: see result and export
  await page.reload();
  await expect(page.getByTestId("summary")).toContainText("1 completed");
  await page.getByRole("link", { name: "Open" }).click();
  await expect(page.getByText("We use Copilot for code and ChatGPT for docs.")).toBeVisible();
  await expect(page.getByText(`${MOCK} Edited.`)).toBeVisible();

  const csv = await page.request.get(`/api/export/${s!.id}?format=csv`);
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body.split("\r\n")[0]).toBe("participant,questionId,question,answer,inputMethod,completedAt");
  expect(body).toContain("SME-001,Q01,How do you use AI?,We use Copilot for code and ChatGPT for docs.,text,");
  expect(body).toContain("Q02,Which tools?");
  expect(body).toContain(",voice,");
  const json = await (await page.request.get(`/api/export/${s!.id}?format=json`)).json();
  expect(json[0].participantId).toBe("SME-001");

  // --- Deactivated survey: link stops working
  await page.goto(`/admin/surveys/${s!.id}`);
  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("(inactive)")).toBeVisible();
  const fresh = await smeCtx.newPage();
  await fresh.goto(link);
  await expect(fresh.getByRole("heading", { name: "This survey is not open" })).toBeVisible();
  await smeCtx.close();
});

test("microphone unavailable falls back to typing", async ({ browser }) => {
  const { data: s } = await db!.from("surveys").insert({ title: "E2E mic", status: "active" }).select("id").single();
  await db!.rpc("replace_questions", { p_survey_id: s!.id, p_questions: [{ text: "Mic test?", required: true }] });
  const token = (await import("node:crypto")).randomBytes(32).toString("base64url");
  const { data: p } = await db!.from("participants").insert({ survey_id: s!.id, label: "SME-001", token }).select("id").single();
  await db!.from("responses").insert({ participant_id: p!.id });

  const ctx = await browser.newContext({ baseURL: "http://localhost:3100" }); // no mic permission
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: () => Promise.reject(new DOMException("denied", "NotAllowedError")) } });
  });
  const page = await ctx.newPage();
  await page.goto(`/survey/${token}`);
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: /Record Answer/ }).click();
  await expect(page.getByText("Microphone access is unavailable.")).toBeVisible();
  await page.getByPlaceholder("Type your answer...").fill("typed instead");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Submit Interview" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await ctx.close();
});
