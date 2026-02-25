import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Telegram 봇 웹훅 처리
  return NextResponse.json({ ok: true });
}
