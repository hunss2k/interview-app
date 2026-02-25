# CCFM 면담관리 시스템

면담 녹음 → AI 음성인식 → AI 분석 → Notion 자동 정리 → 텔레그램 알림

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fchoi20201101%2Fccfm-deploy&env=NOTION_API_KEY,NOTION_PARENT_PAGE_ID,ANTHROPIC_API_KEY,OPENAI_API_KEY,BLOB_READ_WRITE_TOKEN,TELEGRAM_BOT_TOKEN,NEXT_PUBLIC_APP_URL)

---

## 주요 기능

- **면담 녹음 & 파일 업로드** - 직접 녹음 또는 기존 파일(m4a, mp3, wav 등) 업로드
- **AI 음성인식** - OpenAI Whisper로 한국어 자동 변환
- **AI 분석** - Claude가 요약, 핵심 포인트, 추천 질문 등 자동 분석
- **Notion 자동 저장** - 분석 결과가 Notion 데이터베이스에 자동 정리
- **텔레그램 알림** - 면담 완료 시 텔레그램으로 알림
- **AI 채팅** - 면담 내용 기반 추가 질문 & 인사이트
- **PWA 지원** - 모바일 홈 화면에 앱처럼 설치 가능

---

## 빠른 시작 (5분)

### 1단계: 위 "Deploy with Vercel" 버튼 클릭

### 2단계: 환경변수 입력

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `NOTION_API_KEY` | Notion 통합 시크릿 | [Notion Integrations](https://www.notion.so/my-integrations) |
| `NOTION_PARENT_PAGE_ID` | Notion 상위 페이지 ID | 페이지 URL에서 추출 |
| `ANTHROPIC_API_KEY` | Claude AI API 키 | [Anthropic Console](https://console.anthropic.com) |
| `OPENAI_API_KEY` | Whisper STT API 키 | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 | Vercel 대시보드 > Storage |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 | [@BotFather](https://t.me/BotFather) |
| `NEXT_PUBLIC_APP_URL` | 배포된 앱 URL | 배포 후 확인 (예: https://my-app.vercel.app) |

### 3단계: Deploy 완료 후 접속!

---

## 환경변수 발급 가이드

### Notion API
1. [Notion Integrations](https://www.notion.so/my-integrations) 접속
2. "새 통합 만들기" → 이름 입력 → 생성
3. "내부 통합 시크릿" 복사 → `NOTION_API_KEY`
4. Notion 페이지 → ... → 연결 → 통합 추가
5. 페이지 URL의 32자리 ID → `NOTION_PARENT_PAGE_ID`

> DB ID(`NOTION_PERSONS_DB_ID`, `NOTION_INTERVIEWS_DB_ID`)는 비워두세요. 첫 실행 시 자동 생성됩니다.

### OpenAI API
1. [API Keys](https://platform.openai.com/api-keys) → "Create new secret key"
2. [Billing](https://platform.openai.com/account/billing)에서 크레딧 충전 (Whisper: ~$0.006/분)

### Anthropic API
1. [Console](https://console.anthropic.com) → API Keys → Create Key
2. 크레딧 충전 필요

### Vercel Blob
1. Vercel 대시보드 → 프로젝트 → Storage 탭 → Blob Store 생성
2. 토큰 복사

### Telegram 봇
1. [@BotFather](https://t.me/BotFather) → `/newbot` → 봇 생성
2. 토큰 복사 → 봇에게 아무 메시지 보내기 (활성화)

---

## 모바일 설치 (PWA)

| Android | iPhone |
|---------|--------|
| Chrome → 메뉴 → "앱 설치" | Safari → 공유 → "홈 화면에 추가" |

---

## 기술 스택

- **프레임워크**: Next.js 14 + React 18 + TypeScript
- **AI**: OpenAI Whisper (STT) + Claude Sonnet 4.5 (분석)
- **데이터**: Notion API + Vercel Blob
- **알림**: Telegram Bot API
- **스타일**: Tailwind CSS
- **배포**: Vercel (Pro 권장, $20/월 - 긴 녹음 처리용)

---

## 비용 안내

| 항목 | 비용 |
|------|------|
| Vercel Pro | $20/월 (권장, 긴 녹음) |
| OpenAI Whisper | ~$0.006/분 |
| Claude 분석 | ~$0.01~0.03/건 |
| Notion | 무료 |
| Telegram | 무료 |

> 하루 3건 30분 면담 기준: **월 약 $25~30**

---

## 로컬 개발

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 편집하여 키 입력

# Notion DB 초기 생성
pnpm setup-notion

# 개발 서버
pnpm dev
```

---

## 문제 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| 면담 처리 실패 (Connection error) | 네트워크 일시 장애 | 자동 재시도됨, 재시도 |
| 429 quota exceeded | OpenAI 크레딧 소진 | 크레딧 충전 |
| 504 timeout | 서버리스 시간 초과 | Vercel Pro 필요 |
| Notion 카드 안 생김 | 통합 미연결 | 페이지에 통합 추가 |
