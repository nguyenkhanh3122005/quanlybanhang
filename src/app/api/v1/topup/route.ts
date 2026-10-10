import { NextRequest, NextResponse } from "next/server";
import { topupKey } from "@/lib/apiKeyManager";
import { PRICING_PLANS } from "@/types/commercial";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, planId, instantCredit } = body;

    const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];

    if (instantCredit) {
      const updated = topupKey(key, plan.credits);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "API Key không tồn tại để nạp credits" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Đã cộng thành công ${plan.credits} credits vào API Key!`,
        keyRecord: updated,
      });
    }

    // Generate VietQR transfer payload for automated Vietnamese banking
    const bankCode = "MB"; // MBBank
    const accountNumber = "999988889999";
    const accountName = "APIZZ NET PLATFORM";
    const transferMemo = `APIZZ ${key.slice(-8).toUpperCase()}`;
    const amount = plan.priceVnd;

    // VietQR public dynamic image URL
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      transferMemo
    )}&accountName=${encodeURIComponent(accountName)}`;

    return NextResponse.json({
      success: true,
      order: {
        key,
        planName: plan.name,
        amountVnd: plan.priceVnd,
        creditsToAdd: plan.credits,
        bankCode,
        accountNumber,
        accountName,
        transferMemo,
        qrUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tạo giao dịch thanh toán" },
      { status: 500 }
    );
  }
}
