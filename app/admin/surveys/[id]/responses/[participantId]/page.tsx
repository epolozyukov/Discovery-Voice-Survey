import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getResponseDetail } from "@/lib/data/admin";
import { removeParticipant, resetParticipant } from "@/app/admin/actions";
import { btnDanger, btnSecondary } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

export default async function ResponsePage({ params }: { params: Promise<{ id: string; participantId: string }> }) {
  await requireAdmin();
  const { id, participantId } = await params;
  if (!z.string().uuid().safeParse(participantId).success) notFound();
  const detail = await getResponseDetail(participantId);
  if (!detail || detail.participant.surveyId !== id) notFound();

  return (
    <main className="flex flex-col gap-6">
      <Link href={`/admin/surveys/${id}`} className="text-sm text-blue-700 underline">← Back to survey</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{detail.participant.label} <span className="text-base font-normal text-gray-600">({detail.status.replace("_", " ")})</span></h1>
        <div className="flex gap-2">
        <form action={resetParticipant}>
          <input type="hidden" name="surveyId" value={id} />
          <input type="hidden" name="participantId" value={participantId} />
          <button className={btnSecondary}>Reset answers</button>
        </form>
        <form action={removeParticipant}>
          <input type="hidden" name="surveyId" value={id} />
          <input type="hidden" name="participantId" value={participantId} />
          <button className={btnDanger}>Delete participant &amp; answers</button>
        </form>
        </div>
      </div>
      <ol className="flex flex-col gap-5">
        {detail.items.map(({ question, answer, inputMethod }, i) => (
          <li key={question.id}>
            <p className="text-sm font-medium text-gray-600">Q{String(i + 1).padStart(2, "0")}</p>
            <p className="font-medium">{question.text}</p>
            {/* React escapes text; whitespace-pre-wrap keeps line breaks */}
            <p className="mt-1 whitespace-pre-wrap">{answer ?? <span className="text-gray-500">No answer</span>}</p>
            {inputMethod && <p className="text-xs text-gray-500">via {inputMethod}</p>}
          </li>
        ))}
      </ol>
    </main>
  );
}
