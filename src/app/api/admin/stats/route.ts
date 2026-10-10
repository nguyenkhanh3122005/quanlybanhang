import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/apiKeyManager";

export async function GET() {
  const stats = getAdminStats();
  return NextResponse.json({ success: true, stats });
}
