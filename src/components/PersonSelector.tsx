// 이름 선택 팝업 (검색 드롭다운)
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Person, PersonType } from '@/lib/types';
import PersonForm from './PersonForm';

interface PersonSelectorProps {
  isOpen: boolean;
  onSelect: (person: Person) => void;
  onClose: () => void;
}

export default function PersonSelector({ isOpen, onSelect, onClose }: PersonSelectorProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [tab, setTab] = useState<PersonType>('팀장');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const loadPersons = () => {
    setLoading(true);
    fetch('/api/persons?active=true')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPersons(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadPersons();
      setSelecting(false); // 다시 열릴 때 초기화
    }
  }, [isOpen]);

  const [addError, setAddError] = useState<string | null>(null);

  const handleAddPerson = async (data: { name: string; type: PersonType; rank?: string; department: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      setAddError(null);
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowAddForm(false);
        loadPersons();
        return { ok: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `등록 실패 (${res.status})`;
        setAddError(msg);
        return { ok: false, error: msg };
      }
    } catch (err: any) {
      const msg = err.message || '인원 추가 에러';
      console.error('인원 추가 에러:', err);
      setAddError(msg);
      return { ok: false, error: msg };
    }
  };

  if (!isOpen) return null;

  const filtered = persons
    .filter((p) => p.type === tab)
    .filter((p) => p.name.includes(search) || p.department.includes(search));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
        <div
          className="
            w-full max-w-lg bg-slate-800 rounded-t-2xl
            max-h-[80vh] flex flex-col
            animate-slide-up
          "
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">대상자 선택</h2>
            <button onClick={onClose} className="text-slate-400 text-2xl leading-none">&times;</button>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-slate-700">
            {(['팀장', '광고주'] as PersonType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`
                  flex-1 py-3 text-sm font-medium transition-colors
                  ${tab === t
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400'
                  }
                `}
              >
                {t === '팀장' ? '직원' : '광고주'}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="p-3">
            <input
              type="text"
              placeholder="이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full px-4 py-3 bg-slate-700 rounded-lg
                text-white placeholder-slate-400
                text-base outline-none focus:ring-2 focus:ring-blue-500
              "
            />
          </div>

          {/* 인원 리스트 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <p className="text-center text-slate-400 py-8">로딩 중...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">
                  {search ? '검색 결과가 없습니다' : '등록된 인원이 없습니다'}
                </p>
              </div>
            ) : (
              filtered.map((person) => (
                <button
                  key={person.id}
                  disabled={selecting}
                  onClick={() => {
                    if (selecting) return;
                    setSelecting(true);
                    onSelect(person);
                  }}
                  className={`
                    w-full text-left p-4 rounded-xl bg-slate-700/50
                    transition-colors
                    ${selecting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 active:bg-slate-600'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{person.name}</p>
                    {person.rank && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">
                        {person.rank}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{person.department}</p>
                </button>
              ))
            )}
          </div>

          {/* 하단 추가 버튼 (항상 표시) */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={() => setShowAddForm(true)}
              className="
                w-full py-3 rounded-xl bg-slate-700
                text-blue-400 font-medium text-sm
                hover:bg-slate-600 active:bg-slate-500
                transition-colors
              "
            >
              + {tab === '팀장' ? '직원' : '광고주'} 추가하기
            </button>
          </div>
        </div>
      </div>

      {/* PersonForm을 Portal로 최상위에 렌더링 */}
      {showAddForm && typeof document !== 'undefined' && createPortal(
        <PersonForm
          isOpen={showAddForm}
          type={tab}
          onSubmit={handleAddPerson}
          onClose={() => { setShowAddForm(false); setAddError(null); }}
          error={addError}
        />,
        document.body
      )}
    </>
  );
}
