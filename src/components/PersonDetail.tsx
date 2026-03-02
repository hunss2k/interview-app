// 공통 대상자 상세 페이지 컴포넌트
// 처리 상태 표시 + 면담 삭제 + AI 채팅 기능 포함
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Person, Interview } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const JOBS_KEY = 'ccfm_jobs';

interface JobEntry {
  jobId: string;
  personId: string;
  personName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PersonDetailProps {
  personType: 'leader' | 'client';
}

export default function PersonDetail({ personType }: PersonDetailProps) {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [person, setPerson] = useState<Person | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 처리 상태
  const [pendingJobs, setPendingJobs] = useState<JobEntry[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>({});

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI 채팅
  const [chatTarget, setChatTarget] = useState<Interview | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 데이터 로드
  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/persons/${id}`).then((r) => r.json()),
      fetch(`/api/interviews?personId=${id}`).then((r) => r.json()),
    ])
      .then(([personData, interviewData]) => {
        setPerson(personData);
        if (Array.isArray(interviewData)) setInterviews(interviewData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // 진행 중인 작업 확인 (localStorage)
  useEffect(() => {
    if (!id) return;

    const checkJobs = () => {
      const jobs: JobEntry[] = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
      const myJobs = jobs.filter((j) => j.personId === id);
      setPendingJobs(myJobs);
      return myJobs;
    };

    const myJobs = checkJobs();
    if (myJobs.length === 0) return;

    // 폴링 시작
    const poll = async () => {
      const currentJobs = checkJobs();
      if (currentJobs.length === 0) {
        if (pollRef.current) clearInterval(pollRef.current);
        loadData(); // 완료 시 새로고침
        return;
      }

      for (const job of currentJobs) {
        try {
          const res = await fetch(`/api/interview/status?jobId=${job.jobId}`);
          if (!res.ok) {
            if (res.status === 404) {
              // 작업 없음 - 제거
              const jobs: JobEntry[] = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
              localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.filter((j) => j.jobId !== job.jobId)));
              checkJobs();
            }
            continue;
          }
          const status = await res.json();
          setJobStatuses((prev) => ({ ...prev, [job.jobId]: status.step || '처리 중...' }));

          if (status.status === 'done' || status.status === 'error') {
            const jobs: JobEntry[] = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
            localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.filter((j) => j.jobId !== job.jobId)));
            checkJobs();
            if (status.status === 'done') loadData();
          }
        } catch {}
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // 면담 삭제
  const handleDelete = async (interviewId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, { method: 'DELETE' });
      if (res.ok) {
        setInterviews((prev) => prev.filter((iv) => iv.id !== interviewId));
        setDeleteTarget(null);
        setExpandedId(null);
      } else {
        alert('삭제에 실패했습니다');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다');
    } finally {
      setDeleting(false);
    }
  };

  // AI 채팅
  const handleChatOpen = (iv: Interview) => {
    setChatTarget(iv);
    setChatMessages([]);
    setChatInput('');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !chatTarget || chatLoading) return;

    const question = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            summary: chatTarget.summary,
            keyPoints: chatTarget.keyPoints,
            actionItems: chatTarget.actionItems,
            nextQuestions: chatTarget.nextQuestions,
            transcript: chatTarget.transcript,
          },
          history: chatMessages,
        }),
      });

      if (!res.ok) throw new Error('AI 응답 실패');
      const { answer } = await res.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '죄송합니다. 응답 중 오류가 발생했습니다.' },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const isLeader = personType === 'leader';
  const typeLabel = isLeader ? '직원' : '대외미팅';
  const recordLabel = isLeader ? '면담 기록' : '소통 기록';
  const emptyTitle = isLeader ? '면담 기록이 없습니다' : '소통 기록이 없습니다';
  const emptyDesc = isLeader ? '녹음 탭에서 면담을 진행해보세요' : '녹음 탭에서 미팅을 진행해보세요';
  const questionLabel = isLeader ? '다음 면담 추천 질문' : '다음 미팅 추천 질문';

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-8 w-32 bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="px-4 pt-6">
        <p className="text-slate-400">{typeLabel}을(를) 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-20">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="text-sm text-slate-400 mb-4 hover:text-slate-300"
      >
        ← 목록으로
      </button>

      {/* 인원 정보 */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-white">{person.name}</h1>
        <StatusBadge status={person.status} />
      </div>

      {/* 다음 면담 질문 */}
      {person.nextQuestions && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
          <h3 className="text-sm font-medium text-blue-400 mb-2">{questionLabel}</h3>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{person.nextQuestions}</p>
        </div>
      )}

      {/* 면담 기록 타임라인 */}
      <h2 className="text-lg font-semibold text-slate-200 mb-3">{recordLabel}</h2>

      <div className="space-y-3">
        {/* 처리 중인 작업 카드 */}
        {pendingJobs.map((job) => (
          <div
            key={job.jobId}
            className="rounded-xl bg-slate-800 border border-blue-500/30 overflow-hidden animate-pulse"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-sm font-medium text-blue-400">생성 중...</span>
              </div>
              <p className="text-sm text-slate-400">
                {jobStatuses[job.jobId] || '서버에서 처리 중입니다'}
              </p>
            </div>
          </div>
        ))}

        {/* 기존 면담 카드 */}
        {interviews.length === 0 && pendingJobs.length === 0 ? (
          <EmptyState icon="📝" title={emptyTitle} description={emptyDesc} />
        ) : (
          interviews.map((iv) => {
            const isExpanded = expandedId === iv.id;
            return (
              <div
                key={iv.id}
                className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : iv.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-400">{iv.date}</span>
                    <span className="text-xs text-slate-500">{iv.duration}분</span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2">{iv.summary}</p>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-1">핵심 포인트</h4>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{iv.keyPoints}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-1">액션 아이템</h4>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{iv.actionItems}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-1">다음 질문 제안</h4>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{iv.nextQuestions}</p>
                    </div>
                    {iv.audioUrl && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 mb-1">녹음</h4>
                        <audio controls src={iv.audioUrl} className="w-full h-10" />
                      </div>
                    )}

                    {/* 하단 액션 버튼들 */}
                    <div className="flex gap-2 pt-2">
                      {iv.notionUrl && (
                        <a
                          href={iv.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 text-center text-sm rounded-lg bg-slate-700 text-blue-400 hover:bg-slate-600 transition-colors"
                        >
                          Notion →
                        </a>
                      )}
                      <button
                        onClick={() => handleChatOpen(iv)}
                        className="flex-1 py-2.5 text-center text-sm rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      >
                        🤖 AI 질문
                      </button>
                      <button
                        onClick={() => setDeleteTarget(iv.id)}
                        className="py-2.5 px-4 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-2xl p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">면담 기록 삭제</h3>
            <p className="text-sm text-slate-400 mb-6">
              이 면담 기록을 삭제하시겠습니까?<br />
              Notion에서 아카이브 처리됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 채팅 모달 */}
      {chatTarget && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
          {/* 채팅 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h3 className="text-white font-semibold">AI 질문</h3>
              <p className="text-xs text-slate-400">{chatTarget.date} 면담 기반</p>
            </div>
            <button
              onClick={() => setChatTarget(null)}
              className="text-slate-400 text-2xl leading-none hover:text-slate-300"
            >
              &times;
            </button>
          </div>

          {/* 채팅 메시지 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-4">
                  면담 내용을 기반으로 AI에게 질문하세요
                </p>
                <div className="space-y-2">
                  {['핵심 내용을 한 줄로 요약해줘', '추가로 확인해야 할 사항은?', '이 면담에서 놓친 포인트가 있을까?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="block w-full text-left px-4 py-2.5 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-200 rounded-bl-md'
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                  <span className="animate-pulse">AI가 분석 중...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 채팅 입력 */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleChatSend()}
                placeholder="면담 내용에 대해 질문하세요..."
                className="flex-1 px-4 py-3 bg-slate-800 rounded-xl text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
                className="px-4 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
