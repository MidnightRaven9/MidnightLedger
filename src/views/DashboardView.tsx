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
  const [isOpen, setIsOpen] = useState(initialOpen);
  const dateStr = summaryItem.payday.date;
  const hasAmt = summaryItem.estimatedCheck !== null;

  const handleMarkAllPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    summaryItem.assignedBills.forEach(b => {
      if (!b.isPaid) {
        toggleBillPaid(b.bill.id, dateStr);
      }
    });
  };

  const parsedDate = parseISODate(dateStr);
  const monthAbbr = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(parsedDate.getDate());

  const availStr = hasAmt ? `${formatCurrency(summaryItem.totalAvailable).replace(/\.00$/, '')} avail` : 'Est: Not set';
  const billsTotalStr = formatCurrency(summaryItem.totalBills).replace(/\.00$/, '');
  const billsCount = summaryItem.assignedBills.length;

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
          <div className="text-xs text-white/50 uppercase tracking-wide leading-[1.4]">
            Bills assigned to this check:
          </div>

          {summaryItem.assignedBills.length === 0 ? (
            <div className="text-xs text-white/40 italic py-2 leading-[1.4]">
              No bills assigned to this paycheck.
            </div>
          ) : (
            <div className="space-y-3 overflow-visible min-h-0">
              {summaryItem.assignedBills.map(assigned => {
                const bill = assigned.bill;
                const isSplit = !!bill.isSplit;
                const myPortionStr = formatCurrency(assigned.effectiveAmount);
                const totalStr = formatCurrency(bill.fullTotal || bill.amount);
                const formattedDueDate = formatDate(assigned.dueFullDate, 'short');

                return (
                  <div key={bill.id} className="flex justify-between items-center bg-[#1A1A1A] rounded-xl p-3 leading-[1.4]">
                    <div className="leading-[1.4]">
                      <div className="text-white text-sm font-semibold leading-[1.4] flex items-center gap-1.5">
                        {assigned.isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {bill.name}
                      </div>
                      <div className="text-white/40 text-xs leading-[1.4]">Due {formattedDueDate}</div>
                    </div>
                    <div className="text-right leading-[1.4]">
                      <div className="text-white text-sm font-medium leading-[1.4]">
                        {isSplit ? `${myPortionStr} of ${totalStr}` : myPortionStr}
                      </div>
                      {isSplit ? (
                        <div className="text-[#B794F6] text-xs font-semibold leading-[1.4]">Split</div>
                      ) : (
                        <div className="text-[#A78BFA] text-xs font-semibold leading-[1.4]">Personal</div>
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
              className="flex-1 bg-[#7C3AED] text-white rounded-xl py-2 text-sm font-semibold hover:bg-[#6D28D9] transition-colors leading-[1.4]"
            >
              Edit Bills
            </button>
            <button 
              onClick={handleMarkAllPaid}
              className="flex-1 bg-white/10 text-white rounded-xl py-2 text-sm font-semibold hover:bg-white/20 transition-colors leading-[1.4]"
            >
              Mark Paid
            </button>
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
    const cat = item.bill.category || 'Other';
    const myShare = item.effectiveAmount;
    const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0 };
    categorySummaryMap[cat].amount += myShare;
    categorySummaryMap[cat].fullAmount += fullBillAmt;
    categorySummaryMap[cat].count += 1;
    totalPeriodAmount += myShare;
  });

  extraExpenses.forEach(exp => {
    const cat = exp.category || 'Other';
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
    <div className="space-y-6 pb-32">
      
      {/* 1. HERO CARD - Current Pay Period Only */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#121212] to-[#1E1B4B] text-white p-4 shadow-xl border border-[#7C3AED]/30 shadow-[0_0_20px_rgba(124,58,237,0.12)]">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3 border-b border-[#2A2A2A]/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-[#7C3AED]/20 text-[#C084FC] border border-[#7C3AED]/40 tracking-wider">
              <Sparkles className="w-3 h-3 text-[#C084FC]" />
              UPCOMING PAYDAY
            </span>
            <span className="text-xs text-white/55">
              Covers {formatDate(payday.date, 'short')} – {formatDate(nextPaydayDate, 'short')}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-[#A78BFA]" />
          {formatDate(payday.date, 'medium')}
        </h2>

        {/* Action Row 1 */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => onOpenIncomeModal(payday.date)}
            className="flex-1 py-2 text-xs font-bold rounded-full bg-[#1E1B2E]/50 border border-[#7C3AED] text-[#C084FC] hover:bg-[#7C3AED]/20 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Extra Cash
          </button>
          <button
            onClick={() => onOpenExpenseModal(payday.date)}
            className="flex-1 py-2 text-xs font-bold rounded-full bg-[#1F1F1F]/70 border border-[#2A2A2A] text-white/80 hover:bg-[#2A2A2A] transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Expense
          </button>
        </div>

        {/* Action Row 2 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => onOpenBillModal()}
            className="flex-1 py-2 text-xs font-bold rounded-full bg-[#1F1F1F]/70 border border-[#2A2A2A] text-white/80 hover:bg-[#2A2A2A] transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            <Receipt className="w-3 h-3 text-white/60" /> New Bill
          </button>
          <button
            onClick={handleMarkAllPaid}
            className="flex-1 py-2 text-xs font-bold rounded-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-violet-900/40 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Paid
          </button>
        </div>

        <hr className="border-[#2A2A2A]/60 my-3" />

        {/* Vertical Stack Sections inside the card */}
        <div className="space-y-2 mb-4">
          
          {/* Estimated Check */}
          <div 
            onClick={() => {
              setTempEstCheck(estimatedCheck !== null ? String(estimatedCheck) : '');
              setIsEditingEstCheck(true);
            }}
            className="bg-[#13131F]/60 border border-[#2A2A2A]/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#7C3AED]/40 transition-all group"
          >
            <div className="space-y-0.5">
              <span className="text-xs text-white/50 font-medium">Estimated Check</span>
              {isEditingEstCheck ? (
                <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-white/40 text-xs">$</span>
                    <input
                      type="number"
                      value={tempEstCheck}
                      onChange={e => setTempEstCheck(e.target.value)}
                      placeholder="0.00"
                      className="w-32 pl-6 pr-2 py-1 rounded-lg bg-[#121212] border border-[#7C3AED] text-white text-sm focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSaveEstCheck}
                    className="px-2.5 py-1 rounded-lg bg-[#7C3AED] text-white font-bold text-xs shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="text-2xl font-black text-white flex items-center gap-1.5 group-hover:text-[#C084FC] transition-colors">
                  {estimatedCheck !== null ? formatCurrency(estimatedCheck) : 'TBD'}
                  <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#A78BFA] transition-opacity" />
                </div>
              )}
              <span className="text-[10px] text-white/40 block">Expected deposit</span>
            </div>
          </div>

          {/* Bills Due This Period */}
          <div className="group relative bg-[#13131F]/60 border border-[#2A2A2A]/50 rounded-2xl p-4 flex items-center justify-between cursor-help">
            <div className="space-y-0.5 w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/50 font-medium">
                  {viewMode === 'myShare' ? 'Bills Due This Period' : 'Bills Due This Period (Full)'}
                </span>
                <span className="inline-flex text-[10px] font-bold bg-[#7C3AED]/20 text-[#C084FC] px-1.5 py-0.5 rounded-md">
                  {assignedBills.length} Bills
                </span>
              </div>
              <div className={`text-2xl font-black ${viewMode === 'myShare' ? 'text-[#C084FC]' : 'text-[#F59E0B]'}`}>
                {formatCurrency(displayTotalBills)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>{paidBillsCount} of {assignedBills.length} marked paid</span>
                {viewMode === 'fullTotal' && (
                  <span className="text-[#A78BFA] font-semibold">Calculations always use your share</span>
                )}
              </div>
            </div>

            {/* Hover Breakdown Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 hidden group-hover:flex flex-col bg-[#161616] border border-[#2A2A2A] text-white text-[11px] p-3 rounded-xl shadow-xl w-72 z-50 pointer-events-none space-y-1.5">
              <div className="font-bold border-b border-[#2A2A2A] pb-1 flex justify-between">
                <span>Bills Due Breakdown ({viewMode === 'myShare' ? 'My Share' : 'Full Totals'})</span>
                <span className={viewMode === 'myShare' ? 'text-[#C084FC]' : 'text-[#F59E0B]'}>
                  {formatCurrency(displayTotalBills)}
                </span>
              </div>
              <div className="text-white/70 font-semibold text-[10px] uppercase tracking-wider">
                For {formatDate(payday.date, 'short')} ({assignedBills.length} Bills):
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {assignedBills.map(assigned => {
                  const { bill, effectiveAmount } = assigned;
                  const amtToDisplay = viewMode === 'myShare' ? effectiveAmount : (bill.isSplit ? (bill.fullTotal || bill.amount) : effectiveAmount);
                  return (
                    <div key={bill.id} className="flex justify-between items-center gap-2">
                      <span className="truncate text-white/80">{bill.name}</span>
                      <span className="font-bold shrink-0 text-white">
                        {formatCurrency(amtToDisplay)}
                        {bill.isSplit && viewMode === 'myShare' && (
                          <span className="text-[9px] text-[#A78BFA] font-normal ml-1">
                            (of {formatCurrency(bill.fullTotal || bill.amount)})
                          </span>
                        )}
                        {bill.isSplit && viewMode === 'fullTotal' && (
                          <span className="text-[9px] text-[#A78BFA] font-normal ml-1">
                            (share: {formatCurrency(effectiveAmount)})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {viewMode === 'fullTotal' && (
                <div className="text-[9px] text-[#A78BFA] border-t border-[#2A2A2A] pt-1 text-center font-medium">
                  Left over calculations always use your share
                </div>
              )}
            </div>
          </div>

          {/* Extra Expenses */}
          <div className="bg-[#13131F]/60 border border-[#2A2A2A]/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/50 font-medium">Extra Expenses</span>
                <span className="inline-flex text-[10px] font-bold bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-md">
                  {extraExpenses.length} Item{extraExpenses.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-2xl font-black text-rose-400">
                {formatCurrency(totalExtraExpenses)}
              </div>
              <span className="text-[10px] text-white/40 block">Non-recurring expenses</span>
            </div>
          </div>

          {/* MONEY LEFT OVER */}
          <div className="bg-[#13131F]/90 border border-[#7C3AED]/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(124,58,237,0.12)]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#C084FC] font-extrabold tracking-wider uppercase">MONEY LEFT OVER</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(167,139,250,0.3)]">
                {leftOver !== null ? formatCurrency(leftOver) : 'TBD'}
              </div>
              <span className="text-[10px] text-white/40 block">Safe spending / savings buffer</span>
            </div>
          </div>

        </div>

        {/* Footer info & progress */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Paycheck Allocation</span>
            <span className="font-semibold text-[#A78BFA]">
              {estimatedCheck && estimatedCheck > 0 ? Math.min(100, Math.round((totalOutflow / estimatedCheck) * 100)) : 0}% allocated
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden flex border border-[#2A2A2A]/40">
            {estimatedCheck && estimatedCheck > 0 ? (
              <>
                <div 
                  style={{ width: `${Math.min(100, (totalBills / estimatedCheck) * 100)}%` }}
                  className="bg-[#7C3AED] h-full"
                />
                <div 
                  style={{ width: `${Math.min(100, (totalExtraExpenses / estimatedCheck) * 100)}%` }}
                  className="bg-rose-500 h-full"
                />
              </>
            ) : (
              <div className="w-0 bg-transparent h-full" />
            )}
          </div>
          <div className="pt-3 border-t border-[#2A2A2A]/40 flex items-center justify-between mt-3">
            <button
              onClick={() => {
                setExpandedTimelineDates({ [payday.date]: true });
                const el = document.getElementById('timeline-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-xs font-bold text-[#A78BFA] hover:text-[#C084FC] flex items-center gap-1 cursor-pointer transition-colors"
            >
              View Checklist & Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Spending by Category & Stats Column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Spending by Category This Check */}
        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold">
                <svg className="w-3 h-3 text-[#C084FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </span>
              <h3 className="text-sm font-bold text-white">Spending by Category This Check</h3>
            </div>
            <span className="text-[11px] text-white/50 block mt-0.5">
              Category breakdown for paycheck on {formatDate(payday.date, 'medium')}
            </span>
          </div>

          <button
            onClick={() => onNavigateToTab('reports')}
            className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-[#2A2A2A] transition-all"
          >
            <svg className="w-3.5 h-3.5 text-[#A78BFA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            View Full Analytics Reports
          </button>

          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-2">
              Category Allocation List
            </span>
            <div className="space-y-2">
              {categoriesList.length === 0 ? (
                <p className="text-xs text-white/50 italic">No spending in this period.</p>
              ) : (
                categoriesList.map(cat => (
                  <div key={cat.name} className="p-3 rounded-xl bg-[#1A1A1A]/70 border border-[#2A2A2A]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div>
                        <span className="text-xs font-bold text-white block">{cat.name}</span>
                        <span className="text-[10px] text-white/50 block">
                          {cat.count} bill{cat.count !== 1 ? 's' : ''} ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-sm font-extrabold text-white">{formatCurrency(cat.amount)}</span>
                      {cat.fullAmount > cat.amount && (
                        <span className="text-[10px] text-white/40 font-semibold">(Full {formatCurrency(cat.fullAmount)})</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Visual Donut Allocation Card inside it */}
          <div className="p-4 rounded-xl bg-[#13131F]/60 border border-[#7C3AED]/20 shadow-[inset_0_0_12px_rgba(124,58,237,0.05)]">
            <span className="text-[10px] font-bold text-[#C084FC] uppercase tracking-wider block text-center mb-3">
              Visual Donut Allocation
            </span>
            <CategoryPieChart
              assignedBills={assignedBills}
              extraExpenses={extraExpenses}
              height={220}
            />
          </div>
        </div>

        {/* Dashboard Stats Column (stacked) */}
        <div className="space-y-3">
          {/* Total Monthly Bills */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <span className="text-xs text-white/50 block font-medium">Total Monthly Bills</span>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {formatCurrency(bills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0))}
              </div>
              <span className="text-[10px] text-white/40 block mt-0.5">
                {bills.filter(b => b.isActive).length} active recurring bills
              </span>
            </div>
          </div>

          {/* Upcoming Paydays */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <span className="text-xs text-white/50 block font-medium">Upcoming Paydays</span>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {summaries.length}
              </div>
              <span className="text-[10px] text-white/40 block mt-0.5">
                Projected in schedule
              </span>
            </div>
          </div>

          {/* Bill Mix */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#C084FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <span className="text-xs text-white/50 block font-medium">Bill Mix</span>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {bills.filter(b => b.isActive && b.type === 'fixed').length} Fixed / {bills.filter(b => b.isActive && b.type === 'variable').length} Var
              </div>
              <span className="text-[10px] text-white/40 block mt-0.5">
                Variable bills auto-prompt amounts
              </span>
            </div>
          </div>

          {/* Extra Expenses */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xs text-white/50 block font-medium">Extra Expenses</span>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {extraExpenses.length}
              </div>
              <span className="text-[10px] text-white/40 block mt-0.5">
                One-time non-recurring items
              </span>
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
