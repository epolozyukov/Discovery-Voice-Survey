import { requireAdmin } from "@/lib/auth";
import { SurveyForm } from "@/components/admin/survey-form";

export default async function NewSurvey() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create survey</h1>
      <SurveyForm surveyId={null} initial={{ title: "", description: "", questions: [] }} />
    </main>
  );
}
