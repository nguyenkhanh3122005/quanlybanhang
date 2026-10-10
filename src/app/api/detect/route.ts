import { NextRequest, NextResponse } from "next/server";
import { runApiDetection } from "@/lib/engine";
import { saveReport } from "@/lib/storage";
import { RunTestRequest } from "@/types/detector";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RunTestRequest;

    const report = await runApiDetection(body);
    saveReport(report);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Detection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to run detection",
      },
      { status: 500 }
    );
  }
}
