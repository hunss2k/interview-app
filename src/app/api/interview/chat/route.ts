// 면담 기반 AI 채팅 API
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { question, context, history } = await request.json();

    if (!question || !context) {
      return NextResponse.json(
        { error: 'question과 context는 필수입니다' },
        { status: 400 }
      );
    }

    const systemPrompt = `당신은 면담/회의 분석 전문 AI 어시스턴트입니다.
아래 면담 분석 결과를 기반으로 사용자의 추가 질문에 답변합니다.
구체적이고 실용적인 답변을 제공하세요. 면담 내용에 없는 것은 추측하지 마세요.

--- 면담 분석 결과 ---

[요약]
${context.summary || '없음'}

[핵심 포인트]
${context.keyPoints || '없음'}

[액션 아이템]
${context.actionItems || '없음'}

[다음 질문 제안]
${context.nextQuestions || '없음'}

[녹취 전문]
${context.transcript || '없음'}`;

    // 대화 히스토리 구성
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (history?.length) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: question });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('응답이 텍스트가 아닙니다');
    }

    return NextResponse.json({ answer: content.text });
  } catch (error: any) {
    console.error('AI 채팅 에러:', error);
    return NextResponse.json(
      { error: error.message || 'AI 채팅 실패' },
      { status: 500 }
    );
  }
}
