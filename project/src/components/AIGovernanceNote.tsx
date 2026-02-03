import { Shield, User, Eye } from 'lucide-react';

interface AIGovernanceNoteProps {
  /** Optional: compact variant for sidebar/footer */
  compact?: boolean;
  dark?: boolean;
}

/** AI governance: transparency, human override, fairness. Enterprise trust. */
export function AIGovernanceNote({ compact, dark }: AIGovernanceNoteProps) {
  const bg = dark ? 'bg-slate-800/50 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600';
  const title = dark ? 'text-slate-200' : 'text-slate-800';

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 text-xs ${bg}`}>
        <div className="flex items-center gap-2 font-semibold mb-1">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span className={title}>AI governance</span>
        </div>
        <p>AI assists decisions; humans have full override. Built for transparency and fairness.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-indigo-500" />
        <span className={`font-semibold ${title}`}>AI governance & transparency</span>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <Eye className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
          <span>AI provides explanations and suggestions; it does not replace human judgment.</span>
        </li>
        <li className="flex items-start gap-2">
          <User className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
          <span>Managers always have final say. Override or ignore AI recommendations at any time.</span>
        </li>
        <li className="flex items-start gap-2">
          <Shield className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
          <span>We prioritize transparency and fairness in automated workflow support.</span>
        </li>
      </ul>
    </div>
  );
}
