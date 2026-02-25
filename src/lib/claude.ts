// Claude API 면담 분석 유틸
import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeAnalysis } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(context?: AnalysisContext): string {
  const ceoName = context?.ceoName || '최재명 대표';
  const counterpartName = context?.counterpartName || '상대방';
  const counterpartType = context?.counterpartType || '';
  const typeHint = counterpartType === '광고주'
    ? '이 녹취록은 **광고주/고객사 미팅**입니다. 상대방의 의도와 방향성을 파악하고, 원하는 것을 정확히 읽어내는 것이 핵심입니다.'
    : '이 녹취록은 **팀장/직원 면담**입니다. 조직원의 심리를 파악하고 케어하는 것이 핵심입니다.';

  return `당신은 CEO 직속 면담 분석 전문가입니다. 녹취록을 분석하여 CEO의 의사결정을 돕는 실질적 인사이트를 제공합니다.

**중요: 화자 구분**
- 이 녹취록은 ${ceoName}(CEO, "나")와 ${counterpartName}${counterpartType ? ` (${counterpartType})` : ''}의 대화입니다.
- ${ceoName}의 발언은 맥락 파악용으로만 사용하세요.
- 모든 인사이트와 분석의 초점은 반드시 상대방(${counterpartName})에 맞추세요.
- ${ceoName}에 대한 분석이나 인사이트는 제공하지 마세요.

${typeHint}

아래 형식을 정확히 지켜서 작성하세요. 각 섹션은 반드시 ## 으로 시작합니다.

## 전체 요약
(대화의 전체 흐름을 스토리라인으로 5줄 이내 정리. 어떤 맥락에서 시작해서 어떤 결론으로 흘러갔는지)

## 핵심 포인트
- **[주제]**: 구체적 내용 + CEO가 알아야 하는 이유
- 상대방이 특히 강조하거나 반복한 포인트 표시
- 수치/팩트가 언급되었다면 반드시 포함
- 말하지 않았지만 읽히는 숨은 메시지도 포함

## 다음 미팅 준비사항
- [ ] CEO가 다음 미팅 전에 확인/준비해야 할 구체적 항목
- [ ] 이번에 약속한 것, 확인하겠다고 한 것 정리
- [ ] 미해결 이슈 중 선제적으로 준비하면 좋은 것
- 우선순위 순으로 정렬

## 추천 질문
(면담 유형에 따라 다르게 작성)

[팀장/직원 면담인 경우]
1. 상대방의 감정 상태를 확인하고 케어하는 질문 (불안/스트레스/고민이 감지되었다면 그에 맞게)
2. 이번 면담에서 나온 액션아이템 팔로업 질문
3. 상대방이 말하고 싶었지만 못한 것을 끌어내는 질문
4. 성장/발전/커리어 관련 케어 질문
5. 팀/조직 분위기를 파악하기 위한 간접 질문

[광고주/고객사 미팅인 경우]
1. 상대방의 진짜 의도와 우선순위를 확인하는 날카로운 질문
2. 예산/일정/의사결정 구조를 파악하는 질문
3. 경쟁사 상황이나 대안을 확인하는 질문
4. 우리 쪽 제안에 대한 솔직한 평가를 끌어내는 질문
5. 다음 단계 합의를 위한 클로징 질문`;
}

export interface AnalysisContext {
  ceoName?: string;
  counterpartName: string;
  counterpartType?: string;
}

export async function analyzeTranscript(
  transcript: string,
  context?: AnalysisContext
): Promise<ClaudeAnalysis> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    system: buildSystemPrompt(context),
    messages: [
      {
        role: 'user',
        content: `아래 녹취록을 분석해주세요.\n\n---\n\n${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Claude 응답이 텍스트가 아닙니다');
  }

  return parseAnalysis(content.text);
}

function parseAnalysis(text: string): ClaudeAnalysis {
  const sections: Record<string, string> = {};
  const sectionNames = [
    '전체 요약',
    '핵심 포인트',
    '다음 미팅 준비사항',
    '추천 질문',
  ];

  for (const name of sectionNames) {
    const regex = new RegExp(
      `## ${name.replace('/', '\\/')}\\s*\\n([\\s\\S]*?)(?=## |$)`
    );
    const match = text.match(regex);
    sections[name] = match ? match[1].trim() : '';
  }

  return {
    summary: sections['전체 요약'] || '',
    keyPoints: sections['핵심 포인트'] || '',
    emotion: '', // 더이상 별도 섹션 없음
    caution: sections['다음 미팅 준비사항'] || '',
    actionItems: sections['다음 미팅 준비사항'] || '',
    nextQuestions: sections['추천 질문'] || '',
  };
}
