// Step 3: 전사 텍스트 → Claude AI 분석
import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/claude';

export const maxDuration = 300; // Vercel Pro

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: '전사 텍스트는 필수입니다' }, { status: 400 });
    }

    const analysis = await analyzeTranscript(transcript);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('분석 에러:', error);
    return NextResponse.json(
      { error: error.message || 'AI 분석 실패' },
      { status: 500 }
    );
  }
}
