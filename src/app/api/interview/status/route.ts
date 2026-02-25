// 처리 작업 상태 조회 API
import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/jobStatus';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId는 필수입니다' }, { status: 400 });
  }

  try {
    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '상태 조회 실패' },
      { status: 500 }
    );
  }
}
