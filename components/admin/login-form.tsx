"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { btnPrimary, input } from "@/components/ui/styles";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-ad-bad-soft px-3 py-2 text-sm text-ad-bad">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} py-2.5`}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
