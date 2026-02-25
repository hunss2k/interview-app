// 처리 중 오버레이 (STT → 요약 → 저장 프로그레스)
'use client';

import type { ProcessingStep } from '@/lib/types';

interface ProcessingOverlayProps {
  isOpen: boolean;
  steps: ProcessingStep[];
  error?: string | null;
  onClose?: () => void;
}

export default function ProcessingOverlay({ isOpen, steps, error, onClose }: ProcessingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-80 bg-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white text-center">
          {error ? '처리 실패' : '면담 처리 중'}
        </h3>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* 아이콘 */}
              <div className="w-6 h-6 flex items-center justify-center">
                {step.status === 'done' && (
                  <span className="text-green-400 text-lg">✓</span>
                )}
                {step.status === 'processing' && (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
                {step.status === 'pending' && (
                  <div className="w-3 h-3 bg-slate-600 rounded-full" />
                )}
                {step.status === 'error' && (
                  <span className="text-red-400 text-lg">✕</span>
                )}
              </div>

              {/* 텍스트 */}
              <span
                className={`text-sm ${
                  step.status === 'processing'
                    ? 'text-blue-400'
                    : step.status === 'done'
                    ? 'text-green-400'
                    : step.status === 'error'
                    ? 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* 프로그레스바 */}
        {!error && (
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${(steps.filter((s) => s.status === 'done').length / steps.length) * 100}%`,
              }}
            />
          </div>
        )}

        {error && (
          <>
            <p className="text-sm text-red-400 text-center whitespace-pre-wrap break-all">{error}</p>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-600"
              >
                닫기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
