// 광고주 목록 + 관리
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Person } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import PersonForm from '@/components/PersonForm';
import EmptyState from '@/components/EmptyState';

export default function ClientsPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadPersons = () => {
    setLoading(true);
    fetch('/api/persons?type=광고주')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPersons(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPersons(); }, []);

  const handleAdd = async (data: { name: string; type: string; department: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowForm(false);
        loadPersons();
        return { ok: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { ok: false, error: errData.error || `등록 실패 (${res.status})` };
      }
    } catch (err: any) {
      console.error('추가 에러:', err);
      return { ok: false, error: err.message || '추가 실패' };
    }
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">광고주 관리</h1>
        <button
          onClick={() => setShowForm(true)}
          className="
            px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
            hover:bg-blue-600 active:bg-blue-700
          "
        >
          + 추가
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : persons.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="등록된 광고주가 없습니다"
          description="추가 버튼을 눌러 광고주를 등록하세요"
        />
      ) : (
        <div className="space-y-3">
          {persons.map((person) => (
            <button
              key={person.id}
              onClick={() => router.push(`/clients/${person.id}`)}
              className="
                w-full text-left p-4 rounded-xl bg-slate-800
                border border-slate-700 hover:border-slate-600
                active:bg-slate-700 transition-all
              "
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{person.name}</span>
                <StatusBadge status={person.status} />
              </div>
              <p className="text-sm text-slate-400">{person.department}</p>
              {person.lastInterviewDate && (
                <p className="text-xs text-slate-500 mt-1">
                  최근 면담: {person.lastInterviewDate}
                </p>
              )}
              {person.nextQuestions && (
                <p className="text-xs text-blue-400/70 mt-1 truncate">
                  다음 질문: {person.nextQuestions.split('\n')[0]}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <PersonForm
        isOpen={showForm}
        type="광고주"
        onSubmit={handleAdd}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
}
