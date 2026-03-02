// 통합 처리 API: STT → AI 분석 → Notion 저장 → 텔레그램 알림
// 클라이언트에서 업로드 완료 후 이 API 하나만 호출하면 됨
// 화면 꺼져도 서버에서 처리 계속됨
// 각 단계별 상태를 Blob에 저장하여 새로고침 시에도 확인 가능
import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { analyzeTranscript } from '@/lib/claude';
import { createInterview, updatePersonNextQuestions, getPerson } from '@/lib/notion';
import { sendTelegramNotification } from '@/lib/telegram';
import { updateJobStatus } from '@/lib/jobStatus';
import { format } from 'date-fns';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000, // 60초 타임아웃 (빠른 실패 후 우리 재시도 로직 사용)
  maxRetries: 0, // SDK 내부 재시도 비활성화 (withRetry로 직접 관리)
});

export const maxDuration = 300; // Vercel Pro

// 재시도 래퍼 (connection error, timeout, 5xx 대응)
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 5): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      const isRetryable =
        msg.includes('connection') ||
        msg.includes('timeout') ||
        msg.includes('econnreset') ||
        msg.includes('socket') ||
        msg.includes('network') ||
        msg.includes('fetch failed') ||
        (error.status && error.status >= 500);

      if (attempt === maxRetries || !isRetryable) throw error;
      // 지수 백오프: 3s, 6s, 12s, 24s, 48s
      const waitMs = Math.min(3000 * Math.pow(2, attempt), 48000);
      console.warn(`${label} 재시도 ${attempt + 1}/${maxRetries} (${waitMs/1000}s 후): ${error.message} [${error.code || error.status || 'no-code'}]`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error(`${label} 재시도 실패`);
}

export async function POST(request: NextRequest) {
  let jobId: string | undefined;

  try {
    const { chunkUrls, ext, personId, duration, jobId: clientJobId } = await request.json();

    if (!chunkUrls?.length || !personId) {
      return NextResponse.json(
        { error: 'chunkUrls와 personId는 필수입니다' },
        { status: 400 }
      );
    }

    jobId = clientJobId;
    const person = await getPerson(personId);

    // Step 1: 각 청크별 STT
    if (jobId) {
      await updateJobStatus(jobId, {
        personName: person.name,
        status: 'stt',
        step: `음성 인식 중... (0/${chunkUrls.length})`,
      });
    }

    const transcripts: string[] = [];
    for (let i = 0; i < chunkUrls.length; i++) {
      if (jobId) {
        await updateJobStatus(jobId, {
          step: `음성 인식 중... (${i + 1}/${chunkUrls.length})`,
        });
      }

      const response = await fetch(chunkUrls[i]);
      if (!response.ok) throw new Error(`청크 ${i + 1} 다운로드 실패`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const mimeMap: Record<string, string> = {
        'wav': 'audio/wav', 'm4a': 'audio/mp4', 'mp4': 'audio/mp4',
        'mp3': 'audio/mpeg', 'webm': 'audio/webm', 'ogg': 'audio/ogg',
        'flac': 'audio/flac',
      };
      const contentType = mimeMap[ext] || 'audio/wav';
      const file = await toFile(buffer, `chunk_${i}.${ext}`, { type: contentType });

      const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
      console.log(`STT 청크 ${i + 1}/${chunkUrls.length}: size=${buffer.length} (${sizeMB}MB)`);

      const transcription = await withRetry(
        () => openai.audio.transcriptions.create({
          model: 'whisper-1',
          file,
          language: 'ko',
          response_format: 'text',
          prompt: `최재명 대표와 ${person.name}의 대화입니다.`,
        }),
        `STT 청크 ${i + 1}`
      );

      const text = (transcription as unknown as string).trim();
      if (text) transcripts.push(text);
    }

    const fullTranscript = transcripts.join('\n\n');
    if (!fullTranscript) {
      throw new Error('음성 인식 결과가 비어있습니다');
    }

    // Step 2: AI 분석
    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'analyzing',
        step: 'AI 분석 중...',
      });
    }
    const analysis = await withRetry(
      () => analyzeTranscript(fullTranscript, {
        ceoName: '최재명 대표',
        counterpartName: person.name,
        counterpartType: person.type,
      }),
      'AI 분석'
    );

    // Step 3: Notion 저장
    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'saving',
        step: 'Notion 저장 + 알림 중...',
      });
    }
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const interviewType = person.type === '대외미팅' ? '대외미팅' : '1:1 면담';

    const { url: notionUrl } = await createInterview({
      personId,
      personName: person.name,
      type: interviewType as any,
      date: dateStr,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      transcript: fullTranscript,
      audioUrl: chunkUrls[0],
      duration: Math.round((duration || 0) / 60),
    });

    await updatePersonNextQuestions(personId, analysis.nextQuestions, dateStr);

    // Step 4: 텔레그램 알림
    const summaryPreview = analysis.summary.split('\n')[0].slice(0, 100);
    await sendTelegramNotification(
      `✅ <b>면담 분석 완료</b>\n\n` +
      `👤 ${person.name}\n` +
      `📅 ${dateStr}\n` +
      `📝 ${summaryPreview}...\n\n` +
      `🔗 <a href="${notionUrl}">Notion에서 보기</a>`
    );

    const resultData = {
      success: true,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      emotion: analysis.emotion,
      caution: analysis.caution,
      actionItems: analysis.actionItems,
      nextQuestions: analysis.nextQuestions,
      notionUrl,
    };

    // 완료 상태 저장
    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'done',
        step: '완료',
        result: resultData,
      });
    }

    return NextResponse.json(resultData);
  } catch (error: any) {
    const errDetail = {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      body: error.error || error.body,
    };
    console.error('통합 처리 에러:', JSON.stringify(errDetail, null, 2));

    // 에러 상태 저장
    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'error',
        step: '오류 발생',
        error: error.message,
      }).catch(() => {});
    }

    // 에러 시에도 텔레그램 알림
    await sendTelegramNotification(
      `❌ <b>면담 처리 실패</b>\n\n에러: ${error.message}`
    ).catch(() => {});

    const userMessage = error.error?.message || error.message || '처리 실패';
    return NextResponse.json(
      { error: `처리 오류: ${userMessage}`, detail: errDetail },
      { status: 500 }
    );
  }
}
