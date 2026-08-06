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
    <div className="space-y-6 pb-32 max-w-2xl mx-auto">
      
      {/* 1. Live Expense Tracker Card */}
      <div className="p-6 rounded-[24px] bg-[#121212] border border-[#2A2A2A] shadow-md space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[16px] bg-[#1E1B4B]/80 border border-[#3730A3]/30 text-[#A78BFA] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-[#A78BFA]" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight leading-none">
            Live Expense Tracker
          </h1>
        </div>
        
        <p className="text-sm text-zinc-400 leading-relaxed">
          Log daily purchases and out-of-pocket spending deducted straight from your paycheck left over balance.
        </p>

        <button
          onClick={onOpenExpenseModal}
          className="w-full h-[56px] flex items-center justify-center gap-2 rounded-[16px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-[15px] shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* 3 Stat Cards Stacked */}
      <div className="space-y-4">
        
        {/* Card 1: Spent This Check */}
        <div className="p-5 rounded-[20px] bg-[#121212] border border-[#2A2A2A] flex items-center justify-between">
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
        <div className="p-5 rounded-[20px] bg-[#121212] border border-[#2A2A2A] flex items-center justify-between">
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
        <div className="p-5 rounded-[20px] bg-[#121212] border border-[#2A2A2A] flex items-center justify-between">
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
      <div className="p-4 rounded-[24px] bg-[#121212] border border-[#2A2A2A] space-y-4">
        {/* Search bar */}
        <div className="relative w-full h-11 bg-[#1E1E1E] rounded-xl flex items-center px-3.5">
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            type="text"
            placeholder="Search merchant, gas, coffee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent pl-3 text-sm text-white focus:outline-none placeholder:text-white/30"
          />
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-5 h-5 text-[#A78BFA]" />
            <span className="text-xs font-semibold text-white/60">Paycheck Filter:</span>
          </div>
          
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedPaydayFilter}
              onChange={e => setSelectedPaydayFilter(e.target.value)}
              className="w-full appearance-none bg-[#1E1E1E] text-white text-xs font-bold py-2.5 pl-4 pr-10 rounded-full focus:outline-none cursor-pointer border border-transparent hover:border-[#2A2A2A] transition-colors"
            >
              <option value="CURRENT">
                Current Check ({currentPaydayDate ? formatDate(currentPaydayDate, 'short') : '8/15'})
              </option>
              <option value="ALL">
                All Paychecks
              </option>
              {summaries.map(s => (
                <option key={s.payday.date} value={s.payday.date}>
                  Check on {formatDate(s.payday.date, 'medium')}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Running Expenses Card */}
      <div className="p-6 rounded-[24px] bg-[#121212] border border-[#2A2A2A] space-y-4">
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
