// PUT: 인원 수정 / PATCH: 상태 변경
import { NextRequest, NextResponse } from 'next/server';
import { updatePerson, getPerson } from '@/lib/notion';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const person = await getPerson(params.id);
    return NextResponse.json(person);
  } catch (error: any) {
    console.error('인원 조회 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await updatePerson(params.id, body);
    const updated = await getPerson(params.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('인원 수정 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    if (!status) {
      return NextResponse.json({ error: '상태값이 필요합니다' }, { status: 400 });
    }
    await updatePerson(params.id, { status });
    const updated = await getPerson(params.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('상태 변경 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
