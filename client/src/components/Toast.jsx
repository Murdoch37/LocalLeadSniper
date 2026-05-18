import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-indigo-400" />,
};

export function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl animate-slide-in"
        >
          <span className="mt-0.5 shrink-0">{icons[t.type] || icons.info}</span>
          <span className="text-sm text-zinc-200 flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-zinc-500 hover:text-zinc-300 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
