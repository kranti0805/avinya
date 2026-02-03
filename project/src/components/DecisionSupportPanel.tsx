import type { AIInsights } from '../lib/firebase';
import { ThumbsUp, AlertTriangle, ArrowUpCircle, Briefcase } from 'lucide-react';

interface DecisionSupportPanelProps {
  insights: AIInsights | null | undefined;
  /** Optional: use dark mode classes */
  dark?: boolean;
}

/** Decision support for managers: suggested action, risk level, business impact. AI assists, does not auto-decide. */
export function DecisionSupportPanel({ insights, dark }: DecisionSupportPanelProps) {
  const bg = dark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200';
  const text = dark ? 'text-slate-200' : 'text-slate-700';
  const label = dark ? 'text-slate-300' : 'text-slate-600';

  const action = insights?.suggested_action || 'Review';
  const risk = insights?.risk_level || 'Low';
  const impact = insights?.business_impact || 'Review request for impact.';

  const actionIcon =
    action === 'Approve' ? ThumbsUp : action === 'Escalate' ? ArrowUpCircle : AlertTriangle;
  const ActionIcon = actionIcon;

  const riskColor =
    risk === 'High'
      ? 'text-red-600 dark:text-red-400'
      : risk === 'Medium'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-indigo-500" />
        <span className={`text-sm font-semibold ${label}`}>Decision support</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <ActionIcon className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className={label}>Suggested action:</span>
          <span className={`font-semibold ${text}`}>{action}</span>
        </div>
        <div>
          <span className={label}>Risk level: </span>
          <span className={`font-medium ${riskColor}`}>{risk}</span>
        </div>
        <div>
          <p className={`font-medium ${label}`}>Business impact</p>
          <p className={text}>{impact}</p>
        </div>
      </div>
    </div>
  );
}
