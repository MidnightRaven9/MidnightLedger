import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Save } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { ExtraExpense } from '../types';
import { formatDate, toISODateString } from '../utils/dateUtils';
import { getPaydayForDate } from '../utils/paydayLogic';
import { CustomCategoryModal } from './CustomCategoryModal';
import { suggestEmoji, getCategoryEmoji } from '../utils/emojis';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPaydayDate?: string;
  expenseToEdit?: ExtraExpense | null;
}

const PRESET_CATEGORIES = [
  { label: '⛽ Gas', cat: 'Gas', desc: 'Gas' },
  { label: '🛒 Groceries', cat: 'Groceries', desc: 'Groceries' },
  { label: '🍔 Food/Drinks', cat: 'Food/Drinks', desc: 'Dining' },
  { label: '🛍️ Shopping', cat: 'Shopping', desc: 'Shopping' },
  { label: '🎉 Fun', cat: 'Fun', desc: 'Entertainment' },
  { label: '📄 Bills', cat: 'Bills', desc: 'Bill / One-Time' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultPaydayDate,
  expenseToEdit,
}) => {
  const { summaries, addExtraExpense, updateExtraExpense, customExpenseCategories, addCustomExpenseCategory } = usePayday();
  const todayStr = toISODateString(new Date());

  const [description, setDescription] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [paydayDate, setPaydayDate] = useState('');
  const [category, setCategory] = useState('Gas');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debit' | 'Credit'>('Debit');
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);

  // Auto-assign payday date whenever transaction date changes
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setCustomEmoji(expenseToEdit.emoji || getCategoryEmoji(expenseToEdit.category || 'Other'));
        setAmount(expenseToEdit.amount.toString());
        setCategory(expenseToEdit.category || 'Other');
        setDate(expenseToEdit.date || todayStr);
        setPaydayDate(expenseToEdit.paydayDate);
        setPaymentMethod((expenseToEdit.paymentMethod as any) || 'Debit');
      } else {
        setDescription('');
        setCustomEmoji('');
        setAmount('');
        setCategory('Gas');
        setDate(todayStr);
        setPaymentMethod('Debit');
        if (defaultPaydayDate) {
          setPaydayDate(defaultPaydayDate);
        } else if (summaries.length > 0) {
          const autoPayday = getPaydayForDate(todayStr, summaries);
          setPaydayDate(autoPayday || summaries[0].payday.date);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expenseToEdit, defaultPaydayDate]);

  // separate effect for date change auto payday matcher when not editing
  useEffect(() => {
    if (!expenseToEdit && summaries.length > 0 && !defaultPaydayDate && isOpen) {
        const autoPayday = getPaydayForDate(date, summaries);
        if (autoPayday) setPaydayDate(autoPayday);
    }
  }, [date]);

  if (!isOpen) return null;

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0 || !paydayDate) {
      alert('Please fill out a valid description, positive amount, and paycheck date.');
      return;
    }

    if (expenseToEdit) {
      updateExtraExpense({
        ...expenseToEdit,
        description: description.trim(),
        emoji: customEmoji || getCategoryEmoji(category),
        amount: numAmount,
        paydayDate,
        category,
        date: date || todayStr,
        paymentMethod,
      });
    } else {
      addExtraExpense({
        description: description.trim(),
        emoji: customEmoji || getCategoryEmoji(category),
        amount: numAmount,
        paydayDate,
        category,
        date: date || todayStr,
        paymentMethod,
      });
    }
    // Reset form
    setDescription('');
    setAmount('');
    setDate(todayStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full min-w-0 max-w-lg bg-[#121212] rounded-[24px] shadow-2xl border border-[#2A2A2A] overflow-hidden mx-2 sm:mx-auto max-h-[90vh] flex flex-col edit-expense-modal">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] bg-[#121212] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 modal-content scrollbar-hide w-full max-w-full overflow-x-hidden box-border">
          
          {/* Description & Emoji */}
          <div className="w-full min-w-0 max-w-full space-y-2 box-border">
            <label className="block text-[12px] font-bold text-white/80">
              Description / Merchant & Emoji <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2 w-full min-w-0 mt-2">
              <input
                type="text"
                value={customEmoji || getCategoryEmoji(category)}
                onChange={e => setCustomEmoji(e.target.value)}
                maxLength={2}
                title="Expense Emoji"
                className="w-[56px] h-[56px] min-w-[56px] shrink-0 rounded-2xl bg-[#1f1f1f] border border-zinc-700 text-center text-[28px] leading-none text-white focus:outline-none focus:border-purple-500 overflow-hidden box-border"
                style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
              />
              <input
                type="text"
                required
                placeholder="e.g. Walmart, Gas, Coffee"
                value={description}
                onChange={e => handleDescriptionChange(e.target.value)}
                className="flex-1 min-w-0 h-[56px] rounded-2xl bg-[#1f1f1f] border border-zinc-700 px-4 text-[16px] text-white truncate focus:outline-none focus:border-[#7C3AED] box-border"
              />
            </div>
          </div>

          {/* Quick Fill Row / CATEGORIES */}
          <div className="w-full min-w-0 max-w-full overflow-hidden border-y border-zinc-800/50 py-2.5 px-4 flex items-center gap-2 bg-[#181818] -mx-5 px-5" style={{ width: 'calc(100% + 40px)' }}>
            <span className="shrink-0 text-[11px] font-bold tracking-widest text-zinc-500">CATEGORIES:</span>
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide" style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-2 w-max pr-4 pointer-events-auto">
                {customExpenseCategories?.map((c, idx) => (
                  <button
                    key={'custom-' + idx}
                    type="button"
                    onClick={() => {
                      setCategory(c.name);
                      setCustomEmoji(c.emoji);
                    }}
                    className={`shrink-0 h-8 px-3 rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                      category === c.name 
                        ? 'bg-[#1C1736] text-[#A78BFA] border-[#7C3AED]' 
                        : 'bg-[#1f1f1f] border-zinc-800 text-[13px] text-white hover:border-[#7C3AED] hover:text-[#A78BFA]'
                    }`}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
                {PRESET_CATEGORIES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCategory(p.cat);
                      setCustomEmoji(getCategoryEmoji(p.cat));
                    }}
                    className={`shrink-0 h-8 px-3 rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                      category === p.cat 
                        ? 'bg-[#1C1736] text-[#A78BFA] border-[#7C3AED]' 
                        : 'bg-[#1f1f1f] border-zinc-800 text-[13px] text-white hover:border-[#7C3AED] hover:text-[#A78BFA]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryModalOpen(true)}
                  className="shrink-0 h-8 px-3 rounded-full border border-dashed border-[#7C3AED]/50 bg-transparent text-[#7C3AED] text-[13px] hover:bg-[#7C3AED]/10 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 font-semibold"
                >
                  ✨ Custom...
                </button>
              </div>
            </div>
          </div>

          {/* Amount Row */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Amount ($) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-white/40 font-bold text-base">$</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 h-[48px] rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-base font-bold focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {/* Date & Pay Period Row */}
          <div className="w-full min-w-0 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-white/80 whitespace-nowrap mb-1.5">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 h-[48px] rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-white/80 block">
                Pay Period <span className="text-rose-400">*</span>
              </label>
              <div className="relative w-full min-w-0 max-w-full mt-1.5">
                <select
                  required
                  value={paydayDate}
                  onChange={e => setPaydayDate(e.target.value)}
                  className="w-full min-w-0 max-w-full h-[48px] rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] px-4 pr-10 text-[14px] text-white truncate appearance-none focus:outline-none focus:border-[#7C3AED]"
                >
                  {summaries.map(s => (
                    <option key={s.payday.date} value={s.payday.date} className="bg-[#121212] text-white">
                      Paycheck on {formatDate(s.payday.date, 'medium')}
                    </option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">⌄</span>
              </div>
              <div className="flex justify-end pt-0.5">
                <span className="text-[11px] text-purple-400 truncate font-semibold">⚡ Auto-matched by date</span>
              </div>
            </div>
          </div>

          {/* Payment Method Optional Choice */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Payment Method (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Debit', 'Credit', 'Cash'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 h-[40px] rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-violet-900/30'
                      : 'bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-white/30 cursor-pointer hover:bg-[#2A2A2A]'
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[#1E1E1E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {expenseToEdit ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>

      {isCustomCategoryModalOpen && (
        <CustomCategoryModal
          isOpen={isCustomCategoryModalOpen}
          onClose={() => setIsCustomCategoryModalOpen(false)}
          onSave={(name, emoji) => {
            addCustomExpenseCategory({ name, emoji });
            setCategory(name);
          }}
        />
      )}
    </div>
  );
};
