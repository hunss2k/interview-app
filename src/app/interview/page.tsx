// 녹음 + 파일 업로드 처리 페이지
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { convertToWavChunks } from '@/lib/audioConverter';
import RecordButton from '@/components/RecordButton';
import PersonSelector from '@/components/PersonSelector';
import ProcessingOverlay from '@/components/ProcessingOverlay';
import type { Person, ProcessingStep } from '@/lib/types';

type InputMode = 'record' | 'upload';

interface ExtendedResult {
  success: boolean;
  summary: string;
  keyPoints: string;
  emotion: string;
  caution: string;
  actionItems: string;
  nextQuestions: string;
  notionUrl: string;
}

const JOB_ID_KEY = 'ccfm_current_job_id';
const JOBS_KEY = 'ccfm_jobs'; // { jobId, personId, personName }[]

interface JobEntry {
  jobId: string;
  personId: string;
  personName: string;
}

function addJob(entry: JobEntry) {
  const jobs: JobEntry[] = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
  jobs.push(entry);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function removeJob(jobId: string) {
  const jobs: JobEntry[] = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.filter((j) => j.jobId !== jobId)));
}

export default function InterviewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const resultReceivedRef = useRef(false);
  const [mode, setMode] = useState<InputMode>('record');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [showSelector, setShowSelector] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [result, setResult] = useState<ExtendedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<ProcessingStep[]>([
    { label: '녹음파일 업로드 중...', status: 'pending' },
    { label: '서버 처리 중... (화면 꺼져도 OK)', status: 'pending' },
  ]);

  // 새로고침 시 진행 중인 작업 확인
  useEffect(() => {
    const savedJobId = localStorage.getItem(JOB_ID_KEY);
    if (savedJobId) {
      startPolling(savedJobId);
    }
    return () => {
      releaseWakeLock();
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (jobId: string) => {
    // 즉시 폴링 UI 표시
    setShowProcessing(true);
    setError(null);
    setSteps([
      { label: '업로드 완료', status: 'done' },
      { label: '서버 처리 확인 중...', status: 'processing' },
    ]);

    stopPolling();
    const poll = async () => {
      try {
        const res = await fetch(`/api/interview/status?jobId=${jobId}`);
        if (!res.ok) {
          // 404면 작업 없음 - 정리
          if (res.status === 404) {
            localStorage.removeItem(JOB_ID_KEY);
            removeJob(jobId);
            stopPolling();
            setShowProcessing(false);
          }
          return;
        }

        const status = await res.json();

        // 상태별 UI 업데이트
        const stepLabel = status.step || '처리 중...';
        setSteps([
          { label: '업로드 완료', status: 'done' },
          { label: `${stepLabel} (다른 앱 전환 OK)`, status: status.status === 'error' ? 'error' : 'processing' },
        ]);

        if (status.status === 'done' && status.result) {
          if (resultReceivedRef.current) return; // 이미 fetch 응답으로 처리됨
          resultReceivedRef.current = true;
          stopPolling();
          localStorage.removeItem(JOB_ID_KEY);
          removeJob(jobId);
          setSteps([
            { label: '업로드 완료', status: 'done' },
            { label: '처리 완료!', status: 'done' },
          ]);
          setResult({
            ...status.result,
            emotion: status.result.emotion || '',
            caution: status.result.caution || '',
          });
          setTimeout(() => setShowProcessing(false), 1500);
        } else if (status.status === 'error') {
          stopPolling();
          localStorage.removeItem(JOB_ID_KEY);
          removeJob(jobId);
          setError(status.error || '처리 중 오류 발생');
        }
      } catch (err) {
        console.warn('폴링 에러:', err);
      }
    };

    // 즉시 1회 + 3초마다 폴링
    poll();
    pollRef.current = setInterval(poll, 3000);
  };

  // Wake Lock: 화면 꺼짐 방지
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {}
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch {}
    }
  };

  const updateStep = (index: number, status: ProcessingStep['status']) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleRecordingComplete = useCallback((blob: Blob, dur: number) => {
    setAudioBlob(blob);
    setUploadedFile(null);
    setDuration(dur);
    setShowSelector(true);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'video/mp4'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['webm', 'm4a', 'mp3', 'mp4', 'wav', 'ogg', 'flac', 'oga'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext || '')) {
      setError('지원하지 않는 파일 형식입니다. (m4a, mp3, wav, webm, mp4, ogg, flac)');
      return;
    }

    setUploadedFile(file);
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setShowSelector(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const parseResponse = async (res: Response, stepName: string) => {
    if (!res.ok) {
      let msg = `${stepName} 실패`;
      try {
        const err = await res.json();
        msg = err.error || msg;
        if (err.detail) {
          const d = err.detail;
          const details = [
            d.status && `status=${d.status}`,
            d.code && `code=${d.code}`,
            d.type && `type=${d.type}`,
            d.body?.message && `body=${d.body.message}`,
          ].filter(Boolean).join(', ');
          if (details) msg += `\n[${details}]`;
        }
      } catch {
        msg = res.status === 504 ? '처리 시간 초과. 다시 시도해주세요.' : `서버 에러 (${res.status})`;
      }
      throw new Error(msg);
    }
    return res.json();
  };

  const handlePersonSelect = useCallback(
    async (person: Person) => {
      // 중복 실행 방지
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setShowSelector(false);

      const audioSource = uploadedFile || audioBlob;
      if (!audioSource) {
        isProcessingRef.current = false;
        return;
      }

      // Wake Lock 활성화
      await requestWakeLock();

      setShowProcessing(true);
      setError(null);
      setSteps([
        { label: '오디오 변환 + 업로드 중...', status: 'pending' },
        { label: '서버 처리 중... (다른 앱 전환 OK)', status: 'pending' },
      ]);

      try {
        // Step 1: 클라이언트에서 WAV 변환 + 업로드
        updateStep(0, 'processing');

        const wavChunks = await convertToWavChunks(audioSource);

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        const timeStr = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

        const chunkUrls: string[] = [];
        for (let i = 0; i < wavChunks.length; i++) {
          setSteps((prev) =>
            prev.map((s, idx) =>
              idx === 0 ? { ...s, label: `업로드 중... (${i + 1}/${wavChunks.length})` } : s
            )
          );
          const chunk = wavChunks[i];
          const suffix = wavChunks.length > 1 ? `_part${i + 1}` : '';
          const blobFileName = `${person.name}_${dateStr}_${timeStr}${suffix}.${chunk.ext}`;

          const blob = await upload(blobFileName, chunk.blob, {
            access: 'public',
            handleUploadUrl: '/api/interview/upload',
          });
          chunkUrls.push(blob.url);
        }
        updateStep(0, 'done');

        // Step 2: 서버 통합 처리 (STT + AI + Notion + 텔레그램)
        updateStep(1, 'processing');

        // jobId 생성 + localStorage 저장
        const jobId = `${person.name}_${Date.now()}`;
        localStorage.setItem(JOB_ID_KEY, jobId);
        addJob({ jobId, personId: person.id, personName: person.name });
        resultReceivedRef.current = false;

        // 폴링 시작 (서버 호출과 병행 - 연결 끊겨도 결과 수신 가능)
        startPolling(jobId);

        // 서버 호출 (await로 연결 유지 - Vercel 서버리스 함수가 끊기지 않도록)
        try {
          const res = await fetch('/api/interview/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chunkUrls,
              ext: wavChunks[0].ext,
              personId: person.id,
              duration,
              jobId,
            }),
          });

          // 폴링이 이미 결과를 받았으면 fetch 응답 무시
          if (!resultReceivedRef.current && res.ok) {
            const data = await res.json();
            if (data.success && !resultReceivedRef.current) {
              resultReceivedRef.current = true;
              stopPolling();
              localStorage.removeItem(JOB_ID_KEY);
              removeJob(jobId);
              setSteps([
                { label: '업로드 완료', status: 'done' },
                { label: '처리 완료!', status: 'done' },
              ]);
              setResult({
                ...data,
                emotion: data.emotion || '',
                caution: data.caution || '',
              });
              setTimeout(() => setShowProcessing(false), 1500);
            }
          }
        } catch (fetchErr) {
          // fetch 실패해도 폴링이 결과를 받을 수 있으므로 무시
          console.warn('서버 fetch 에러 (폴링으로 복구 시도):', fetchErr);
        }

      } catch (err: any) {
        console.error('처리 에러:', err);
        setError(err.message);
        setSteps((prev) =>
          prev.map((s) =>
            s.status === 'processing' ? { ...s, status: 'error' } : s
          )
        );
      } finally {
        await releaseWakeLock();
        isProcessingRef.current = false;
      }
    },
    [audioBlob, uploadedFile, duration]
  );

  const handleReset = () => {
    setResult(null);
    setAudioBlob(null);
    setUploadedFile(null);
    setDuration(0);
    setError(null);
    localStorage.removeItem(JOB_ID_KEY);
    stopPolling();
  };

  // 결과 화면
  if (result) {
    return (
      <div className="px-4 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">면담 분석 완료</h1>
          <button
            onClick={handleReset}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            새 면담
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="text-sm font-medium text-blue-400 mb-2">📋 전체 요약 · 흐름</h3>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.summary}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="text-sm font-medium text-green-400 mb-2">💡 핵심 포인트</h3>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.keyPoints}</p>
          </div>

          {result.caution && (
            <div className="p-4 rounded-xl bg-slate-800 border border-orange-500/30">
              <h3 className="text-sm font-medium text-orange-400 mb-2">📌 다음 미팅 준비사항</h3>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.caution}</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-800 border border-cyan-500/30">
            <h3 className="text-sm font-medium text-cyan-400 mb-2">❓ 추천 질문</h3>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.nextQuestions}</p>
          </div>

          <a
            href={result.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              block w-full py-3 text-center rounded-xl
              bg-blue-500 text-white font-medium
              hover:bg-blue-600 active:bg-blue-700
              transition-colors
            "
          >
            Notion에서 보기 →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-white text-center mb-2">회의록 녹음</h1>

      {/* 모드 토글 */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => setMode('record')}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${mode === 'record'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-slate-300'
            }
          `}
        >
          직접 녹음
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${mode === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-slate-300'
            }
          `}
        >
          파일 업로드
        </button>
      </div>

      {mode === 'record' ? (
        <>
          <p className="text-sm text-slate-400 text-center mb-12">
            버튼을 눌러 녹음을 시작하세요
          </p>
          <div className="flex justify-center mt-12">
            <RecordButton onRecordingComplete={handleRecordingComplete} />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-400 text-center mb-8">
            갤럭시 녹음 등 기존 파일을 업로드하세요
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.flac,.mp4"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4 mt-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="
                w-32 h-32 rounded-full
                bg-slate-700 border-2 border-dashed border-slate-500
                hover:bg-slate-600 hover:border-blue-400
                active:bg-slate-500
                transition-all flex flex-col items-center justify-center gap-2
              "
            >
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-xs text-slate-400">파일 선택</span>
            </button>

            <p className="text-xs text-slate-500">
              m4a, mp3, wav, webm, ogg, flac 지원
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center mt-4">{error}</p>
          )}
        </>
      )}

      <PersonSelector
        isOpen={showSelector}
        onSelect={handlePersonSelect}
        onClose={() => setShowSelector(false)}
      />

      <ProcessingOverlay
        isOpen={showProcessing}
        steps={steps}
        error={error}
        onClose={() => { setShowProcessing(false); setError(null); handleReset(); }}
      />
    </div>
  );
}
