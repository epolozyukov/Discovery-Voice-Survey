import "server-only";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/server";

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/** Server-side authorization for every admin page, action and route. */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email || !isAdminEmail(email)) redirect("/admin/login");
  return { email };
}

/** For route handlers: returns null instead of redirecting. */
export async function getAdminOrNull(): Promise<{ email: string } | null> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  return email && isAdminEmail(email) ? { email } : null;
}
