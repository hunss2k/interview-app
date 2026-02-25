// POST: 녹음파일 → Vercel Blob 업로드
import { NextRequest, NextResponse } from 'next/server';
import { uploadAudio } from '@/lib/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadAudio(buffer, filename || 'recording.webm');

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('업로드 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
