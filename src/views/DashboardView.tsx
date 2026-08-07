import React, { useState } from 'react';
import { 
  Calendar, 
  Receipt, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Sparkles,
  PlusCircle,
  AlertCircle,
  Circle,
  DollarSign,
  Plus,
  Settings,
  TrendingUp,
  Award,
  Clock,
  Trash2,
  Edit3
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, formatCurrency, parseISODate } from '../utils/dateUtils';
import { getCategoryEmoji } from '../utils/emojis';
import { PaydaySummary } from '../types';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { getCategoryColor } from '../utils/categoryColors';
import { BillCard } from '../components/BillCard';

interface PaycheckCardProps {
  summaryItem: PaydaySummary;
  initialOpen?: boolean;
  onOpenBillModal: (billToEdit?: any) => void;
  onNavigateToTab: (tab: 'bills' | 'paydays' | 'expenses' | 'reports' | 'history') => void;
  toggleBillPaid: (billId: string, date: string) => void;
}

const PaycheckCard: React.FC<PaycheckCardProps> = ({
  summaryItem,
  initialOpen = false,
  onOpenBillModal,
  onNavigateToTab,
  toggleBillPaid,
}) => {
  const { markAllBillsPaidInPayday, unmarkAllBillsPaidInPayday } = usePayday();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const dateStr = summaryItem.payday.date;
  const hasAmt = summaryItem.estimatedCheck !== null;

  const parsedDate = parseISODate(dateStr);
  const monthAbbr = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(parsedDate.getDate());

  const availStr = hasAmt ? `${formatCurrency(summaryItem.totalAvailable).replace(/\.00$/, '')} avail` : 'Est: Not set';
  const billsTotalStr = formatCurrency(summaryItem.totalBills).replace(/\.00$/, '');
  const billsCount = summaryItem.assignedBills.length;
  const allPaid = billsCount > 0 && summaryItem.assignedBills.every(b => b.isPaid);

  return (
    <div 
      onClick={() => setIsOpen(!isOpen)} 
      className={`rounded-[20px] bg-[#121212] border border-white/10 p-4 mb-3 w-full cursor-pointer select-none shadow-md transition-all min-h-0 ${
        isOpen ? 'overflow-visible border-[#7C3AED]/50' : 'overflow-hidden hover:border-violet-500/40'
      }`}
    >
      <div className="flex gap-3 items-center justify-between w-full overflow-hidden leading-[1.4]">
        {/* Left badge = fixed 56px, don't shrink */}
        <div className="flex flex-col items-center justify-center bg-[#1E1438] border border-[#7C3AED]/30 rounded-2xl w-[56px] h-[56px] shrink-0 leading-[1.4]">
          <span className="text-[11px] text-[#B794F6] font-semibold uppercase tracking-wider leading-none mb-0.5">
            {monthAbbr}
          </span>
          <span className="text-[22px] text-white font-bold leading-none">
            {day}
          </span>
        </div>

        {/* Middle content = flex-1 min-w-0 */}
        <div className="flex-1 min-w-0 leading-[1.4]">
          {/* Title: shortened to Date e.g. "Aug 15, 2026" */}
          <div className="text-[15px] font-semibold text-white leading-tight truncate">
            {formatDate(dateStr, 'medium')}
          </div>
          {/* Subtitle: shortened and responsive */}
          <div className="text-[12px] text-white/50 leading-[1.3] mt-1 break-words line-clamp-2">
            {availStr} • {billsCount} bill{billsCount === 1 ? '' : 's'} ({billsTotalStr})
          </div>
        </div>

        {/* Right amount = fixed, text-right, shrink-0 */}
        <div className="text-right shrink-0 flex items-center gap-1.5 leading-[1.4]">
          <span className="text-[14px] text-[#B794F6] font-semibold leading-[1.4]">
            {hasAmt && summaryItem.leftOver !== null ? formatCurrency(summaryItem.leftOver) : 'TBD'}
          </span>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-200 overflow-visible min-h-0"
        >
          <div className="text-xs text-white/50 uppercase tracking-wide leading-[1.4] flex items-center justify-between">
            <span>Bills assigned to this check ({billsCount}):</span>
            {billsCount > 0 && (
              <span className="text-zinc-400 font-medium normal-case">
                {summaryItem.assignedBills.filter(b => b.isPaid).length} of {billsCount} paid
              </span>
            )}
          </div>

          {summaryItem.assignedBills.length === 0 ? (
            <div className="text-xs text-white/40 italic py-2 leading-[1.4]">
              No bills assigned to this paycheck.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-visible min-h-0">
              {summaryItem.assignedBills.map(assigned => {
                const bill = assigned.bill;
                const isPaid = assigned.isPaid;
                const isSplit = !!bill.isSplit;
                const myPortionStr = formatCurrency(assigned.effectiveAmount);
                const totalStr = formatCurrency(bill.fullTotal || bill.amount);
                const formattedDueDate = formatDate(assigned.dueFullDate, 'short');
                const billEmoji = bill.emoji || getCategoryEmoji(bill.category);

                return (
                  <div 
                    key={bill.id} 
                    id={`bill-${bill.id}`}
                    onClick={() => toggleBillPaid(bill.id, dateStr)}
                    className={`flex justify-between items-center rounded-2xl p-3 border cursor-pointer transition-all ${
                      isPaid ? 'paid-bill bg-purple-600/10 border-purple-600/30' : 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBillPaid(bill.id, dateStr);
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isPaid ? 'bg-purple-600 border-purple-600' : 'border-zinc-600 hover:border-zinc-400'
                        }`}
                        title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                      >
                        {isPaid && <span className="text-white text-xs font-bold">✓</span>}
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          <span className={`bill-name truncate ${isPaid ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {isPaid ? '💜 ' : `${billEmoji} `}{bill.name}
                          </span>
                        </div>
                        <div className="text-zinc-500 text-xs">Due {formattedDueDate}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className={`text-sm font-bold ${isPaid ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {isSplit ? `${myPortionStr} of ${totalStr}` : myPortionStr}
                      </div>
                      {isSplit ? (
                        <div className="text-[#B794F6] text-xs font-semibold">Split</div>
                      ) : (
                        <div className="text-[#A78BFA] text-xs font-semibold">Personal</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between pt-2 text-sm leading-[1.4]">
            <span className="text-white/60 leading-[1.4]">Total for this check:</span>
            <span className="text-white font-semibold leading-[1.4]">
              {formatCurrency(summaryItem.totalBills)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={() => onNavigateToTab('bills')}
              className="flex-1 bg-[#7C3AED] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#6D28D9] transition-colors leading-[1.4]"
            >
              Edit Bills
            </button>
            {allPaid ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  unmarkAllBillsPaidInPayday(dateStr);
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 leading-[1.4]"
              >
                ↩️ Unmark All
              </button>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  markAllBillsPaidInPayday(dateStr);
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 leading-[1.4]"
              >
                ✅ Mark All Paid
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface DashboardViewProps {
  onOpenBillModal: (billToEdit?: any) => void;
  onOpenExpenseModal: (paydayDate?: string) => void;
  onOpenIncomeModal: (paydayDate?: string) => void;
  onOpenScheduleModal: () => void;
  onOpenPaydayModal: () => void;
  onNavigateToTab: (tab: 'bills' | 'paydays' | 'expenses' | 'reports' | 'history') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenBillModal,
  onOpenExpenseModal,
  onOpenIncomeModal,
  onOpenScheduleModal,
  onOpenPaydayModal,
  onNavigateToTab,
}) => {
  const { 
    summaries, 
    nextPaydaySummary, 
    updatePayday, 
    toggleBillPaid, 
    deleteBillOccurrence, 
    deleteExtraExpense, 
    deleteExtraIncome, 
    setVariableOverride, 
    bills,
    viewMode
  } = usePayday();

  const activeSummary = nextPaydaySummary || summaries[0];

  // Initialize expanded dates so the active payday is expanded by default, and others are collapsed.
  const [expandedTimelineDates, setExpandedTimelineDates] = useState<Record<string, boolean>>(() => {
    return activeSummary ? { [activeSummary.payday.date]: true } : {};
  });

  // Hero Edit Est Check state
  const [isEditingEstCheck, setIsEditingEstCheck] = useState(false);
  const [tempEstCheck, setTempEstCheck] = useState('');

  if (!nextPaydaySummary && summaries.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#121212] border border-[#2A2A2A] text-center space-y-4 shadow-md pb-32">
        <div className="w-12 h-12 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No pay schedule set</h3>
          <p className="text-xs text-white/60 mt-1">Configure your schedule or add a payday to get started.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onOpenScheduleModal}
            className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-all cursor-pointer"
          >
            Configure Schedule
          </button>
          <button
            onClick={onOpenPaydayModal}
            className="px-4 py-2 rounded-xl bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white font-semibold text-xs border border-[#2A2A2A] transition-all cursor-pointer"
          >
            + Add Payday
          </button>
        </div>
      </div>
    );
  }

  if (!activeSummary) return null;

  const {
    payday,
    nextPaydayDate,
    assignedBills,
    extraExpenses,
    extraIncomes = [],
    totalBills,
    totalExtraExpenses,
    totalExtraIncome = 0,
    totalOutflow,
    estimatedCheck,
    totalAvailable,
    leftOver,
    status
  } = activeSummary;

  const displayTotalBills = viewMode === 'myShare'
    ? totalBills
    : assignedBills.reduce((sum, item) => {
        const fullTotal = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : item.effectiveAmount;
        return sum + fullTotal;
      }, 0);

  const paidBillsCount = assignedBills.filter(b => b.isPaid).length;
  const allBillsPaid = assignedBills.length > 0 && paidBillsCount === assignedBills.length;

  const handleSaveEstCheck = () => {
    const val = parseFloat(tempEstCheck);
    updatePayday({
      ...payday,
      estimatedAmount: isNaN(val) ? null : val,
    });
    setIsEditingEstCheck(false);
  };

  const handleMarkAllPaid = () => {
    assignedBills.forEach(b => {
      if (!b.isPaid) {
        toggleBillPaid(b.bill.id, payday.date);
      }
    });
  };

  const toggleTimelineRow = (date: string) => {
    setExpandedTimelineDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Spending by Category aggregation
  const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number }> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = item.effectiveAmount;
    const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
    categorySummaryMap[cat].amount += myShare;
    categorySummaryMap[cat].fullAmount += fullBillAmt;
    categorySummaryMap[cat].count += 1;
    totalPeriodAmount += myShare;
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = exp.amount;
    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
    categorySummaryMap[cat].amount += amt;
    categorySummaryMap[cat].fullAmount += amt;
    categorySummaryMap[cat].count += 1;
    totalPeriodAmount += amt;
  });

  const categoriesList = Object.entries(categorySummaryMap).map(([name, data]) => {
    const percentage = totalPeriodAmount > 0 ? Math.round((data.amount / totalPeriodAmount) * 100) : 0;
    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      percentage,
      color: getCategoryColor(name),
    };
  }).sort((a, b) => b.amount - a.amount);

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white p-3 box-border pb-32 space-y-5">
      
      {/* 1. UPCOMING PAYDAY HEADER CARD */}
      <div className="w-full max-w-full rounded-[28px] bg-gradient-to-br from-[#1a1033] to-[#0f0f1a] border border-purple-900/30 p-3.5 sm:p-5 space-y-4 overflow-hidden shadow-2xl box-border">
        
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="inline-flex items-center gap-1.5 bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 rounded-full w-fit shrink-0">
            <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">✨ UPCOMING PAYDAY</span>
          </div>
          <span className="text-zinc-400 text-[12px] sm:text-[13px] truncate sm:ml-auto pl-1 font-medium">
            Covers {formatDate(payday.date, 'short')} – {formatDate(nextPaydayDate, 'short')}
          </span>
        </div>

        {/* Title Date */}
        <div className="flex items-center gap-2.5 min-w-0 w-full overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center text-base shrink-0">
            📅
          </div>
          <h1 className="text-[clamp(22px,6.5vw,30px)] font-black tracking-tight text-white leading-tight truncate">
            {formatDate(payday.date, 'medium')}
          </h1>
        </div>

        {/* Action Grid - 2x2 with shrink & gap-2 */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          <button
            onClick={() => onOpenIncomeModal(payday.date)}
            className="w-full min-w-0 h-[46px] rounded-full bg-transparent border border-purple-500 text-purple-400 font-bold text-[12px] sm:text-[13px] flex items-center justify-center gap-1 px-2 whitespace-nowrap overflow-hidden truncate cursor-pointer hover:bg-purple-500/10 transition-colors"
          >
            + Add Extra Cash
          </button>
          <button
            onClick={() => onOpenExpenseModal(payday.date)}
            className="w-full min-w-0 h-[46px] rounded-full bg-zinc-800/80 border border-zinc-700 text-white font-bold text-[12px] sm:text-[13px] flex items-center justify-center gap-1 px-2 whitespace-nowrap overflow-hidden truncate cursor-pointer hover:bg-zinc-700/80 transition-colors"
          >
            + Add Expense
          </button>
          <button
            onClick={() => onOpenBillModal()}
            className="w-full min-w-0 h-[46px] rounded-full bg-zinc-800/80 border border-zinc-700 text-white font-bold text-[12px] sm:text-[13px] flex items-center justify-center gap-1 px-2 whitespace-nowrap overflow-hidden truncate cursor-pointer hover:bg-zinc-700/80 transition-colors"
          >
            🧾 New Bill
          </button>
          <button
            onClick={handleMarkAllPaid}
            className="w-full min-w-0 h-[46px] rounded-full bg-[#7C3AED] text-white font-bold text-[12px] sm:text-[13px] flex items-center justify-center gap-1 px-2 whitespace-nowrap overflow-hidden truncate shadow-lg shadow-purple-600/20 cursor-pointer hover:bg-[#6D28D9] transition-colors"
          >
            ✓ Mark All Paid
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 w-full" />

        {/* Stats Grid - 4 Cards using gap-2 & min-w-0 w-full overflow-hidden */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full [&>*]:min-w-0">
          {/* Estimated Check */}
          <div 
            onClick={() => {
              setTempEstCheck(estimatedCheck !== null ? String(estimatedCheck) : '');
              setIsEditingEstCheck(true);
            }}
            className="rounded-[18px] bg-[#12121a]/80 border border-white/5 p-3 space-y-1.5 w-full min-w-0 overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all box-border"
          >
            <p className="text-zinc-400 text-[11px] sm:text-[12px] font-medium truncate">Estimated Check</p>
            {isEditingEstCheck ? (
              <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  value={tempEstCheck}
                  onChange={e => setTempEstCheck(e.target.value)}
                  placeholder="0.00"
                  className="w-16 pl-1.5 pr-1 py-0.5 rounded bg-[#121212] border border-[#7C3AED] text-white text-xs focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveEstCheck} className="px-2 py-0.5 rounded bg-[#7C3AED] text-white text-xs font-bold shrink-0">
                  Save
                </button>
              </div>
            ) : (
              <p className="text-white text-[20px] sm:text-[24px] font-black leading-none pt-0.5 truncate">
                {estimatedCheck !== null ? formatCurrency(estimatedCheck) : 'TBD'}
              </p>
            )}
            <p className="text-zinc-500 text-[10px] truncate">Expected deposit</p>
          </div>

          {/* Bills Due */}
          <div className="rounded-[18px] bg-[#12121a]/80 border border-white/5 p-3 space-y-1.5 w-full min-w-0 overflow-hidden box-border">
            <div className="flex flex-col items-start gap-1 w-full min-w-0">
              <p className="text-zinc-400 text-[11px] sm:text-[12px] font-medium truncate">Bills Due</p>
              <span className="bg-purple-600/20 text-purple-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full truncate">
                {assignedBills.length} Bills
              </span>
            </div>
            <p className="text-[#C084FC] text-[20px] sm:text-[24px] font-black leading-none pt-0.5 truncate">
              {formatCurrency(displayTotalBills)}
            </p>
            <p className="text-zinc-500 text-[10px] truncate">
              {paidBillsCount} of {assignedBills.length} marked paid
            </p>
          </div>

          {/* Extra Expenses */}
          <div className="rounded-[18px] bg-[#12121a]/80 border border-white/5 p-3 space-y-1.5 w-full min-w-0 overflow-hidden box-border">
            <div className="flex flex-col items-start gap-1 w-full min-w-0">
              <p className="text-zinc-400 text-[11px] sm:text-[12px] font-medium truncate">Extra Expenses</p>
              <span className="bg-red-500/20 text-red-400 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full truncate">
                {extraExpenses.length} Items
              </span>
            </div>
            <p className="text-[#FB7185] text-[20px] sm:text-[24px] font-black leading-none pt-0.5 truncate">
              {formatCurrency(totalExtraExpenses)}
            </p>
            <p className="text-zinc-500 text-[10px] truncate">Non-recurring</p>
          </div>

          {/* MONEY LEFT OVER */}
          <div className="rounded-[18px] bg-[#1a1033]/80 border border-purple-900/40 p-3 space-y-1.5 w-full min-w-0 overflow-hidden box-border">
            <p className="text-[#C084FC] text-[10px] sm:text-[11px] font-black tracking-wider uppercase truncate">
              MONEY LEFT OVER ✓
            </p>
            <p className="text-white text-[20px] sm:text-[24px] font-black leading-none pt-0.5 truncate">
              {leftOver !== null ? formatCurrency(leftOver) : 'TBD'}
            </p>
            <p className="text-zinc-500 text-[10px] truncate">Safe to spend</p>
          </div>
        </div>

        {/* Allocation Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Paycheck Allocation</span>
            <span className="text-purple-400 font-semibold">
              {estimatedCheck && estimatedCheck > 0 ? Math.min(100, Math.round((totalOutflow / estimatedCheck) * 100)) : 0}% allocated
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{ width: `${estimatedCheck && estimatedCheck > 0 ? Math.min(100, Math.round((totalOutflow / estimatedCheck) * 100)) : 0}%` }}
            />
          </div>
        </div>

        {/* Checklist View Button */}
        <button
          onClick={() => {
            setExpandedTimelineDates({ [payday.date]: true });
            const el = document.getElementById('timeline-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="text-purple-400 text-[14px] font-bold flex items-center gap-1 hover:text-purple-300 transition-colors cursor-pointer"
        >
          View Checklist & Breakdown →
        </button>

      </div>

      {/* 2. SPENDING BY CATEGORY & STATS COLUMN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Spending by Category This Check Card */}
        <div className="bg-[#121212] border border-zinc-800 rounded-[24px] p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold shrink-0">
                <svg className="w-3.5 h-3.5 text-[#C084FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </span>
              <h3 className="text-sm font-bold text-white">Spending by Category This Check</h3>
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Category breakdown for paycheck on {formatDate(payday.date, 'medium')}
            </span>
          </div>

          <button
            onClick={() => onNavigateToTab('reports')}
            className="w-full h-12 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-white font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
          >
            <svg className="w-4 h-4 text-[#A78BFA] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            View Full Analytics Reports
          </button>

          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Category Allocation List
            </span>
            <div className="space-y-2">
              {categoriesList.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No spending in this period.</p>
              ) : (
                categoriesList.map(cat => (
                  <div key={cat.name} className="p-3 rounded-2xl bg-[#1A1A1A]/70 border border-[#2A2A2A]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div>
                        <span className="text-xs font-bold text-white block">{cat.name}</span>
                        <span className="text-[10px] text-zinc-400 block">
                          {cat.count} bill{cat.count !== 1 ? 's' : ''} ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-sm font-extrabold text-white">{formatCurrency(cat.amount)}</span>
                      {cat.fullAmount > cat.amount && (
                        <span className="text-[10px] text-zinc-500 font-semibold">(Full {formatCurrency(cat.fullAmount)})</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Visual Donut Allocation Card inside */}
          <div className="rounded-[20px] border border-dashed border-zinc-700/80 p-4 sm:p-6 text-center bg-[#13131F]/40">
            <span className="text-[10px] font-bold text-[#C084FC] uppercase tracking-wider block text-center mb-3">
              Visual Donut Allocation
            </span>
            {categoriesList.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <p className="text-zinc-500 text-[13px]">No bills or tracked expenses for this pay period.</p>
              </div>
            ) : (
              <CategoryPieChart
                assignedBills={assignedBills}
                extraExpenses={extraExpenses}
                height={220}
              />
            )}
          </div>
        </div>

        {/* Dashboard Stats Column (4 clean vertical stack cards) */}
        <div className="space-y-3">
          
          {/* Total Monthly Bills */}
          <div className="flex items-center gap-3 p-4 rounded-[24px] bg-[#141414] border border-zinc-800/80 w-full min-w-0 max-w-full overflow-hidden shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0">
              <Receipt className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-zinc-400 text-[12px] font-medium truncate">Total Monthly Bills</p>
              <p className="text-white text-[26px] font-black leading-tight truncate mt-0.5">
                {formatCurrency(bills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0))}
              </p>
              <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                {bills.filter(b => b.isActive).length} active recurring bills
              </p>
            </div>
          </div>

          {/* Upcoming Paydays */}
          <div className="flex items-center gap-3 p-4 rounded-[24px] bg-[#141414] border border-zinc-800/80 w-full min-w-0 max-w-full overflow-hidden shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0">
              <Calendar className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-zinc-400 text-[12px] font-medium truncate">Upcoming Paydays</p>
              <p className="text-white text-[26px] font-black leading-tight truncate mt-0.5">
                {summaries.length}
              </p>
              <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                Projected in schedule
              </p>
            </div>
          </div>

          {/* Bill Mix */}
          <div className="flex items-center gap-3 p-4 rounded-[24px] bg-[#141414] border border-zinc-800/80 w-full min-w-0 max-w-full overflow-hidden shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0">
              <svg className="w-5 h-5 text-[#C084FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-zinc-400 text-[12px] font-medium truncate">Bill Mix</p>
              <p className="text-white text-[20px] sm:text-[26px] font-black leading-tight truncate mt-0.5">
                {bills.filter(b => b.isActive && b.type === 'fixed').length} Fixed / {bills.filter(b => b.isActive && b.type === 'variable').length} Var
              </p>
              <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                Variable bills auto-prompt amounts
              </p>
            </div>
          </div>

          {/* Extra Expenses */}
          <div className="flex items-center gap-3 p-4 rounded-[24px] bg-[#141414] border border-zinc-800/80 w-full min-w-0 max-w-full overflow-hidden shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-zinc-400 text-[12px] font-medium truncate">Extra Expenses</p>
              <p className="text-white text-[26px] font-black leading-tight truncate mt-0.5">
                {extraExpenses.length}
              </p>
              <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                One-time non-recurring items
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* 2. PAYCHECK TIMELINE & BILL CHECKLISTS */}
      <div id="timeline-section" className="space-y-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#A78BFA]" />
                Paycheck Timeline & Bill Checklists
              </h3>
              <span className="text-[11px] text-white/50 block mt-0.5">
                Expand any payday to see assigned bills, adjust variable amounts, or mark bills paid.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onOpenPaydayModal}
                className="px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-xs font-semibold hover:bg-[#2A2A2A] transition-all cursor-pointer"
              >
                + Add Custom Payday
              </button>
              <button
                onClick={onOpenScheduleModal}
                className="px-3 py-1.5 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C084FC] text-xs font-semibold hover:bg-[#7C3AED]/30 transition-all cursor-pointer"
              >
                Configure Schedule
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 px-3 overflow-x-hidden">
          {summaries.map((summaryItem) => (
            <PaycheckCard
              key={summaryItem.payday.date}
              summaryItem={summaryItem}
              initialOpen={summaryItem.payday.date === activeSummary?.payday.date}
              onOpenBillModal={onOpenBillModal}
              onNavigateToTab={onNavigateToTab}
              toggleBillPaid={toggleBillPaid}
            />
          ))}
        </div>
      </div>

    </div>
  );
};
