// 공용 TypeScript 타입 정의

export type PersonType = '팀장' | '팀원' | '대외미팅' | '임원';
export type PersonRank = '사원' | '주임' | '대리' | '과장' | '차장' | '부장' | '이사' | '상무' | '전무' | '대표';
export type PersonStatus = '재직' | '퇴직' | '거래중' | '거래종료';
export type InterviewType = '1:1 면담' | '대외미팅';

export interface Person {
  id: string;
  name: string;
  type: PersonType;
  rank: PersonRank | '';
  department: string;
  status: PersonStatus;
  nextQuestions: string;
  lastInterviewDate: string | null;
  memo: string;
}

export interface Interview {
  id: string;
  title: string;
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
  notionUrl: string;
}

export interface InterviewResult {
  success: boolean;
  summary: string;
  keyPoints: string;
  actionItems: string;
  nextQuestions: string;
  notionUrl: string;
}

export interface ProcessingStep {
  label: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface ClaudeAnalysis {
  summary: string;
  keyPoints: string;
  emotion: string;
  caution: string;
  actionItems: string;
  nextQuestions: string;
}
