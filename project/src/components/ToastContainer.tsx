import { useToast } from '../contexts/ToastContext';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100',
  error: 'bg-red-50 border-red-200 text-red-800 shadow-red-100',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 shadow-amber-100',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-indigo-100',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-in-right ${styles[t.type]}`}
            role="alert"
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.title}</p>
              {t.message && <p className="text-sm opacity-90 mt-0.5">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-black/10 transition"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
