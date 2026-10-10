import { NextRequest, NextResponse } from "next/server";
import {
  getAllApiKeys,
  getKeysByUserId,
  createApiKey,
  deleteApiKey,
  toggleApiKeyStatus,
  adjustKeyCredits,
} from "@/lib/apiKeyManager";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  const keys = userId ? getKeysByUserId(userId) : getAllApiKeys();
  return NextResponse.json({ success: true, keys });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name || "Default Key";
    const tier = body.tier || "free";
    const credits = typeof body.credits === "number" ? body.credits : 5;
    const userId = body.userId;

    const newKey = createApiKey(name, tier, credits, userId);
    return NextResponse.json({ success: true, key: newKey });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Không thể tạo API Key" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const keyOrId = url.searchParams.get("key") || url.searchParams.get("id");

    if (!keyOrId) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp mã hoặc ID của API Key cần xóa" },
        { status: 400 }
      );
    }

    const deleted = deleteApiKey(keyOrId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy API Key để xóa" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa API Key thành công khỏi hệ thống.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa API Key" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyOrId, action, creditsDelta } = body;

    if (!keyOrId) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin keyOrId" },
        { status: 400 }
      );
    }

    if (action === "toggle") {
      const ok = toggleApiKeyStatus(keyOrId);
      return NextResponse.json({ success: ok });
    }

    if (action === "adjustCredits" && typeof creditsDelta === "number") {
      const ok = adjustKeyCredits(keyOrId, creditsDelta);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json(
      { success: false, error: "Hành động không hợp lệ" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật API Key" },
      { status: 500 }
    );
  }
}
