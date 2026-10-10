import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const report = getReportById(id);

  if (!report) {
    return NextResponse.json(
      { success: false, error: "Report not found" },
      { status: 404 }
    );
  }

  // Check if downloading as JSON
  const url = new URL(req.url);
  if (url.searchParams.get("download") === "json") {
    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="apizz-report-${id}.json"`,
      },
    });
  }

  return NextResponse.json({ success: true, report });
}
