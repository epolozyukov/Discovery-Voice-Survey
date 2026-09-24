import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "e2e-admin@example.test";

/** Creates a throwaway admin for the run and removes it (and any E2E surveys) afterwards. */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // DB-backed specs skip themselves
  const db = createClient(url, key, { auth: { persistSession: false } });

  const cleanup = async () => {
    await db.from("surveys").delete().like("title", "E2E %");
    const { data } = await db.auth.admin.listUsers({ perPage: 200 });
    for (const u of data?.users ?? []) if (u.email === EMAIL) await db.auth.admin.deleteUser(u.id);
  };
  await cleanup();
  const password = randomBytes(18).toString("base64url");
  const { error } = await db.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
  if (error) throw error;
  process.env.E2E_ADMIN_PASSWORD = password;
  return cleanup;
}
