import React from 'react';
import { CheckCircle2, Info, TrendingDown, X } from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useTerminal();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const accent =
          toast.variant === 'up'
            ? 'text-[#089981]'
            : toast.variant === 'down'
              ? 'text-[#F23645]'
              : 'text-[#2962FF]';

        return (
          <div
            key={toast.id}
            className="terminal-popover pointer-events-auto rounded px-3 py-2.5 flex items-start gap-2.5"
          >
            <div className={`mt-0.5 shrink-0 ${accent}`}>
              {toast.variant === 'up' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : toast.variant === 'down' ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-[#F0F3FA] leading-tight">
                {toast.title}
              </div>
              <div className="font-num text-[11px] text-[#787B86] mt-0.5 break-words">
                {toast.description}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[#787B86] hover:text-[#F0F3FA] shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
