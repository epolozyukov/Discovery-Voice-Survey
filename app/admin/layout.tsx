import Link from "next/link";
import { logout } from "./actions";
import { getAdminOrNull } from "@/lib/auth";
import { AdminBrand } from "@/components/admin/brand";
import { btnSecondary } from "@/components/ui/styles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminOrNull();
  return (
    <div className="ad-shell-bg min-h-dvh">
      {admin && (
        <header className="sticky top-0 z-10 border-b border-ad-line bg-ad-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/admin" aria-label="Discovery Voice Survey home"><AdminBrand /></Link>
            <form action={logout} className="flex items-center gap-3 text-sm">
              <span className="hidden items-center gap-2 text-ad-muted sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ad-brand-soft text-xs font-bold uppercase text-ad-brand" aria-hidden="true">{admin.email[0]}</span>
                {admin.email}
              </span>
              <button className={btnSecondary}>Sign out</button>
            </form>
          </div>
        </header>
      )}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
