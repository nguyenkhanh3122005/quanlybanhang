import { NextRequest, NextResponse } from "next/server";
import { verifyAndDeductCredit } from "@/lib/apiKeyManager";
import { runApiDetection } from "@/lib/engine";
import { saveReport } from "@/lib/storage";
import { RunTestRequest } from "@/types/detector";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate commercial client
    const authHeader = req.headers.get("authorization") || req.headers.get("x-apizz-key") || req.headers.get("x-cctest-key") || "";
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu cung cấp API Key để sử dụng dịch vụ. Thêm header 'Authorization: Bearer <YOUR_APIZZ_KEY>'.",
        },
        { status: 401 }
      );
    }

    // 2. Verify key & deduct 1 credit
    const verification = verifyAndDeductCredit(authHeader);
    if (!verification.valid || !verification.record) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || "Xác thực API Key thất bại.",
          creditsRemaining: verification.record?.credits ?? 0,
        },
        { status: 402 } // Payment Required / Insufficient credits
      );
    }

    // 3. Parse target API request
    const body = (await req.json()) as RunTestRequest;
    if (!body.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu thông tin 'apiKey' của target Claude API cần kiểm tra.",
        },
        { status: 400 }
      );
    }

    // 4. Run detection engine
    const report = await runApiDetection(body);
    saveReport(report);

    return NextResponse.json({
      success: true,
      message: "Kiểm tra API hoàn tất thành công.",
      creditsRemaining: verification.record.credits,
      creditsUsedTotal: verification.record.totalUsed,
      keyTier: verification.record.tier,
      report,
    });
  } catch (error: any) {
    console.error("Commercial API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi máy chủ khi chạy kiểm tra API",
      },
      { status: 500 }
    );
  }
}
