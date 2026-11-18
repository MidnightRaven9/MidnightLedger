import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

export const Toast: React.FC = () => {
  const { toastMessage } = usePayday();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] text-white font-extrabold text-xs shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
      <div className="w-6 h-6 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>
      <span>{toastMessage}</span>
    </div>
  );
};
