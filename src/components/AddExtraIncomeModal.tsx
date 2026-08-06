import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, Coins, Sparkles } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { toISODateString, formatDate, formatCurrency } from '../utils/dateUtils';

interface AddExtraIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPaydayDate?: string;
}

export const AddExtraIncomeModal: React.FC<AddExtraIncomeModalProps> = ({
  isOpen,
  onClose,
  initialPaydayDate,
}) => {
  const { summaries, addExtraIncome } = usePayday();

  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [dateAdded, setDateAdded] = useState<string>(toISODateString(new Date()));
  const [targetPaydayDate, setTargetPaydayDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSource('');
      setDateAdded(toISODateString(new Date()));
      setError(null);

      // Default target payday date
      if (initialPaydayDate) {
        setTargetPaydayDate(initialPaydayDate);
      } else if (summaries.length > 0) {
        const todayStr = toISODateString(new Date());
        const upcoming = summaries.find(s => s.payday.date >= todayStr);
        setTargetPaydayDate(upcoming ? upcoming.payday.date : summaries[0].payday.date);
      }
    }
  }, [isOpen, initialPaydayDate, summaries]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive dollar amount.');
      return;
    }

    const trimmedSource = source.trim();
    if (trimmedSource.length < 2 || trimmedSource.length > 50) {
      setError('Source description must be between 2 and 50 characters (e.g. Sold PS5, Tips).');
      return;
    }

    if (!targetPaydayDate) {
      setError('Please select a target pay period.');
      return;
    }

    addExtraIncome({
      amount: parsedAmount,
      source: trimmedSource,
      dateAdded: dateAdded || toISODateString(new Date()),
      paydayDate: targetPaydayDate,
    });

    onClose();
  };

  const parsedNumber = parseFloat(amount);
  const displayBtnAmount = !isNaN(parsedNumber) && parsedNumber > 0 ? formatCurrency(parsedNumber) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#121212] border border-[#7C3AED]/40 p-6 sm:p-7 text-white shadow-2xl shadow-violet-950/50 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow background accent */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold shadow-md">
              <Coins className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Add Extra Money to Pay Period
              </h2>
              <p className="text-xs text-white/60">
                Cash, item sales, or tips added to your available total
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Amount Received ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-[#A78BFA] font-bold text-base">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] text-white font-bold text-lg focus:outline-none transition-all placeholder:text-white/20"
                autoFocus
              />
            </div>
          </div>

          {/* Source Description */}
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Source / Description
            </label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={source}
                onChange={e => {
                  setSource(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ex: Friend paid me back, Sold PS5, Tips"
                maxLength={50}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] text-white text-sm focus:outline-none transition-all placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Date Added & Target Pay Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Date Received
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="date"
                  value={dateAdded}
                  onChange={e => setDateAdded(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] focus:border-[#7C3AED] text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Apply to Payday
              </label>
              <select
                value={targetPaydayDate}
                onChange={e => setTargetPaydayDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] focus:border-[#7C3AED] text-white text-xs focus:outline-none"
              >
                {summaries.map(s => (
                  <option key={s.payday.date} value={s.payday.date}>
                    {formatDate(s.payday.date, 'short')} ({s.payday.notes || 'Payday'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#2A2A2A] mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-[#1E1E1E] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-violet-900/40 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#DDD6FE]" />
              {displayBtnAmount ? `Add ${displayBtnAmount} to Period` : 'Add Extra Cash'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
