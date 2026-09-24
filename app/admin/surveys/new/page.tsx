import { requireAdmin } from "@/lib/auth";
import { SurveyForm } from "@/components/admin/survey-form";

export default async function NewSurvey() {
  await requireAdmin();
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create survey</h1>
        <p className="text-ad-muted">Questions are shown to experts one at a time, in this order.</p>
      </div>
      <SurveyForm surveyId={null} initial={{ title: "", description: "", questions: [] }} />
    </main>
  );
}
