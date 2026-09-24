import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listSurveys } from "@/lib/data/admin";
import { btnPrimary } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireAdmin();
  const surveys = await listSurveys();
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Surveys</h1>
        <Link href="/admin/surveys/new" className={btnPrimary}>Create survey</Link>
      </div>
      {surveys.length === 0 ? (
        <p className="text-gray-600">No surveys yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-400">
            <tr><th className="py-2">Survey</th><th>Status</th><th>Questions</th><th>Completed / Participants</th></tr>
          </thead>
          <tbody>
            {surveys.map((s) => (
              <tr key={s.id} className="border-b border-gray-200">
                <td className="py-3"><Link className="font-medium text-blue-700 underline" href={`/admin/surveys/${s.id}`}>{s.title}</Link></td>
                <td className="capitalize">{s.status}</td>
                <td>{s.questionCount}</td>
                <td>{s.completedCount} / {s.participantCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
