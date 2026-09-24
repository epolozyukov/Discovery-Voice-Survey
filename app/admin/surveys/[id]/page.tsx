import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSurveyWithQuestions, listParticipants } from "@/lib/data/admin";
import { changeStatus, createParticipants, removeSurvey } from "../../actions";
import { CopyButton } from "@/components/admin/copy-button";
import { btnDanger, btnPrimary, btnSecondary, input } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

const statusLabel = { not_started: "Not started", in_progress: "In progress", completed: "Completed" } as const;

export default async function SurveyDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();
  const participants = await listParticipants(id);
  const { survey } = data;

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{survey.title} <span className="text-base font-normal capitalize text-gray-600">({survey.status})</span></h1>
        <Link href={`/admin/surveys/${id}/edit`} className={btnSecondary}>Edit</Link>
        {survey.status !== "active" ? (
          <form action={changeStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="active" /><button className={btnPrimary}>Activate</button></form>
        ) : (
          <form action={changeStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="inactive" /><button className={btnSecondary}>Deactivate</button></form>
        )}
        <form action={removeSurvey}><input type="hidden" name="id" value={id} /><button className={btnDanger}>Delete</button></form>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Participants</h2>
        <form action={createParticipants} className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1 text-sm">Add links<input name="count" type="number" min={1} max={100} defaultValue={1} className={`${input} w-24`} /></label>
          <button className={btnPrimary}>Generate</button>
        </form>
        {participants.length === 0 ? (
          <p className="text-gray-600">No participant links yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-400"><tr><th className="py-2">Participant</th><th>Status</th><th>Completed</th><th></th></tr></thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-gray-200">
                  <td className="py-3 font-medium">{p.label}</td>
                  <td>{statusLabel[p.status]}</td>
                  <td>{p.completedAt ? new Date(p.completedAt).toLocaleDateString("en-GB") : "–"}</td>
                  <td className="flex justify-end gap-2 py-2">
                    <CopyButton path={`/survey/${p.token}`} />
                    <Link className={btnSecondary} href={`/admin/surveys/${id}/responses/${p.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-sm text-gray-600">Links only work while the survey is active.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Export completed responses</h2>
        <div className="flex gap-2">
          <a className={btnSecondary} href={`/api/export/${id}?format=csv`}>CSV</a>
          <a className={btnSecondary} href={`/api/export/${id}?format=json`}>JSON</a>
        </div>
      </section>
    </main>
  );
}
