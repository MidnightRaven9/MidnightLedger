import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

export const Toast: React.FC = () => {
  const { toastMessage, storageWarning, dismissStorageWarning } = usePayday();

  return (
    <>
      {storageWarning && (
        <div
          role="alert"
          className="fixed top-2 left-1/2 z-[9998] flex w-[calc(100%-16px)] max-w-lg -translate-x-1/2 items-start gap-2 rounded-xl border border-amber-500/60 bg-[var(--surface)] px-4 py-3 text-xs font-semibold text-[var(--text)] shadow-2xl"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="flex-1">{storageWarning}</span>
          <button
            type="button"
            onClick={dismissStorageWarning}
            aria-label="Dismiss storage warning"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 px-5 py-3 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] text-white font-extrabold text-xs shadow-2xl animate-in slide-in-from-bottom-5 duration-200 sm:bottom-6"
        >
          <div className="w-6 h-6 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
