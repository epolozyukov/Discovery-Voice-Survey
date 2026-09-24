import { LoginForm } from "@/components/admin/login-form";
import { AdminBrand } from "@/components/admin/brand";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[80dvh] max-w-4xl items-center gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        <AdminBrand size="lg" />
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Voice-first <span className="ad-grad-text">Discovery</span> surveys.
        </h1>
        <p className="max-w-md text-ad-muted">Create a questionnaire, send personal links to your experts, and read their answers, typed or spoken.</p>
      </div>
      <div className="ad-card flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">Admin sign in</h2>
          <p className="text-sm text-ad-muted">Use the email and password you were given.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
