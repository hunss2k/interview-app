// 면담 요약 카드 컴포넌트
'use client';

import type { Interview } from '@/lib/types';

interface InterviewCardProps {
  interview: Interview;
  onClick?: () => void;
}

export default function InterviewCard({ interview, onClick }: InterviewCardProps) {
  const summaryPreview = interview.summary
    .split('\n')
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(' ')
    .slice(0, 80);

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left p-4 rounded-xl bg-slate-800
        border border-slate-700 hover:border-slate-600
        active:bg-slate-700 transition-all
      "
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{interview.personName}</span>
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full
            ${interview.type === '1:1 면담'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-green-500/20 text-green-400'
            }
          `}
        >
          {interview.type}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-1">{interview.date}</p>
      <p className="text-sm text-slate-300 line-clamp-2">
        {summaryPreview || '요약 없음'}
      </p>
    </button>
  );
}
