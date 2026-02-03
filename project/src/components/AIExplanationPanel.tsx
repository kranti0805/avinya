import type { AIInsights } from '../lib/firebase';
import { HelpCircle, Tag, Zap, Percent } from 'lucide-react';

interface AIExplanationPanelProps {
  insights: AIInsights | null | undefined;
  category: string;
  priority: string;
  /** Optional: use dark mode classes */
  dark?: boolean;
}

/** Enterprise AI explainability: why category/priority, intent signals, confidence. Builds trust and transparency. */
export function AIExplanationPanel({ insights, category, priority, dark }: AIExplanationPanelProps) {
  const bg = dark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200';
  const text = dark ? 'text-slate-200' : 'text-slate-700';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
  const label = dark ? 'text-slate-300' : 'text-slate-600';

  if (!insights?.category_reason && !insights?.priority_reason && !insights?.intent_signals?.length) {
    return (
      <div className={`rounded-xl border p-4 ${bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span className={`text-sm font-semibold ${label}`}>AI classification</span>
        </div>
        <p className={`text-sm ${textMuted}`}>
          Category: <span className="font-medium text-slate-600 dark:text-slate-300">{category}</span>
          {' · '}
          Priority: <span className="font-medium text-slate-600 dark:text-slate-300">{priority}</span>
          {' — No explanation metadata for this request (legacy or fallback).'}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-indigo-500" />
        <span className={`text-sm font-semibold ${label}`}>AI explanation</span>

      </div>
      <div className="space-y-2 text-sm">
        <div>
          <p className={`font-medium ${label}`}>Why this category</p>
          <p className={text}>{insights.category_reason || 'Not provided.'}</p>
        </div>
        <div>
          <p className={`font-medium ${label}`}>Why this priority</p>
          <p className={text}>{insights.priority_reason || 'Not provided.'}</p>
        </div>
        {insights.intent_signals && insights.intent_signals.length > 0 && (
          <div>
            <p className={`font-medium flex items-center gap-1 ${label}`}>
              <Tag className="w-3.5 h-3.5" />
              Intent signals / keywords
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {insights.intent_signals.map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
