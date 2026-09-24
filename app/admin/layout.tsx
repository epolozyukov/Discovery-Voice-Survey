import Link from "next/link";
import { logout } from "./actions";
import { getAdminOrNull } from "@/lib/auth";
import { btnSecondary } from "@/components/ui/styles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminOrNull();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {admin && (
        <header className="mb-8 flex items-center justify-between border-b border-gray-300 pb-4">
          <Link href="/admin" className="text-lg font-semibold">Discovery Surveys</Link>
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{admin.email}</span>
            <button className={btnSecondary}>Sign out</button>
          </form>
        </header>
      )}
      {children}
    </div>
  );
}
