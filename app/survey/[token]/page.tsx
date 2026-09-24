import type { Metadata } from "next";
import { loadSession } from "@/lib/data/participant";
import { SurveyFlow } from "@/components/survey/survey-flow";
import { Brand, PvSplit } from "@/components/survey/pv-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discovery Survey", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadSession(token);

  if (!result.ok) {
    const inactive = result.reason === "inactive";
    return (
      <PvSplit rail={<Brand onDark />}>
        <div className="pv-rise flex flex-col gap-5">
          <p className="pv-eyebrow">{inactive ? "Closed" : "Link problem"}</p>
          <h1 className="pv-display pv-grad text-[clamp(34px,6vw,64px)]">{inactive ? "This survey is not open" : "Survey not found"}</h1>
          <p className="pv-muted max-w-lg text-lg">
            {inactive
              ? "This survey is currently not accepting responses. Please contact the Discovery team."
              : "This link is not valid. Please check the link you were sent."}
          </p>
        </div>
      </PvSplit>
    );
  }
  return <SurveyFlow token={token} readOnly={result.readOnly} session={result.session} />;
}
