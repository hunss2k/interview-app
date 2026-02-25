// OpenAI Whisper STT 유틸 (대용량 파일 청크 처리 포함)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB (여유분 확보)

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  // 파일 크기가 24MB 이하면 그대로 처리
  if (audioBuffer.length <= MAX_FILE_SIZE) {
    return transcribeChunk(audioBuffer, filename);
  }

  // 대용량 파일: 청크로 분할하여 처리
  console.log(`대용량 파일 감지 (${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB), 청크 분할 처리...`);
  const chunks = splitBuffer(audioBuffer, MAX_FILE_SIZE);
  const transcripts: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`청크 ${i + 1}/${chunks.length} 처리 중...`);
    const ext = filename.split('.').pop() || 'webm';
    const chunkFilename = `chunk_${i}.${ext}`;
    const text = await transcribeChunk(chunks[i], chunkFilename);
    if (text.trim()) {
      transcripts.push(text.trim());
    }
  }

  return transcripts.join('\n\n');
}

async function transcribeChunk(
  buffer: Buffer,
  filename: string
): Promise<string> {
  // 파일 확장자에 따라 MIME 타입 결정
  const ext = filename.split('.').pop()?.toLowerCase() || 'webm';
  const mimeMap: Record<string, string> = {
    webm: 'audio/webm',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  const mimeType = mimeMap[ext] || 'audio/webm';

  const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'ko',
    response_format: 'text',
  });

  return transcription as unknown as string;
}

function splitBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.subarray(i, Math.min(i + chunkSize, buffer.length)));
  }
  return chunks;
}
