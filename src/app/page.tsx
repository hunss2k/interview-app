// 메인 대시보드
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Interview } from '@/lib/types';
import InterviewCard from '@/components/InterviewCard';
import EmptyState from '@/components/EmptyState';

export default function HomePage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/interviews?limit=3')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInterviews(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">45SPACE 회의록 관리</h1>
        <p className="text-sm text-slate-400 mt-1">녹음 · AI 요약 · 자동 기록</p>
      </div>

      {/* 최근 면담 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">최근 면담</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <EmptyState
            icon="🎙️"
            title="면담 기록이 없습니다"
            description="녹음 탭에서 첫 면담을 시작해보세요"
          />
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <InterviewCard
                key={iv.id}
                interview={iv}
                onClick={() => {
                  const route = iv.type === '1:1 면담' ? 'leaders' : 'clients';
                  window.location.href = `/${route}/${iv.personId}`;
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 녹음 FAB */}
      <Link
        href="/interview"
        className="
          fixed bottom-24 right-4 z-30
          w-14 h-14 rounded-full bg-red-500
          flex items-center justify-center
          shadow-lg shadow-red-500/30
          hover:bg-red-600 active:scale-95
          transition-all
        "
      >
        <span className="text-2xl">🎙️</span>
      </Link>
    </div>
  );
}
