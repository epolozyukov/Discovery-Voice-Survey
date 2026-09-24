import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSurveyWithQuestions } from "@/lib/data/admin";
import { SurveyForm } from "@/components/admin/survey-form";

export default async function EditSurvey({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await getSurveyWithQuestions(id);
  if (!data) notFound();
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit survey</h1>
        <p className="text-ad-muted">Questions are shown to experts one at a time, in this order.</p>
      </div>
      <SurveyForm
        surveyId={id}
        initial={{
          title: data.survey.title,
          description: data.survey.description ?? "",
          questions: data.questions.map((q) => ({ text: q.text, required: q.required })),
        }}
      />
    </main>
  );
}
