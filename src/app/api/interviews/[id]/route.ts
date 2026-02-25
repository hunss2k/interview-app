// 면담 삭제 (Notion 아카이브)
import { NextRequest, NextResponse } from 'next/server';
import { archiveInterview } from '@/lib/notion';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await archiveInterview(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('면담 삭제 에러:', error);
    return NextResponse.json(
      { error: error.message || '삭제 실패' },
      { status: 500 }
    );
  }
}
