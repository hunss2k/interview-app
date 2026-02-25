// Step 2: Blob URL → Whisper STT (청크 단위)
// 클라이언트에서 WAV로 변환하여 업로드하므로 서버에서 변환 불필요
import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHUNK_SIZE = 24 * 1024 * 1024; // 24MB

export const maxDuration = 300; // Vercel Pro

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, chunkIndex = 0, chunkCount = 1, ext: providedExt } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl은 필수입니다' }, { status: 400 });
    }

    // Blob URL에서 파일 다운로드
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error('오디오 파일 다운로드 실패');

    const arrayBuffer = await response.arrayBuffer();
    const fullBuffer = Buffer.from(arrayBuffer);

    // 청크 분할
    let buffer: Buffer;
    if (chunkCount <= 1) {
      buffer = fullBuffer;
    } else {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fullBuffer.length);
      buffer = fullBuffer.subarray(start, end);
    }

    // 확장자 결정 (클라이언트에서 WAV 변환 후 전달)
    let ext = providedExt;
    if (!ext) {
      const urlPath = new URL(audioUrl).pathname;
      const urlMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
      const urlExt = urlMatch?.[1]?.toLowerCase();
      const validExts = ['webm', 'm4a', 'mp3', 'mp4', 'wav', 'ogg', 'flac', 'oga', 'mpeg', 'mpga'];
      ext = validExts.includes(urlExt || '') ? urlExt : 'wav';
    }

    // MIME 타입 매핑
    const mimeMap: Record<string, string> = {
      'wav': 'audio/wav', 'm4a': 'audio/mp4', 'mp4': 'audio/mp4',
      'mp3': 'audio/mpeg', 'webm': 'audio/webm', 'ogg': 'audio/ogg',
      'flac': 'audio/flac', 'mpeg': 'audio/mpeg', 'mpga': 'audio/mpeg',
      'oga': 'audio/ogg',
    };
    const contentType = mimeMap[ext] || 'audio/wav';
    const filename = `chunk_${chunkIndex}.${ext}`;

    const file = await toFile(buffer, filename, { type: contentType });

    console.log(`STT 요청: ext=${ext}, filename=${filename}, contentType=${contentType}, size=${buffer.length}`);

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'ko',
      response_format: 'text',
    });

    return NextResponse.json({
      transcript: (transcription as unknown as string).trim(),
      chunkIndex,
    });
  } catch (error: any) {
    const errDetail = {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      body: error.error || error.body,
    };
    console.error('STT 에러 상세:', JSON.stringify(errDetail, null, 2));

    const userMessage = error.error?.message || error.message || 'STT 처리 실패';
    return NextResponse.json(
      { error: `STT 오류: ${userMessage}`, detail: errDetail },
      { status: 500 }
    );
  }
}
