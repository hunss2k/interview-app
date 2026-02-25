// Step 4: Notion에 면담 기록 저장 + 텔레그램 알림
import { NextRequest, NextResponse } from 'next/server';
import { createInterview, updatePersonNextQuestions, getPerson } from '@/lib/notion';
import { sendTelegramNotification } from '@/lib/telegram';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { personId, audioUrl, duration, transcript, analysis } = await request.json();

    if (!personId || !analysis) {
      return NextResponse.json({ error: 'personId와 analysis는 필수입니다' }, { status: 400 });
    }

    const person = await getPerson(personId);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const interviewType = person.type === '광고주' ? '광고주 미팅' : '1:1 면담';

    const { url: notionUrl } = await createInterview({
      personId,
      personName: person.name,
      type: interviewType as any,
      date: dateStr,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      transcript: transcript || '',
      audioUrl: audioUrl || '',
      duration: Math.round((duration || 0) / 60),
    });

    await updatePersonNextQuestions(personId, analysis.nextQuestions, dateStr);

    // 텔레그램 알림 (실패해도 저장 결과에 영향 없음)
    const summaryPreview = (analysis.summary || '').split('\n')[0].slice(0, 100);
    await sendTelegramNotification(
      `✅ <b>면담 분석 완료</b>\n\n` +
      `👤 ${person.name}\n` +
      `📅 ${dateStr}\n` +
      `📝 ${summaryPreview}...\n\n` +
      `🔗 <a href="${notionUrl}">Notion에서 보기</a>`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      notionUrl,
    });
  } catch (error: any) {
    console.error('저장 에러:', error);
    return NextResponse.json(
      { error: error.message || 'Notion 저장 실패' },
      { status: 500 }
    );
  }
}
