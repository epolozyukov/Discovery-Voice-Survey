import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listSurveys } from "@/lib/data/admin";
import { btnPrimary } from "@/components/ui/styles";
import { StatTile } from "@/components/admin/stat-tile";
import { StatusPill } from "@/components/admin/status-pill";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireAdmin();
  const surveys = await listSurveys();
  const participants = surveys.reduce((n, s) => n + s.participantCount, 0);
  const completed = surveys.reduce((n, s) => n + s.completedCount, 0);
  const rate = participants ? Math.round((completed / participants) * 100) : 0;

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-ad-muted">Everything you are running before your Discovery workshops.</p>
        </div>
        <Link href="/admin/surveys/new" className={btnPrimary}>+ Create survey</Link>
      </div>

      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Surveys" value={surveys.length} />
        <StatTile label="Active" value={surveys.filter((s) => s.status === "active").length} />
        <StatTile label="Experts invited" value={participants} />
        <StatTile label="Completion" value={`${rate}%`} hint={`${completed} of ${participants} completed`} />
      </section>

      {surveys.length === 0 ? (
        <div className="ad-card grid place-items-center gap-3 p-12 text-center">
          <p className="text-lg font-semibold">No surveys yet</p>
          <p className="max-w-sm text-ad-muted">Create your first survey, add your questions, then generate a personal link for each expert.</p>
          <Link href="/admin/surveys/new" className={btnPrimary}>Create your first survey</Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {surveys.map((s) => {
            const pct = s.participantCount ? Math.round((s.completedCount / s.participantCount) * 100) : 0;
            return (
              <li key={s.id} className="ad-card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <Link className="text-lg font-semibold leading-snug hover:text-ad-brand" href={`/admin/surveys/${s.id}`}>{s.title}</Link>
                  <StatusPill value={s.status} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="ad-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.title} completion`}><span style={{ width: `${pct}%` }} /></div>
                  <p className="text-sm text-ad-muted">
                    {s.questionCount} question{s.questionCount === 1 ? "" : "s"} · {s.completedCount} / {s.participantCount} completed
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-ad-line pt-3 text-sm">
                  <Link className="font-semibold text-ad-brand hover:underline" href={`/admin/surveys/${s.id}`}>Manage →</Link>
                  <span className="flex gap-3 text-ad-muted">
                    Export
                    <a className="font-semibold text-ad-brand hover:underline" href={`/api/export/${s.id}?format=csv`}>CSV</a>
                    <a className="font-semibold text-ad-brand hover:underline" href={`/api/export/${s.id}?format=json`}>JSON</a>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
