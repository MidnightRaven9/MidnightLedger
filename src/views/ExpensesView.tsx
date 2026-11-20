import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { Settings } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { DeleteExpenseModal } from '../components/DeleteExpenseModal';
import { 
  PlusCircle, 
  Trash2,
  Edit3,
  DollarSign,
  ShoppingBag,
  TrendingDown,
  Award
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { getCategoryEmoji } from '../utils/emojis';
import { tryCelebrate } from '../utils/celebrate';

interface ExpensesViewProps {
  onOpenExpenseModal: (paydayDate?: string, expenseToEdit?: any) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenExpenseModal,
}) => {
  const { extraExpenses, deleteExtraExpense, nextPaydaySummary, summaries } = usePayday();
  const [search, setSearch] = useState('');
  const [selectedPaydayFilter, setSelectedPaydayFilter] = useState<string>('CURRENT');
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);

  const currentPaydayDate = nextPaydaySummary?.payday.date || (summaries[0]?.payday.date || '');

  const exps = extraExpenses.filter(e => e.paydayDate === currentPaydayDate);
  const allPaidNow = exps.length > 0 && exps.every((e: any) => e.isPaid);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const prevExpensesAllPaidRef = useRef<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prevExpensesAllPaidRef.current === null) {
      prevExpensesAllPaidRef.current = allPaidNow;
      return;
    }
    const newPrev = tryCelebrate('expenses_' + currentPaydayDate, allPaidNow, prevExpensesAllPaidRef.current, isInitialLoad);
    prevExpensesAllPaidRef.current = newPrev;
  }, [allPaidNow, isInitialLoad, currentPaydayDate]);

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
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[var(--bg)] text-white p-3 sm:p-6 pb-28 space-y-5">
      <ManageCategoriesModal 
        isOpen={isManageCategoriesModalOpen} 
        onClose={() => setIsManageCategoriesModalOpen(false)} 
      />
      
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[var(--surface)] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-7 h-7 text-[var(--accent)]" />
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
          onClick={() => onOpenExpenseModal()}
          className="w-full h-[56px] flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white font-bold text-[16px] mt-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="space-y-5">
        
        <div className="rounded-[24px] border border-zinc-800/50 bg-[var(--surface)] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Spent This Check
            </span>
            <div className="text-3xl font-extrabold text-[#FF6B7A] leading-none">
              {formatCurrency(spentThisCheck)}
            </div>
            <span className="text-[11px] text-white/40 block">
              Paycheck {currentPaydayDate ? formatDate(currentPaydayDate, 'medium') : 'Unassigned'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#2D161B] border border-[#4C1C24] text-[#FF6B7A] flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800/50 bg-[var(--surface)] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Spent This Month
            </span>
            <div className="text-3xl font-extrabold text-[var(--accent)] leading-none">
              {formatCurrency(spentThisMonth)}
            </div>
            <span className="text-[11px] text-white/40 block">
              All transactions in {now.toLocaleDateString('en-US', { month: 'long' })}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#1C1736] border border-[#3C2456] text-[var(--accent)] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800/50 bg-[var(--surface)] p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-white/50 block">
              Biggest Expense
            </span>
            <div className="text-3xl font-extrabold text-[var(--accent)] leading-none">
              {biggestExpenseObj ? formatCurrency(biggestExpenseObj.amount) : '$0.00'}
            </div>
            <span className="text-[11px] text-white/40 block truncate max-w-[220px]">
              {biggestExpenseObj ? biggestExpenseObj.description : 'No expenses logged yet'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-[16px] bg-[#1C1736] border border-[#3C2456] text-2xl flex items-center justify-center shrink-0">
            {biggestExpenseObj ? getCategoryEmoji(biggestExpenseObj.category) : <Award className="w-6 h-6 text-[var(--accent)]" />}
          </div>
        </div>

      </div>

      <div className="w-full min-w-0 max-w-full px-4 py-3.5 bg-[var(--surface-2)] rounded-[24px] border border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, gas, coffee..."
            className="w-full min-w-0 h-11 rounded-2xl bg-[var(--surface-2)] border border-zinc-800 pl-10 pr-4 text-[14px] text-white placeholder-zinc-500 truncate focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            onClick={() => setIsManageCategoriesModalOpen(true)}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl bg-[var(--surface-2)] border border-zinc-800 text-zinc-400 hover:text-white hover:border-[var(--accent)] transition-colors"
            title="Manage Categories"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-hidden">
          <span className="shrink-0 text-[12px] font-bold text-zinc-400 whitespace-nowrap">
            <span className="text-[var(--accent)]">▽</span> Filter:
          </span>
          <div className="flex-1 min-w-0 max-w-full relative">
            <select
              value={selectedPaydayFilter}
              onChange={e => setSelectedPaydayFilter(e.target.value)}
              className="w-full min-w-0 max-w-full h-9 rounded-full bg-[var(--surface-2)] border border-zinc-800 pl-3 pr-8 text-[13px] font-bold text-white truncate appearance-none focus:outline-none cursor-pointer"
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

      <div className="rounded-[24px] border border-zinc-800/50 bg-[var(--surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E1B4B]/80 border border-[#3730A3]/30 text-[var(--accent)] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4.5 h-4.5 text-[var(--accent)]" />
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
          <div className="p-10 rounded-[16px] bg-[var(--surface-2)] border border-dashed border-[var(--border)] text-center text-white/50 space-y-3">
            <p className="text-sm">No expenses logged yet.</p>
            <button
              onClick={() => onOpenExpenseModal()}
              className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg hover:bg-[var(--accent-press)] transition-all cursor-pointer"
            >
              + Add Expense
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map(exp => {
              const paycheckShortStr = formatDate(exp.paydayDate, 'short') || 'Unassigned';

              return (
                <div 
                  key={exp.id}
                  onClick={() => onOpenExpenseModal(exp.paydayDate, exp)}
                  className="p-5 rounded-[16px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]/40 space-y-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)]/60 flex items-center justify-center text-xl shrink-0 mt-0.5">
                      {getCategoryEmoji(exp.category)}
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

                  <hr className="border-[var(--border)]" />

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="text-2xl font-black text-[#FF6B7A]">
                      -{formatCurrency(exp.amount)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenExpenseModal(exp.paydayDate, exp); }}
                        className="p-2 rounded-xl text-white/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                        title="Edit expense"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpenseToDelete(exp);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-white/40 hover:text-[#FF6B7A] hover:bg-[#2D161B] transition-colors cursor-pointer"
                          title="Delete expense"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
            </div>

      <DeleteExpenseModal 
        isOpen={isDeleteModalOpen}
        expense={expenseToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTimeout(() => setExpenseToDelete(null), 200); // slight delay for animation
        }}
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExtraExpense(expenseToDelete.id);
            setIsDeleteModalOpen(false);
            setTimeout(() => setExpenseToDelete(null), 200);
          }
        }}
      />
    </div>
  );
};
