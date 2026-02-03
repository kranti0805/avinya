import type { Request } from '../lib/firebase';
import { BarChart3, Clock, Layers, AlertCircle } from 'lucide-react';

interface ManagerAnalyticsProps {
  requests: Request[];
  dark?: boolean;
}

/** Analytics: requests per category, priority distribution, average approval time, bottleneck indicators. */
export function ManagerAnalytics({ requests, dark }: ManagerAnalyticsProps) {
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let totalReviewTime = 0;
  let reviewedCount = 0;
  const pending = requests.filter((r) => r.status === 'Pending');
  const highPending = pending.filter((r) => r.priority === 'High').length;

  requests.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    if (r.reviewed_at && r.created_at) {
      reviewedCount++;
      totalReviewTime += new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime();
    }
  });

  const avgApprovalMs = reviewedCount > 0 ? totalReviewTime / reviewedCount : 0;
  const avgHours = Math.round(avgApprovalMs / (1000 * 60 * 60) * 10) / 10;

  const card = dark
    ? 'bg-slate-800/50 border-slate-600 text-slate-200'
    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-600 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold">Analytics</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <p className={`text-sm font-medium ${muted} mb-1`}>By category</p>
          <div className="space-y-1.5">
            {Object.entries(byCategory).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span>{k}</span>
                <span className="font-semibold">{v} requests</span>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>
        <div>
          <p className={`text-sm font-medium ${muted} mb-1`}>By priority</p>
          <div className="space-y-1.5">
            {['High', 'Medium', 'Low'].map((p) => (
              <div key={p} className="flex justify-between text-sm">
                <span>{p}</span>
                <span className="font-semibold">{byPriority[p] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className={`text-sm font-medium ${muted} mb-1`}>Avg. approval time</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold">{avgHours}h</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">From submit to decision</p>
        </div>
        <div>
          <p className={`text-sm font-medium ${muted} mb-1`}>Bottleneck indicator</p>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${highPending > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className="font-semibold">
              {highPending > 0 ? `${highPending} high-priority pending` : 'No high-priority backlog'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
