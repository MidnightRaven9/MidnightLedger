import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Save, Calendar, DollarSign, Tag, CreditCard } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, toISODateString } from '../utils/dateUtils';
import { getPaydayForDate } from '../utils/paydayLogic';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPaydayDate?: string;
}

const PRESET_MERCHANTS = [
  { label: '⛽ Gas', desc: 'Gas Station', cat: 'Gas' },
  { label: '🛒 Groceries', desc: 'Groceries', cat: 'Groceries' },
  { label: '☕ Coffee', desc: 'Coffee Shop', cat: 'Food/Drinks' },
  { label: '🍔 Dining', desc: 'Restaurants & Fast Food', cat: 'Food/Drinks' },
  { label: '🛍️ Shopping', desc: 'Walmart / Retail', cat: 'Shopping' },
  { label: '🎉 Fun', desc: 'Entertainment & Fun', cat: 'Fun' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultPaydayDate,
}) => {
  const { summaries, addExtraExpense } = usePayday();

  const todayStr = toISODateString(new Date());

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [paydayDate, setPaydayDate] = useState('');
  const [category, setCategory] = useState('Gas');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debit' | 'Credit'>('Debit');

  // Auto-assign payday date whenever transaction date changes
  useEffect(() => {
    if (defaultPaydayDate) {
      setPaydayDate(defaultPaydayDate);
    } else if (summaries.length > 0) {
      const autoPayday = getPaydayForDate(date, summaries);
      setPaydayDate(autoPayday || summaries[0].payday.date);
    }
  }, [date, defaultPaydayDate, summaries, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_MERCHANTS[0]) => {
    setDescription(preset.desc);
    setCategory(preset.cat);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!description.trim() || isNaN(numAmount) || numAmount <= 0 || !paydayDate) {
      alert('Please fill out a valid description, positive amount, and paycheck date.');
      return;
    }

    addExtraExpense({
      description: description.trim(),
      amount: numAmount,
      paydayDate,
      category,
      date: date || todayStr,
      paymentMethod,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setDate(todayStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full min-w-0 max-w-lg bg-[#121212] rounded-[24px] shadow-2xl border border-[#2A2A2A] overflow-hidden mx-2 sm:mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] bg-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Add Expense
              </h3>
              <p className="text-xs text-white/60">
                Log a fast purchase deducted directly from your paycheck left over balance
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

        {/* Quick Fill Row */}
        <div className="w-full min-w-0 max-w-full overflow-hidden border-y border-zinc-800/50 py-2.5 px-4 flex items-center gap-2 bg-[#181818]">
          <span className="shrink-0 text-[11px] font-bold tracking-widest text-zinc-500">QUICK FILL:</span>
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max pr-4">
              {PRESET_MERCHANTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="shrink-0 h-8 px-3 rounded-full bg-[#1f1f1f] border border-zinc-800 text-[13px] text-white hover:border-[#7C3AED] hover:text-[#A78BFA] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* Amount & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Amount ($) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-white/40 font-bold text-base">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="50.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-base font-bold focus:outline-none focus:border-[#7C3AED]"
                  autoFocus
                />
              </div>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Description / Merchant <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Gas, Walmart, Shell, Coffee"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="Gas" className="bg-[#121212]">⛽ Gas</option>
                <option value="Groceries" className="bg-[#121212]">🛒 Groceries</option>
                <option value="Food/Drinks" className="bg-[#121212]">🍔 Food / Drinks</option>
                <option value="Shopping" className="bg-[#121212]">🛍️ Shopping</option>
                <option value="Fun" className="bg-[#121212]">🎉 Fun & Entertainment</option>
                <option value="Bills" className="bg-[#121212]">📄 Bills / One-Time</option>
                <option value="Housing" className="bg-[#121212]">🏠 Housing</option>
                <option value="Utilities" className="bg-[#121212]">⚡ Utilities</option>
                <option value="Car" className="bg-[#121212]">🚗 Car / Auto</option>
                <option value="Insurance" className="bg-[#121212]">🛡️ Insurance</option>
                <option value="Phone & Internet" className="bg-[#121212]">📱 Phone & Internet</option>
                <option value="Subscriptions" className="bg-[#121212]">📺 Subscriptions</option>
                <option value="Other" className="bg-[#121212]">📦 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

          </div>

          {/* Pay Period Selection (Auto-Assigned) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 block">
              Pay Period <span className="text-rose-400">*</span>
            </label>
            <div className="relative w-full min-w-0 max-w-full">
              <select
                required
                value={paydayDate}
                onChange={e => setPaydayDate(e.target.value)}
                className="w-full min-w-0 max-w-full h-12 rounded-2xl bg-[#1a1a1a] border border-zinc-800 px-4 pr-10 text-[14px] text-white truncate appearance-none focus:outline-none focus:border-[#7C3AED]"
              >
                {summaries.map(s => (
                  <option key={s.payday.date} value={s.payday.date} className="bg-[#121212] text-white">
                    Paycheck on {formatDate(s.payday.date, 'medium')}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">⌄</span>
            </div>
            <div className="flex justify-end">
              <span className="text-[11px] text-purple-400 truncate">⚡ Auto-matched by date</span>
            </div>
          </div>

          {/* Payment Method Optional Choice */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Payment Method (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Debit', 'Credit', 'Cash'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-violet-900/30'
                      : 'bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-white/30'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Expense
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

