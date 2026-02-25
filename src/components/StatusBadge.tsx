// 재직/퇴사/거래중 상태 뱃지
import type { PersonStatus } from '@/lib/types';

const statusColors: Record<PersonStatus, string> = {
  재직: 'bg-green-500/20 text-green-400',
  퇴사: 'bg-red-500/20 text-red-400',
  거래중: 'bg-blue-500/20 text-blue-400',
  거래종료: 'bg-slate-500/20 text-slate-400',
};

export default function StatusBadge({ status }: { status: PersonStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status]}`}>
      {status}
    </span>
  );
}
