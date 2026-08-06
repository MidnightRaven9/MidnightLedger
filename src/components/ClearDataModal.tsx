import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess?: () => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
}) => {
  const { clearAllData } = usePayday();
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'WIPE';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    clearAllData();
    if (onConfirmSuccess) onConfirmSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#121212] rounded-3xl shadow-2xl border border-rose-900/60 overflow-hidden p-6 text-white space-y-5"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Top Header & Close Icon */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1010] border border-rose-800/80 text-rose-400 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-extrabold text-[#F87171] mb-2">
            Factory Reset - Wipe All App Data?
          </h3>
          <p className="text-xs text-white/70 leading-relaxed mb-4">
            This will permanently wipe <strong className="text-rose-300">ALL data</strong> in MidnightLedger — including all bills, paydays, extra expenses, extra income, payment history, and settings. You will start at 0 so you can share a clean app.
          </p>

          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-1.5">
                Type <span className="text-white underline">WIPE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="Type WIPE here"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#1A1010] border border-rose-900/80 focus:border-rose-500 text-white font-mono font-bold text-sm focus:outline-none placeholder:text-white/20"
                autoFocus
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white/80 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isConfirmed}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                  isConfirmed
                    ? 'bg-[#7F1D1D] hover:bg-rose-900 text-rose-100 border border-rose-600 shadow-rose-950/80'
                    : 'bg-[#1E1E1E] text-white/30 border border-[#2A2A2A] cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Factory Reset
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
