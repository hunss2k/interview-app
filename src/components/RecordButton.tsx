// 녹음 버튼 컴포넌트 (시작/중지 + 타이머)
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordButtonProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
}

export default function RecordButton({ onRecordingComplete }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Wake Lock 해제
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 브라우저가 지원하는 MIME 타입 자동 감지
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const mimeExt: Record<string, string> = {
        'audio/webm;codecs=opus': 'webm',
        'audio/webm': 'webm',
        'audio/mp4': 'm4a',
        'audio/ogg;codecs=opus': 'ogg',
        'audio/ogg': 'ogg',
      };
      const ext = mimeExt[supportedMime] || 'webm';
      const baseMime = supportedMime.split(';')[0] || 'audio/webm';

      const options: MediaRecorderOptions = {};
      if (supportedMime) options.mimeType = supportedMime;
      const mediaRecorder = new MediaRecorder(stream, options);

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: baseMime });
        // 파일명에 올바른 확장자 포함시키기 위해 File 객체로 변환
        const file = new File([blob], `recording.${ext}`, { type: baseMime });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        stream.getTracks().forEach((t) => t.stop());
        onRecordingComplete(file, duration);
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setElapsed(0);

      // Wake Lock: 녹음 중 화면 꺼짐 방지
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then((lock) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('마이크 접근 에러:', err);
      alert('마이크 권한을 허용해주세요.');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Wake Lock 해제
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg active:scale-95
          ${isRecording
            ? 'bg-red-500 animate-pulse shadow-red-500/50'
            : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
          }
        `}
      >
        {isRecording ? (
          <div className="w-8 h-8 bg-white rounded-sm" />
        ) : (
          <div className="w-10 h-10 bg-white rounded-full" />
        )}
      </button>

      {isRecording ? (
        <div className="text-center">
          <p className="text-2xl font-mono text-red-400">{formatTime(elapsed)}</p>
          <p className="text-sm text-slate-400 mt-1">녹음 중... 탭하여 중지</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">탭하여 녹음 시작</p>
      )}
    </div>
  );
}
