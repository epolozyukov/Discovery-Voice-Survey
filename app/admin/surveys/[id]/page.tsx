import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSurveyWithQuestions, listParticipants } from "@/lib/data/admin";
import { changeStatus, createParticipants, removeSurvey } from "../../actions";
import { completionRate, countByStatus } from "@/lib/domain/summary";
import { CopyButton } from "@/components/admin/copy-button";
import { StatusPill } from "@/components/admin/status-pill";
import { StatTile } from "@/components/admin/stat-tile";
import { btnDanger, btnPrimary, btnSecondary, input } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

export default async function SurveyDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();
  const participants = await listParticipants(id);
  const { survey, questions } = data;
  const counts = countByStatus(participants);
  const rate = completionRate(counts);

  return (
    <main className="flex flex-col gap-8">
      <Link href="/admin" className="text-sm font-medium text-ad-muted hover:text-ad-brand">← All surveys</Link>

      <section className="ad-card flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{survey.title}</h1>
              <StatusPill value={survey.status} testId="status" />
            </div>
            {survey.description && <p className="max-w-2xl whitespace-pre-wrap text-ad-muted">{survey.description}</p>}
            <p className="text-sm text-ad-muted">{questions.length} question{questions.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/surveys/${id}/edit`} className={btnSecondary}>Edit</Link>
            {survey.status !== "active" ? (
              <form action={changeStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="active" /><button className={btnPrimary}>Activate</button></form>
            ) : (
              <form action={changeStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="inactive" /><button className={btnSecondary}>Deactivate</button></form>
            )}
            <form action={removeSurvey}><input type="hidden" name="id" value={id} /><button className={btnDanger}>Delete</button></form>
          </div>
        </div>
        {survey.status !== "active" && (
          <p className="rounded-lg bg-ad-warn-soft px-4 py-2.5 text-sm text-ad-warn">
            Participant links only work while the survey is <b>active</b>.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Progress">
        <StatTile label="Completed" value={counts.completed} />
        <StatTile label="In progress" value={counts.in_progress} />
        <StatTile label="Not started" value={counts.not_started} />
        <StatTile label="Completion" value={`${rate}%`} />
      </section>
      <p className="sr-only" data-testid="summary">
        {counts.completed} completed · {counts.in_progress} in progress · {counts.not_started} not started ({rate}% complete)
      </p>

      <section className="ad-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Participants</h2>
            <p className="text-sm text-ad-muted">One personal link per expert. Copy it and send it to them directly.</p>
          </div>
          <form action={createParticipants} className="flex items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <label className="flex flex-col gap-1 text-xs font-medium text-ad-muted">Add links<input name="count" type="number" min={1} max={100} defaultValue={1} className={`${input} !w-24 !py-2`} /></label>
            <button className={btnPrimary}>Generate</button>
          </form>
        </div>
        {participants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ad-line p-8 text-center text-ad-muted">No participant links yet. Generate one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ad-muted">
                <tr className="border-b border-ad-line"><th className="py-2 pr-4 font-semibold">Participant</th><th className="pr-4 font-semibold">Status</th><th className="pr-4 font-semibold">Completed</th><th></th></tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-b border-ad-line last:border-0">
                    <td className="py-3 pr-4 font-semibold">{p.label}</td>
                    <td className="pr-4"><StatusPill value={p.status} /></td>
                    <td className="pr-4 text-ad-muted">{p.completedAt ? new Date(p.completedAt).toLocaleDateString("en-GB") : "–"}</td>
                    <td className="flex justify-end gap-2 py-2">
                      <CopyButton path={`/survey/${p.token}`} />
                      <Link className={btnSecondary} href={`/admin/surveys/${id}/responses/${p.id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ad-card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Export completed responses</h2>
          <p className="text-sm text-ad-muted">Only submitted responses are included.</p>
        </div>
        <div className="flex gap-2">
          <a className={btnSecondary} href={`/api/export/${id}?format=csv`}>Download CSV</a>
          <a className={btnSecondary} href={`/api/export/${id}?format=json`}>Download JSON</a>
        </div>
      </section>
    </main>
  );
}
