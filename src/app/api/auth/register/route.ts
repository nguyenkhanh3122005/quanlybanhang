import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    const result = registerUser(email, password, name);
    if (result.error || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || "Đăng ký thất bại" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: "Đăng ký tài khoản thành công!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
