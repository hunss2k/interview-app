// GET: 면담 기록 조회
import { NextRequest, NextResponse } from 'next/server';
import { getInterviews, getRecentInterviews } from '@/lib/notion';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const limit = searchParams.get('limit');

    let interviews;
    if (personId) {
      interviews = await getInterviews(personId);
    } else if (limit) {
      interviews = await getRecentInterviews(parseInt(limit));
    } else {
      interviews = await getRecentInterviews(10);
    }

    return NextResponse.json(interviews);
  } catch (error: any) {
    console.error('면담 조회 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
