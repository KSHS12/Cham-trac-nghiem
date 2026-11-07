import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  subInfo?: string;
}

interface SuccessToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl p-4 shadow-xl border flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/50 backdrop-blur-md'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-100 border-rose-500/50 backdrop-blur-md'
              : 'bg-slate-900/95 text-slate-100 border-slate-700 backdrop-blur-md'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
          </div>

          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-white leading-tight">{toast.title}</h4>
            <p className="mt-0.5 opacity-90 leading-snug">{toast.message}</p>
            {toast.subInfo && (
              <p className="mt-1 text-xs opacity-75 font-mono bg-black/30 px-2 py-0.5 rounded w-fit">
                {toast.subInfo}
              </p>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
