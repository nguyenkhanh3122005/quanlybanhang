import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const result = authenticateUser(email, password);
    if (result.error || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || "Đăng nhập thất bại" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: "Đăng nhập thành công!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
