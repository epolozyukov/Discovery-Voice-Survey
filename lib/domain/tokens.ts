import { randomBytes } from "node:crypto";
import type { ResponseStatus, SurveyStatus } from "@/types";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** 256 bits of entropy, url-safe. */
export const generateToken = () => randomBytes(32).toString("base64url");

export const isWellFormedToken = (value: string) => TOKEN_RE.test(value);

export type AccessResult =
  | { ok: true; readOnly: boolean }
  | { ok: false; reason: "not_found" | "inactive" };

export function checkParticipantAccess(
  found: { surveyStatus: SurveyStatus; responseStatus: ResponseStatus } | null,
): AccessResult {
  if (!found) return { ok: false, reason: "not_found" };
  if (found.surveyStatus !== "active") return { ok: false, reason: "inactive" };
  return { ok: true, readOnly: found.responseStatus === "completed" };
}
