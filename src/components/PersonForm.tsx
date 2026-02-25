// 인원 추가/수정 모달 폼
'use client';

import { useState } from 'react';
import type { PersonType, PersonRank } from '@/lib/types';

interface PersonFormProps {
  isOpen: boolean;
  type: PersonType;
  initialData?: { name: string; department: string; rank?: PersonRank | '' };
  onSubmit: (data: { name: string; type: PersonType; rank?: PersonRank | ''; department: string }) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  error?: string | null;
}

const RANKS: PersonRank[] = ['본부장', '부팀장', '팀장', '사원'];

export default function PersonForm({
  isOpen,
  type,
  initialData,
  onSubmit,
  onClose,
  error,
}: PersonFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [rank, setRank] = useState<PersonRank | ''>(initialData?.rank || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayError = error || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const result = await onSubmit({
        name: name.trim(),
        type,
        rank: type === '팀장' ? rank : '',
        department: department.trim(),
      });
      if (result.ok) {
        setName('');
        setRank('');
        setDepartment('');
      } else {
        setLocalError(result.error || '등록 실패');
      }
    } catch (err: any) {
      setLocalError(err.message || '등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = type === '팀장' ? '직원' : '광고주';
  const deptLabel = type === '팀장' ? '부서' : '회사명';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="w-80 bg-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {initialData ? `${typeLabel} 수정` : `${typeLabel} 추가`}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력"
              className="
                w-full px-4 py-3 bg-slate-700 rounded-lg
                text-white placeholder-slate-400
                text-base outline-none focus:ring-2 focus:ring-blue-500
              "
              autoFocus
            />
          </div>

          {type === '팀장' && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">직급</label>
              <div className="flex gap-2">
                {RANKS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRank(r)}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                      ${rank === r
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-300'
                      }
                    `}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">{deptLabel}</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={`${deptLabel} 입력`}
              className="
                w-full px-4 py-3 bg-slate-700 rounded-lg
                text-white placeholder-slate-400
                text-base outline-none focus:ring-2 focus:ring-blue-500
              "
            />
          </div>

          {displayError && (
            <p className="text-sm text-red-400 text-center">{displayError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="
                flex-1 py-3 rounded-lg bg-slate-700
                text-slate-300 font-medium
              "
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="
                flex-1 py-3 rounded-lg bg-blue-500
                text-white font-medium
                hover:bg-blue-600 active:bg-blue-700
                disabled:opacity-50
              "
            >
              {submitting ? '등록 중...' : (initialData ? '수정' : '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
