// GET: 인원 목록 / POST: 인원 추가
import { NextRequest, NextResponse } from 'next/server';
import { getPersons, getActivePerson, createPerson } from '@/lib/notion';
import type { PersonType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as PersonType | null;
    const activeOnly = searchParams.get('active') === 'true';

    const persons = activeOnly
      ? await getActivePerson(type || undefined)
      : await getPersons(type || undefined);

    return NextResponse.json(persons);
  } catch (error: any) {
    console.error('인원 조회 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, rank, department } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: '이름과 유형은 필수입니다' },
        { status: 400 }
      );
    }

    const person = await createPerson({ name, type, rank: rank || '', department: department || '' });
    return NextResponse.json(person, { status: 201 });
  } catch (error: any) {
    console.error('인원 생성 에러:', error?.body || error?.message || error);
    const msg = error?.body?.message || error?.message || '인원 생성 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
