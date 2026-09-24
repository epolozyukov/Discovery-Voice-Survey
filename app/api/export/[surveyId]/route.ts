import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { getExportData } from "@/lib/data/admin";
import { toCsv, toJson } from "@/lib/domain/export";

export async function GET(request: NextRequest, { params }: { params: Promise<{ surveyId: string }> }) {
  if (!(await getAdminOrNull())) return new NextResponse("Unauthorized", { status: 401 });
  const { surveyId } = await params;
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  if (!z.string().uuid().safeParse(surveyId).success) return new NextResponse("Not found", { status: 404 });
  const data = await getExportData(surveyId);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (format === "json") {
    return new NextResponse(JSON.stringify(toJson(data.questions, data.participants), null, 2), {
      headers: { ...headers, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="responses.json"' },
    });
  }
  return new NextResponse(toCsv(data.questions, data.participants), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="responses.csv"' },
  });
}
