import React, { useState } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Search, 
  DollarSign, 
  ShoppingBag,
  TrendingDown,
  Award,
  Filter
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, formatCurrency } from '../utils/dateUtils';

interface ExpensesViewProps {
  onOpenExpenseModal: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenExpenseModal,
}) => {
  const { extraExpenses, deleteExtraExpense, nextPaydaySummary, summaries } = usePayday();
  const [search, setSearch] = useState('');
  const [selectedPaydayFilter, setSelectedPaydayFilter] = useState<string>('CURRENT');

  const currentPaydayDate = nextPaydaySummary?.payday.date || (summaries[0]?.payday.date || '');

  // Calculate metrics
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const spentThisCheck = extraExpenses
    .filter(e => e.paydayDate === currentPaydayDate)
    .reduce((sum, e) => sum + e.amount, 0);

  const spentThisMonth = extraExpenses
    .filter(e => {
      const d = e.date || e.paydayDate || e.createdAt;
      return d?.startsWith(currentMonthPrefix);
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const biggestExpenseObj = extraExpenses.length > 0
    ? [...extraExpenses].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Filter expenses list
  const filteredExpenses = extraExpenses
    .filter(e => {
      if (selectedPaydayFilter !== 'ALL') {
        const targetPayday = selectedPaydayFilter === 'CURRENT' ? currentPaydayDate : selectedPaydayFilter;
        if (e.paydayDate !== targetPayday) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.paydayDate.includes(q) ||
        (e.date && e.date.includes(q))
      );
    })
    .sort((a, b) => {
      const dateA = a.date || a.createdAt || a.paydayDate;
      const dateB = b.date || b.createdAt || b.paydayDate;
      return dateB.localeCompare(dateA);
    });

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white p-3 sm:p-6 pb-28 space-y-5">
      
      {/* 1. Live Expense Tracker Hero Card */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[#121212] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-7 h-7 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-[30px] leading-[1.1] font-black tracking-tight text-white">
              Live Expense Tracker
            </h1>
            <p className="text-[15px] leading-6 text-zinc-400 mt-3 max-w-[90%]">
              Log daily purchases and out-of-pocket spending deducted straight from your paycheck left over balance.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenExpenseModal}
          className="w-full h-[56px] flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[16px] mt-2 shadow-[0_8px_20px_rgba(124,58,237,0.3)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* 3 Stat Cards Stacked */}
      <div className="space-y-5">
        
        {/* Card 1: Spent This Check */}
        <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Spent This Check
            </span>
            <div className="text-3xl font-extrabold text-[#FF6B7A] leading-none">
              {formatCurrency(spentThisCheck)}
            </div>
            <span className="text-[11px] text-white/40 block">
              Paycheck {currentPaydayDate ? formatDate(currentPaydayDate, 'medium') : 'Aug 15, 2026'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#2D161B] border border-[#4C1C24] text-[#FF6B7A] flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Spent This Month */}
        <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Spent This Month
            </span>
            <div className="text-3xl font-extrabold text-[#A78BFA] leading-none">
              {formatCurrency(spentThisMonth)}
            </div>
            <span className="text-[11px] text-white/40 block">
              All transactions in {now.toLocaleDateString('en-US', { month: 'long' })}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#1C1736] border border-[#3C2456] text-[#A78BFA] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Biggest Expense */}
        <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Biggest Expense
            </span>
            <div className="text-3xl font-extrabold text-[#A78BFA] leading-none">
              {biggestExpenseObj ? formatCurrency(biggestExpenseObj.amount) : '$80.00'}
            </div>
            <span className="text-[11px] text-white/40 block truncate max-w-[220px]">
              {biggestExpenseObj ? biggestExpenseObj.description : 'Groceries & Household Supplies'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#1C1736] border border-[#3C2456] text-[#A78BFA] flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Search & Filter Card */}
      <div className="w-full min-w-0 max-w-full px-4 py-3.5 bg-[#111111] rounded-[24px] border border-zinc-800/50 space-y-2.5">
        {/* Search */}
        <div className="relative w-full min-w-0 max-w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, gas, coffee..."
            className="w-full min-w-0 h-11 rounded-2xl bg-[#1e1e1e] border border-zinc-800 pl-10 pr-4 text-[14px] text-white placeholder-zinc-500 truncate focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Paycheck Filter */}
        <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-hidden">
          <span className="shrink-0 text-[12px] font-bold text-zinc-400 whitespace-nowrap">
            <span className="text-purple-500">▽</span> Filter:
          </span>
          <div className="flex-1 min-w-0 max-w-full relative">
            <select
              value={selectedPaydayFilter}
              onChange={e => setSelectedPaydayFilter(e.target.value)}
              className="w-full min-w-0 max-w-full h-9 rounded-full bg-[#1e1e1e] border border-zinc-800 pl-3 pr-8 text-[13px] font-bold text-white truncate appearance-none focus:outline-none cursor-pointer"
            >
              <option value="CURRENT">Current Check</option>
              <option value="ALL">All Checks</option>
              {summaries.map(s => (
                <option key={s.payday.date} value={s.payday.date}>
                  Check ({formatDate(s.payday.date, 'short')})
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-[12px]">⌄</span>
          </div>
        </div>
        {selectedPaydayFilter === 'CURRENT' && currentPaydayDate && (
          <p className="text-[11px] text-zinc-500 px-1 pt-0.5 truncate">
            Showing check: {formatDate(currentPaydayDate, 'medium')}
          </p>
        )}
      </div>

      {/* Running Expenses Card */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E1B4B]/80 border border-[#3730A3]/30 text-[#A78BFA] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4.5 h-4.5 text-[#A78BFA]" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Running Expenses ({filteredExpenses.length})
            </h3>
          </div>
          <span className="text-xs text-white/40">
            Sorted newest first
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 rounded-[16px] bg-[#1A1A1A] border border-dashed border-[#2A2A2A] text-center text-white/50 space-y-3">
            <p className="text-sm">No expenses logged yet.</p>
            <button
              onClick={onOpenExpenseModal}
              className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-lg hover:bg-[#6D28D9] transition-all cursor-pointer"
            >
              + Add Expense
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map(exp => {
              const parts = exp.paydayDate.split('-');
              const paycheckShortStr = parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : '8/15';

              return (
                <div 
                  key={exp.id}
                  className="p-5 rounded-[16px] bg-[#1A1A1A] border border-[#2A2A2A]/40 space-y-4"
                >
                  {/* Top: Icon & Merchant info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#121212] border border-[#2A2A2A]/60 flex items-center justify-center text-[#FF6B7A] shrink-0 mt-0.5">
                      <DollarSign className="w-6 h-6 text-[#FF6B7A]" />
                    </div>

                    <div className="space-y-2 flex-1">
                      <h4 className="text-base font-extrabold text-white leading-tight">
                        {exp.description}
                      </h4>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {exp.category && (
                          <span className="text-[11px] font-semibold text-white px-3 py-0.5 rounded-full border border-white/60">
                            {exp.category}
                          </span>
                        )}
                        <span className="text-xs text-white/50">
                          • Paycheck: {paycheckShortStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <hr className="border-[#2A2A2A]" />

                  {/* Bottom: Amount and Trash */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="text-2xl font-black text-[#FF6B7A]">
                      -{formatCurrency(exp.amount)}
                    </div>

                    <button
                      onClick={() => deleteExtraExpense(exp.id)}
                      className="p-2 rounded-xl text-white/40 hover:text-[#FF6B7A] hover:bg-[#2D161B] transition-colors cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
