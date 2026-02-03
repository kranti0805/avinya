import { Clock, Cpu, UserCheck, CheckCircle } from 'lucide-react';

interface RequestTimelineProps {
  createdAt: string;
  reviewedAt: string | null;
  status: 'Pending' | 'Accepted' | 'Rejected';
  /** Optional: use dark mode classes */
  dark?: boolean;
}

/** Request lifecycle: Submitted → AI Processed → Manager Reviewed → Final Decision. */
export function RequestTimeline({ createdAt, reviewedAt, status, dark }: RequestTimelineProps) {
  const text = dark ? 'text-slate-300' : 'text-slate-600';
  const muted = dark ? 'text-slate-500' : 'text-slate-400';
  const dotDone = 'bg-indigo-500';
  const dotPending = dark ? 'bg-slate-600' : 'bg-slate-300';

  const reviewed = !!reviewedAt;
  const decided = status !== 'Pending';

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center pt-0.5">
        <div className={`w-3 h-3 rounded-full ${dotDone}`} title="Submitted" />
        <div className="w-0.5 flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600" />
        <div className={`w-3 h-3 rounded-full ${dotDone}`} title="AI processed" />
        <div className="w-0.5 flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600" />
        <div className={`w-3 h-3 rounded-full ${reviewed ? dotDone : dotPending}`} title="Manager reviewed" />
        <div className="w-0.5 flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-600" />
        <div className={`w-3 h-3 rounded-full ${decided ? dotDone : dotPending}`} title="Final decision" />
      </div>
      <div className="flex-1 space-y-1 pb-1">
        <div>
          <p className={`text-xs font-medium ${text}`}>Submitted</p>
          <p className={`text-xs ${muted}`}>{new Date(createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className={`text-xs font-medium ${text}`}>AI processed</p>
          <p className={`text-xs ${muted}`}>Category & priority assigned</p>
        </div>
        <div>
          <p className={`text-xs font-medium ${text}`}>Manager reviewed</p>
          <p className={`text-xs ${muted}`}>
            {reviewedAt ? new Date(reviewedAt).toLocaleString() : 'Pending'}
          </p>
        </div>
        <div>
          <p className={`text-xs font-medium ${text}`}>Final decision</p>
          <p className={`text-xs ${muted}`}>{status}</p>
        </div>
      </div>
    </div>
  );
}
