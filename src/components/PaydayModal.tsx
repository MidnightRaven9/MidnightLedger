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
      <div className="w-full max-w-md bg-[#121212] rounded-3xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A] bg-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold">
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
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[#1E1E1E] transition-colors"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
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
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[#1E1E1E] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-lg shadow-violet-900/30 transition-all"
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
