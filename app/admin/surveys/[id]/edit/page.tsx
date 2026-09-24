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
      <h1 className="text-2xl font-semibold">Edit survey</h1>
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
