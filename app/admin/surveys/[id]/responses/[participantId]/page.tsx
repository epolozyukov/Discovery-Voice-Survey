import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getResponseDetail } from "@/lib/data/admin";
import { removeParticipant, resetParticipant } from "@/app/admin/actions";
import { StatusPill } from "@/components/admin/status-pill";
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
      <Link href={`/admin/surveys/${id}`} className="text-sm font-medium text-ad-muted hover:text-ad-brand">← Back to survey</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{detail.participant.label}</h1>
          <StatusPill value={detail.status} />
        </div>
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
      <ol className="flex flex-col gap-4">
        {detail.items.map(({ question, answer, inputMethod }, i) => (
          <li key={question.id} className="ad-card flex gap-4 p-5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ad-brand-soft text-sm font-bold text-ad-brand">Q{i + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="font-semibold leading-snug">{question.text}</p>
              {/* React escapes text; whitespace-pre-wrap keeps line breaks */}
              <p className="whitespace-pre-wrap break-words">{answer ?? <span className="text-ad-muted">No answer</span>}</p>
              {inputMethod && (
                <p className="text-xs font-medium text-ad-muted">{inputMethod === "voice" ? "🎙 Spoken, then edited" : "⌨ Typed"}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
