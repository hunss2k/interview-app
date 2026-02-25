// POST: Telegram 웹훅 핸들러
import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramCommand } from '@/lib/telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const reply = await handleTelegramCommand(text);

    // Telegram Bot API로 직접 응답 전송
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: 'HTML',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram 웹훅 에러:', error);
    return NextResponse.json({ ok: true });
  }
}
