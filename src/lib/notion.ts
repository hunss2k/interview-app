// Notion API CRUD 유틸
import { Client } from '@notionhq/client';
import type { Person, Interview, PersonType, PersonRank, PersonStatus, InterviewType } from './types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PERSONS_DB = process.env.NOTION_PERSONS_DB_ID!;
const INTERVIEWS_DB = process.env.NOTION_INTERVIEWS_DB_ID!;

// ── 인원 관련 ──

export async function getPersons(type?: PersonType): Promise<Person[]> {
  const filter: any = type
    ? { property: '유형', select: { equals: type } }
    : undefined;

  const response = await notion.databases.query({
    database_id: PERSONS_DB,
    filter,
    sorts: [{ property: '이름', direction: 'ascending' }],
  });

  return response.results.map(pageToPersonn);
}

export async function getActivePerson(type?: PersonType): Promise<Person[]> {
  const activeStatuses = type === '광고주'
    ? ['거래중']
    : type
      ? ['재직']
      : ['재직', '거래중']; // type 미지정 시 모든 활성 상태 포함

  const statusFilter = activeStatuses.length === 1
    ? { property: '상태', select: { equals: activeStatuses[0] } }
    : { or: activeStatuses.map((s) => ({ property: '상태', select: { equals: s } })) };

  const filters: any[] = [statusFilter];

  if (type) {
    filters.push({ property: '유형', select: { equals: type } });
  }

  const response = await notion.databases.query({
    database_id: PERSONS_DB,
    filter: filters.length === 1 ? filters[0] : { and: filters },
    sorts: [{ property: '이름', direction: 'ascending' }],
  });

  return response.results.map(pageToPersonn);
}

export async function getPerson(id: string): Promise<Person> {
  const page = await notion.pages.retrieve({ page_id: id });
  return pageToPersonn(page);
}

export async function createPerson(data: {
  name: string;
  type: PersonType;
  rank?: PersonRank | '';
  department: string;
}): Promise<Person> {
  const status = data.type === '광고주' ? '거래중' : '재직';
  const properties: any = {
    이름: { title: [{ text: { content: data.name } }] },
    유형: { select: { name: data.type } },
    소속: { rich_text: [{ text: { content: data.department } }] },
    상태: { select: { name: status } },
    다음질문: { rich_text: [{ text: { content: '' } }] },
    메모: { rich_text: [{ text: { content: '' } }] },
  };
  if (data.rank) {
    properties['직급'] = { select: { name: data.rank } };
  }
  const page = await notion.pages.create({
    parent: { database_id: PERSONS_DB },
    properties,
  });
  return pageToPersonn(page);
}

export async function updatePerson(
  id: string,
  data: Partial<{ name: string; department: string; status: PersonStatus; memo: string }>
): Promise<void> {
  const properties: any = {};
  if (data.name) {
    properties['이름'] = { title: [{ text: { content: data.name } }] };
  }
  if (data.department) {
    properties['소속'] = { rich_text: [{ text: { content: data.department } }] };
  }
  if (data.status) {
    properties['상태'] = { select: { name: data.status } };
  }
  if (data.memo !== undefined) {
    properties['메모'] = { rich_text: [{ text: { content: data.memo } }] };
  }
  await notion.pages.update({ page_id: id, properties });
}

export async function updatePersonNextQuestions(
  id: string,
  questions: string,
  date: string
): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      다음질문: { rich_text: [{ text: { content: questions } }] },
      최근면담일: { date: { start: date } },
    },
  });
}

// ── 면담 기록 관련 ──

export async function createInterview(data: {
  personId: string;
  personName: string;
  type: InterviewType;
  date: string;
  summary: string;
  keyPoints: string;
  actionItems: string;
  nextQuestions: string;
  transcript: string;
  audioUrl: string;
  duration: number;
}): Promise<{ id: string; url: string }> {
  const title = `${data.personName}_${data.date.replace(/-/g, '')}`;

  const page = await notion.pages.create({
    parent: { database_id: INTERVIEWS_DB },
    properties: {
      제목: { title: [{ text: { content: title } }] },
      대상자: { relation: [{ id: data.personId }] },
      유형: { select: { name: data.type } },
      날짜: { date: { start: data.date } },
      요약: { rich_text: [{ text: { content: truncate(data.summary, 2000) } }] },
      핵심포인트: { rich_text: [{ text: { content: truncate(data.keyPoints, 2000) } }] },
      액션아이템: { rich_text: [{ text: { content: truncate(data.actionItems, 2000) } }] },
      다음질문제안: { rich_text: [{ text: { content: truncate(data.nextQuestions, 2000) } }] },
      전문텍스트: { rich_text: [{ text: { content: truncate(data.transcript, 2000) } }] },
      녹음파일URL: { url: data.audioUrl },
      소요시간: { number: data.duration },
    },
  });

  return {
    id: page.id,
    url: `https://notion.so/${page.id.replace(/-/g, '')}`,
  };
}

export async function getInterviews(personId?: string): Promise<Interview[]> {
  const filter: any = personId
    ? { property: '대상자', relation: { contains: personId } }
    : undefined;

  const response = await notion.databases.query({
    database_id: INTERVIEWS_DB,
    filter,
    sorts: [{ property: '날짜', direction: 'descending' }],
  });

  return response.results.map(pageToInterview);
}

export async function getRecentInterviews(limit: number = 3): Promise<Interview[]> {
  const response = await notion.databases.query({
    database_id: INTERVIEWS_DB,
    sorts: [{ property: '날짜', direction: 'descending' }],
    page_size: limit,
  });

  return response.results.map(pageToInterview);
}

// ── 헬퍼 ──

function getRichText(page: any, prop: string): string {
  const p = page.properties?.[prop];
  if (!p) return '';
  if (p.type === 'rich_text') {
    return p.rich_text?.map((t: any) => t.plain_text).join('') || '';
  }
  if (p.type === 'title') {
    return p.title?.map((t: any) => t.plain_text).join('') || '';
  }
  return '';
}

function pageToPersonn(page: any): Person {
  return {
    id: page.id,
    name: getRichText(page, '이름'),
    type: page.properties?.['유형']?.select?.name || '팀장',
    rank: page.properties?.['직급']?.select?.name || '',
    department: getRichText(page, '소속'),
    status: page.properties?.['상태']?.select?.name || '재직',
    nextQuestions: getRichText(page, '다음질문'),
    lastInterviewDate: page.properties?.['최근면담일']?.date?.start || null,
    memo: getRichText(page, '메모'),
  };
}

function pageToInterview(page: any): Interview {
  const personRelation = page.properties?.['대상자']?.relation;
  return {
    id: page.id,
    title: getRichText(page, '제목'),
    personId: personRelation?.[0]?.id || '',
    personName: getRichText(page, '제목').split('_')[0] || '',
    type: page.properties?.['유형']?.select?.name || '1:1 면담',
    date: page.properties?.['날짜']?.date?.start || '',
    summary: getRichText(page, '요약'),
    keyPoints: getRichText(page, '핵심포인트'),
    actionItems: getRichText(page, '액션아이템'),
    nextQuestions: getRichText(page, '다음질문제안'),
    transcript: getRichText(page, '전문텍스트'),
    audioUrl: page.properties?.['녹음파일URL']?.url || '',
    duration: page.properties?.['소요시간']?.number || 0,
    notionUrl: `https://notion.so/${page.id.replace(/-/g, '')}`,
  };
}

export async function archiveInterview(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) : str;
}
