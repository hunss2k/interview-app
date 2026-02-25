// Step 1: 클라이언트 업로드용 토큰 발급
import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 파일명 검증 등 가능
        return {
          allowedContentTypes: [
            'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav',
            'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/m4a',
            'video/mp4', 'application/octet-stream',
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('업로드 완료:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('업로드 토큰 에러:', error);
    return NextResponse.json(
      { error: error.message || '업로드 실패' },
      { status: 500 }
    );
  }
}
