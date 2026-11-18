import React, { useState } from 'react';
import { X, Calendar, Save, DollarSign } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

interface PaydayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaydayModal: React.FC<PaydayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addPayday } = usePayday();

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [estimatedAmount, setEstimatedAmount] = useState('1450');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(estimatedAmount);

    if (!date) {
      alert('Please select a valid payday date.');
      return;
    }

    addPayday({
      date,
      estimatedAmount: isNaN(amountVal) ? null : amountVal,
      isManual: true,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Add Custom Payday
              </h3>
              <p className="text-xs text-white/60">
                Manually schedule an upcoming paycheck
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Payday Date */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Payday Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Estimated Amount */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Estimated Check Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-white/40 font-medium text-sm">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="1450.00"
                value={estimatedAmount}
                onChange={e => setEstimatedAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              Leave blank if exact amount is unknown.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Label / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Mid-month check, Bonus deposit"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white font-semibold text-xs shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              Save Payday
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
