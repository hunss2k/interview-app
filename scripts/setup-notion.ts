// Notion DB 초기 생성 스크립트 (1회 실행)
// 실행: npx tsx scripts/setup-notion.ts
import { Client } from '@notionhq/client';
import * as fs from 'fs';
import * as path from 'path';

// .env.local 파일 수동 파싱
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Notion API에서 사용할 페이지 ID (부모 페이지)
// 환경변수로 부모 페이지 ID를 지정하거나, 비워두면 워크스페이스 최상위에 생성
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

async function createPersonsDB() {
  console.log('📋 인원(Persons) DB 생성 중...');

  const parent: any = PARENT_PAGE_ID
    ? { page_id: PARENT_PAGE_ID }
    : { page_id: PARENT_PAGE_ID! }; // 부모 페이지 ID 필수

  const db = await notion.databases.create({
    parent,
    title: [{ text: { content: 'CCFM 인원' } }],
    properties: {
      이름: { title: {} },
      유형: {
        select: {
          options: [
            { name: '팀장', color: 'blue' },
            { name: '광고주', color: 'green' },
          ],
        },
      },
      소속: { rich_text: {} },
      상태: {
        select: {
          options: [
            { name: '재직', color: 'green' },
            { name: '퇴사', color: 'red' },
            { name: '거래중', color: 'blue' },
            { name: '거래종료', color: 'gray' },
          ],
        },
      },
      다음질문: { rich_text: {} },
      최근면담일: { date: {} },
      메모: { rich_text: {} },
    },
  });

  console.log(`✅ 인원 DB 생성 완료: ${db.id}`);
  return db.id;
}

async function createInterviewsDB(personsDbId: string) {
  console.log('📋 면담 기록(Interviews) DB 생성 중...');

  const parent: any = PARENT_PAGE_ID
    ? { page_id: PARENT_PAGE_ID }
    : { page_id: PARENT_PAGE_ID! };

  const db = await notion.databases.create({
    parent,
    title: [{ text: { content: 'CCFM 면담 기록' } }],
    properties: {
      제목: { title: {} },
      대상자: {
        relation: {
          database_id: personsDbId,
          single_property: {},
        },
      },
      유형: {
        select: {
          options: [
            { name: '1:1 면담', color: 'blue' },
            { name: '광고주 미팅', color: 'green' },
          ],
        },
      },
      날짜: { date: {} },
      요약: { rich_text: {} },
      핵심포인트: { rich_text: {} },
      액션아이템: { rich_text: {} },
      다음질문제안: { rich_text: {} },
      전문텍스트: { rich_text: {} },
      녹음파일URL: { url: {} },
      소요시간: { number: { format: 'number' } },
    },
  });

  console.log(`✅ 면담 기록 DB 생성 완료: ${db.id}`);
  return db.id;
}

async function main() {
  console.log('🚀 CCFM Notion DB 셋업 시작\n');

  if (!process.env.NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    process.exit(1);
  }
  if (!PARENT_PAGE_ID) {
    console.error('❌ NOTION_PARENT_PAGE_ID가 설정되지 않았습니다.');
    console.error('   Notion에서 빈 페이지를 만들고 해당 페이지 ID를 .env.local에 추가하세요.');
    console.error('   예: NOTION_PARENT_PAGE_ID=abc123...');
    process.exit(1);
  }

  try {
    const personsDbId = await createPersonsDB();
    const interviewsDbId = await createInterviewsDB(personsDbId);

    console.log('\n🎉 셋업 완료! 아래 값을 .env.local에 추가하세요:\n');
    console.log(`NOTION_PERSONS_DB_ID=${personsDbId}`);
    console.log(`NOTION_INTERVIEWS_DB_ID=${interviewsDbId}`);
  } catch (error: any) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
}

main();
