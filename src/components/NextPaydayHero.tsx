import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Receipt, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PaydaySummary } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { usePayday } from '../context/PaydayContext';

interface NextPaydayHeroProps {
  summary: PaydaySummary | null;
  onOpenExpenseModal: (paydayDate?: string) => void;
  onOpenBillModal: () => void;
  onOpenIncomeModal?: (paydayDate?: string) => void;
  onSelectPaydayCard?: (paydayDate: string) => void;
}

export const NextPaydayHero: React.FC<NextPaydayHeroProps> = ({
  summary,
  onOpenExpenseModal,
  onOpenBillModal,
  onOpenIncomeModal,
  onSelectPaydayCard,
}) => {
  const { updatePayday, toggleBillPaid } = usePayday();
  const [isEditingEstCheck, setIsEditingEstCheck] = useState(false);
  const [tempAmount, setTempAmount] = useState<string>('');

  if (!summary) {
    return (
      <div id="hero-no-payday" className="p-8 rounded-3xl bg-[#121212] border border-[#2A2A2A] shadow-lg text-center">
        <p className="text-white/60">No upcoming paydays scheduled.</p>
      </div>
    );
  }

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
  } = summary;

  const handleSaveEstCheck = () => {
    const val = parseFloat(tempAmount);
    updatePayday({
      ...payday,
      estimatedAmount: isNaN(val) ? null : val,
    });
    setIsEditingEstCheck(false);
  };

  const handleStartEditing = () => {
    setTempAmount(estimatedCheck !== null ? String(estimatedCheck) : '');
    setIsEditingEstCheck(true);
  };

  const allBillsPaid = assignedBills.length > 0 && assignedBills.every(b => b.isPaid);

  const handleMarkAllPaid = () => {
    assignedBills.forEach(b => {
      if (!b.isPaid) {
        toggleBillPaid(b.bill.id, payday.date);
      }
    });
  };

  return (
    <div id="hero-next-payday" className="relative overflow-hidden rounded-3xl bg-[#121212] text-white p-6 sm:p-8 shadow-2xl border border-[#2A2A2A] hover:border-violet-500/30 transition-all">
      
      {/* Decorative background purple glow elements */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1E1B2E] text-[#A78BFA] border border-[#3B236E]">
              <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
              UPCOMING PAYDAY
            </span>
            <span className="text-xs text-white/60">
              Covers bills due {formatDate(payday.date, 'short')} – {formatDate(nextPaydayDate, 'short')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#A78BFA]" />
            {formatDate(payday.date, 'dayAndMonth')}, {payday.date.slice(0, 4)}
          </h2>
        </div>

        {/* Quick actions on Hero */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {onOpenIncomeModal && (
            <button
              id="btn-hero-add-income"
              onClick={() => onOpenIncomeModal(payday.date)}
              className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#1E1B2E] hover:bg-[#2B2245] text-[#C084FC] border border-dashed border-[#A78BFA]/60 transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
              <span className="truncate">+ Add Extra Cash</span>
            </button>
          )}

          <button
            id="btn-hero-add-expense"
            onClick={() => onOpenExpenseModal(payday.date)}
            className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white/90 border border-[#2A2A2A] transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
            <span className="truncate">Add Expense</span>
          </button>

          <button
            id="btn-hero-add-bill"
            onClick={onOpenBillModal}
            className="min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white/90 border border-[#2A2A2A] transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-[#C084FC] shrink-0" />
            <span className="truncate">New Bill</span>
          </button>

          {assignedBills.length > 0 && !allBillsPaid && (
            <button
              onClick={handleMarkAllPaid}
              className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md shadow-violet-900/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#DDD6FE] shrink-0" />
              <span className="truncate">Mark All Paid</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        {/* Estimated Check / Total Available Card */}
        <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>{totalExtraIncome > 0 ? 'Total Available Income' : 'Estimated Check'}</span>
            {!isEditingEstCheck && (
              <button 
                onClick={handleStartEditing}
                className="text-[#A78BFA] hover:text-white p-1 transition-colors"
                title="Edit Estimated Check Amount"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isEditingEstCheck ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2 text-white/40 text-xs">$</span>
                <input
                  type="number"
                  value={tempAmount}
                  onChange={e => setTempAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-1.5 rounded-xl bg-[#121212] border border-[#7C3AED] text-white text-sm focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveEstCheck}
                className="px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md"
              >
                Save
              </button>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {totalAvailable !== null ? formatCurrency(totalAvailable) : '$0.00'}
              </div>
              {totalExtraIncome > 0 ? (
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                  Base {estimatedCheck ? formatCurrency(estimatedCheck) : '$0'} + {formatCurrency(totalExtraIncome)} cash ({extraIncomes.length} {extraIncomes.length === 1 ? 'source' : 'sources'})
                </p>
              ) : (
                <p className="text-[11px] text-white/50 mt-0.5">
                  {estimatedCheck === null ? 'Click edit icon to set paycheck' : 'Expected deposit'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Total Bills Card */}
        <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>Bills Due This Period</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2A2A2A] text-[#A78BFA]">
              {assignedBills.length} {assignedBills.length === 1 ? 'Bill' : 'Bills'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#C084FC] tracking-tight">
              {formatCurrency(totalBills)}
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">
              {assignedBills.filter(b => b.isPaid).length} of {assignedBills.length} marked paid
            </p>
          </div>
        </div>

        {/* Extra Expenses Card */}
        <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>Extra Expenses</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2A2A2A] text-fuchsia-300">
              {extraExpenses.length} {extraExpenses.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F43F5E] tracking-tight">
              {formatCurrency(totalExtraExpenses)}
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">
              Non-recurring expenses
            </p>
          </div>
        </div>

        {/* Left Over Highlight Card */}
        {(() => {
          const hasValidAvailable = (estimatedCheck !== null && estimatedCheck > 0) || totalExtraIncome > 0;

          return (
            <div className={`p-4 rounded-2xl border backdrop-blur-sm flex flex-col justify-between transition-all ${
              hasValidAvailable && status === 'positive'
                ? 'bg-[#121212] border-violet-500/50 shadow-lg shadow-violet-900/20'
                : hasValidAvailable && status === 'negative'
                ? 'bg-[#121212] border-rose-500/50 shadow-lg shadow-rose-900/20'
                : 'bg-[#1E1E1E] border-[#2A2A2A]'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={hasValidAvailable && status === 'positive' ? 'text-[#A78BFA]' : hasValidAvailable && status === 'negative' ? 'text-[#FCA5A5]' : 'text-white/60'}>
                  MONEY LEFT OVER
                </span>
                {hasValidAvailable && status === 'positive' && <CheckCircle2 className="w-4 h-4 text-[#A7F3D0]" />}
                {hasValidAvailable && status === 'negative' && <AlertCircle className="w-4 h-4 text-[#FCA5A5]" />}
              </div>

              <div>
                {hasValidAvailable && leftOver !== null ? (
                  <>
                    <div className={`text-3xl font-extrabold tracking-tight ${
                      status === 'positive'
                        ? 'text-[#A78BFA]'
                        : status === 'negative'
                        ? 'text-[#FCA5A5]'
                        : 'text-white'
                    }`}>
                      {formatCurrency(leftOver)}
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      {leftOver >= 0 
                        ? 'Safe spending / savings buffer' 
                        : 'Over budget by ' + formatCurrency(Math.abs(leftOver))}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-extrabold tracking-tight text-[#9CA3AF]">
                      Waiting for Estimate
                    </div>
                    <p className="text-[11px] text-white/80 font-medium mt-0.5">
                      {totalOutflow > 0 ? `${formatCurrency(totalOutflow)} in bills due` : 'No bills due this period'}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Progress visual bar */}
      {estimatedCheck !== null && estimatedCheck > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Paycheck Allocation</span>
            <span className="font-semibold text-[#A78BFA]">
              {Math.min(100, Math.round((totalOutflow / estimatedCheck) * 100))}% allocated
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#1E1E1E] rounded-full overflow-hidden flex border border-[#2A2A2A]">
            <div 
              style={{ width: `${Math.min(100, (totalBills / estimatedCheck) * 100)}%` }}
              className="bg-[#7C3AED] h-full transition-all duration-500"
              title={`Bills: ${formatCurrency(totalBills)}`}
            />
            <div 
              style={{ width: `${Math.min(100, (totalExtraExpenses / estimatedCheck) * 100)}%` }}
              className="bg-[#C084FC] h-full transition-all duration-500"
              title={`Extra Expenses: ${formatCurrency(totalExtraExpenses)}`}
            />
          </div>
        </div>
      )}

      {/* Footer link to detailed view */}
      {onSelectPaydayCard && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-end">
          <button
            onClick={() => onSelectPaydayCard(payday.date)}
            className="text-xs font-semibold text-[#A78BFA] hover:text-[#C084FC] flex items-center gap-1 group transition-colors"
          >
            View Checklist & Breakdown 
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

    </div>
  );
};
