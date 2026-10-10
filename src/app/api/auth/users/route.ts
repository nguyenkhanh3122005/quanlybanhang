import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, deleteUser, updateUserRole, adjustUserCredits } from "@/lib/auth";

export async function GET() {
  const users = getAllUsers();
  return NextResponse.json({ success: true, users });
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Thiếu ID người dùng" }, { status: 400 });
    }

    const ok = deleteUser(userId);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role, creditsDelta } = body;

    if (role) {
      updateUserRole(userId, role);
    }
    if (typeof creditsDelta === "number") {
      adjustUserCredits(userId, creditsDelta);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
