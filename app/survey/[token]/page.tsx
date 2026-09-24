import type { Metadata } from "next";
import { loadSession } from "@/lib/data/participant";
import { SurveyFlow } from "@/components/survey/survey-flow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discovery Survey", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadSession(token);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="mb-2 text-2xl font-semibold">{result.reason === "inactive" ? "This survey is not open" : "Survey not found"}</h1>
        <p className="text-gray-700">
          {result.reason === "inactive"
            ? "This survey is currently not accepting responses. Please contact the Discovery team."
            : "This link is not valid. Please check the link you were sent."}
        </p>
      </main>
    );
  }
  return <SurveyFlow token={token} readOnly={result.readOnly} session={result.session} />;
}
