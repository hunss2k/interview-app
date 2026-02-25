// Vercel Blob 파일 업로드 유틸
import { put } from '@vercel/blob';

export async function uploadAudio(
  file: Buffer,
  filename: string
): Promise<string> {
  const blob = await put(filename, file, {
    access: 'public',
    contentType: 'audio/webm',
  });
  return blob.url;
}
