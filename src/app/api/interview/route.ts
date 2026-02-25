// POST: 녹음파일 → STT → 요약 → Notion 저장 (풀 파이프라인)
import { NextRequest, NextResponse } from 'next/server';
import { uploadAudio } from '@/lib/blob';
import { transcribeAudio } from '@/lib/whisper';
import { analyzeTranscript } from '@/lib/claude';
import { createInterview, updatePersonNextQuestions, getPerson } from '@/lib/notion';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const personId = formData.get('personId') as string;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audioFile || !personId) {
      return NextResponse.json(
        { error: '녹음파일과 대상자 ID는 필수입니다' },
        { status: 400 }
      );
    }

    const person = await getPerson(personId);
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HHmm');
    // 원본 파일 확장자 유지
    const origName = audioFile.name || 'recording.webm';
    const ext = origName.split('.').pop()?.toLowerCase() || 'webm';
    const filename = `${person.name}_${format(now, 'yyyyMMdd')}_${timeStr}.${ext}`;

    // Step 1: Vercel Blob에 업로드
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioUrl = await uploadAudio(audioBuffer, filename);

    // Step 2: Whisper STT
    const transcript = await transcribeAudio(audioBuffer, filename);

    // Step 3: Claude 분석
    const analysis = await analyzeTranscript(transcript);

    // Step 4: 면담 유형 결정
    const interviewType = person.type === '광고주' ? '광고주 미팅' : '1:1 면담';

    // Step 5: Notion에 면담 기록 저장
    const { url: notionUrl } = await createInterview({
      personId,
      personName: person.name,
      type: interviewType as any,
      date: dateStr,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      transcript,
      audioUrl,
      duration: Math.round(duration / 60), // 초 → 분
    });

    // Step 6: 인원 DB 업데이트
    await updatePersonNextQuestions(personId, analysis.nextQuestions, dateStr);

    return NextResponse.json({
      success: true,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      notionUrl,
    });
  } catch (error: any) {
    console.error('면담 처리 에러:', error);
    return NextResponse.json(
      { error: error.message || '처리 중 에러가 발생했습니다' },
      { status: 500 }
    );
  }
}
