// 처리 작업 상태 관리 (Vercel Blob 기반)
import { put, head } from '@vercel/blob';

export interface JobResult {
  success: boolean;
  summary: string;
  keyPoints: string;
  emotion: string;
  caution: string;
  actionItems: string;
  nextQuestions: string;
  notionUrl: string;
}

export interface JobStatus {
  id: string;
  personName: string;
  status: 'stt' | 'analyzing' | 'saving' | 'done' | 'error';
  step: string;
  error?: string;
  result?: JobResult;
  createdAt: string;
  updatedAt: string;
}

const JOB_PREFIX = 'jobs/';

function jobPath(jobId: string): string {
  return `${JOB_PREFIX}${jobId}.json`;
}

/**
 * 작업 상태 업데이트 (Blob에 JSON 저장)
 */
export async function updateJobStatus(
  jobId: string,
  update: Partial<Omit<JobStatus, 'id' | 'createdAt'>>
): Promise<void> {
  let current: JobStatus | null = null;
  try {
    current = await getJobStatus(jobId);
  } catch {}

  const now = new Date().toISOString();
  const status: JobStatus = current
    ? { ...current, ...update, updatedAt: now }
    : {
        id: jobId,
        personName: update.personName || '',
        status: update.status || 'stt',
        step: update.step || '',
        createdAt: now,
        updatedAt: now,
        ...update,
      };

  await put(jobPath(jobId), JSON.stringify(status), {
    access: 'public',
    addRandomSuffix: false,
  });
}

/**
 * 작업 상태 조회
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  try {
    const blobInfo = await head(jobPath(jobId));
    if (!blobInfo?.url) return null;

    const res = await fetch(blobInfo.url);
    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}
