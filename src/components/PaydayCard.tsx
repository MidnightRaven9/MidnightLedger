import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  DollarSign, 
  Calendar, 
  Receipt, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  Info,
  Tag,
  Check
} from 'lucide-react';
import { PaydaySummary, AssignedBill, ExtraExpense } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { calculateSplitShare } from '../utils/splitUtils';
import { usePayday } from '../context/PaydayContext';
import { DeleteBillModal } from './DeleteBillModal';
import { BillCard } from './BillCard';

interface PaydayCardProps {
  summary: PaydaySummary;
  isInitiallyExpanded?: boolean;
  onOpenExpenseModal: (paydayDate: string) => void;
  onOpenIncomeModal: (paydayDate: string) => void;
  onEditBill: (bill: AssignedBill['bill']) => void;
}

export const PaydayCard: React.FC<PaydayCardProps> = ({
  summary,
  isInitiallyExpanded = false,
  onOpenExpenseModal,
  onOpenIncomeModal,
  onEditBill,
}) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [deletingBill, setDeletingBill] = useState<AssignedBill['bill'] | null>(null);
  const { 
    nextPaydaySummary,
    updatePayday, 
    setVariableOverride, 
    toggleBillPaid, 
    deleteExtraExpense,
    deleteExtraIncome,
    deleteBillOccurrence
  } = usePayday();

  const [editingEstCheck, setEditingEstCheck] = useState(false);
  const [tempEstCheck, setTempEstCheck] = useState(
    summary.estimatedCheck !== null ? String(summary.estimatedCheck) : ''
  );

  const [editingVariableBillId, setEditingVariableBillId] = useState<string | null>(null);
  const [tempVariableAmount, setTempVariableAmount] = useState<string>('');
  const [tempVariableFullTotal, setTempVariableFullTotal] = useState<string>('');
  const [editingIsSplit, setEditingIsSplit] = useState<boolean>(false);

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
    const val = parseFloat(tempEstCheck);
    updatePayday({
      ...payday,
      estimatedAmount: isNaN(val) ? null : val,
    });
    setEditingEstCheck(false);
  };

  const handleSaveVariableOverride = (assignedBill: AssignedBill) => {
    const { bill } = assignedBill;
    if (bill.isSplit) {
      const fullTotalVal = parseFloat(tempVariableFullTotal);
      if (!isNaN(fullTotalVal) && fullTotalVal >= 0) {
        const recalculatedShare = calculateSplitShare(
          fullTotalVal,
          bill.splitType,
          bill.splitCount,
          bill.mySharePercentage,
          bill.customMyShare
        );
        setVariableOverride(bill.id, payday.date, recalculatedShare, fullTotalVal);
      }
    } else {
      const val = parseFloat(tempVariableAmount);
      if (!isNaN(val) && val >= 0) {
        setVariableOverride(bill.id, payday.date, val, val);
      }
    }
    setEditingVariableBillId(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Housing': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Utilities': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Car': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Insurance': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Phone & Internet': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'Subscriptions': return 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      case 'Food & Household': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const paidCount = assignedBills.filter(b => b.isPaid).length;

  return (
    <div 
      id={`payday-card-${payday.date}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'bg-[#121212] border-[#7C3AED] shadow-xl shadow-violet-950/20'
          : 'bg-[#121212] border-[#2A2A2A] hover:border-violet-500/40'
      }`}
    >
      
      {/* Collapsed Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-[#121212] hover:bg-[#1E1E1E] transition-colors"
      >
        
        {/* Date & Period Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E1B2E] border border-[#3B236E] flex flex-col items-center justify-center text-[#A78BFA] font-bold shrink-0">
            <span className="text-xs uppercase">{formatDate(payday.date, 'short').split('/')[0]}</span>
            <span className="text-lg leading-none">{String(payday.date || '').split('-')[2] || ''}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
                💜 {formatDate(payday.date, 'medium').toUpperCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-950/40 border border-violet-900/50 text-[#C084FC] text-[11px] font-semibold">
                🧾 {assignedBills.length} bills assigned
              </span>
              {payday.notes && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E1E1E] text-white/60 border border-[#2A2A2A]">
                  {payday.notes}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-1">
              Covers bills due {formatDate(payday.date, 'short')} – {formatDate(nextPaydayDate, 'short')}
            </p>
          </div>
        </div>

        {/* Math Quick Overview Pills */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
          
          <div className="text-right">
            <span className="text-[11px] font-medium text-[#A78BFA] block flex items-center gap-1">✨ Available</span>
            <span className="text-sm font-semibold text-white">
              {totalAvailable !== null ? formatCurrency(totalAvailable) : 'Not set'}
            </span>
          </div>

          {totalExtraIncome > 0 && (
            <div className="text-right">
              <span className="text-[11px] font-medium text-emerald-400 block">+ Extra Cash</span>
              <span className="text-sm font-semibold text-emerald-300">
                +{formatCurrency(totalExtraIncome)}
              </span>
            </div>
          )}

          <div className="text-right">
            <span className="text-[11px] font-medium text-white/50 block">
              Bills ({paidCount}/{assignedBills.length} paid)
            </span>
            <span className="text-sm font-semibold text-[#C084FC]">
              {formatCurrency(totalBills)}
            </span>
          </div>

          {totalExtraExpenses > 0 && (
            <div className="text-right">
              <span className="text-[11px] font-medium text-white/50 block">Extra Exp.</span>
              <span className="text-sm font-semibold text-rose-400">
                {formatCurrency(totalExtraExpenses)}
              </span>
            </div>
          )}

          {/* Left Over Highlight Pill */}
          {(() => {
            const hasValidAvailable = (estimatedCheck !== null && estimatedCheck > 0) || totalExtraIncome > 0;
            return (
              <div className={`px-3 py-1.5 rounded-xl border text-right font-bold text-sm flex flex-col items-end min-w-[110px] ${
                hasValidAvailable && status === 'positive'
                  ? 'bg-[#1E1B2E] border-[#3B236E] text-[#A78BFA]'
                  : hasValidAvailable && status === 'negative'
                  ? 'bg-rose-950/40 border-rose-800 text-[#FCA5A5]'
                  : 'bg-[#1E1E1E] border-[#2A2A2A] text-[#9CA3AF]'
              }`}>
                <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">Left Over</span>
                {hasValidAvailable && leftOver !== null ? (
                  <span>{formatCurrency(leftOver)}</span>
                ) : (
                  <span className="text-xs font-semibold text-[#9CA3AF]">Waiting for est.</span>
                )}
              </div>
            );
          })()}

          {/* Expand Chevron */}
          <div className="p-1 rounded-lg text-white/40 hover:bg-[#2A2A2A] transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>

        </div>

      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-5 border-t border-[#2A2A2A] space-y-6 bg-[#121212]">
          
          {/* Section 1: Estimated Check & Extra Cash Input Banner */}
          <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Pay Period Income Summary
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenIncomeModal(payday.date)}
                  className="px-3 py-1.5 rounded-xl bg-[#1E1B2E] hover:bg-[#2B2245] text-[#C084FC] border border-dashed border-[#A78BFA]/60 text-xs font-bold transition-all"
                >
                  + Add Extra Cash
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#2A2A2A]">
              {/* Base Paycheck */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2A]">
                <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                  <span>Base Paycheck</span>
                  {!editingEstCheck && (
                    <button
                      onClick={() => {
                        setTempEstCheck(estimatedCheck !== null ? String(estimatedCheck) : '');
                        setEditingEstCheck(true);
                      }}
                      className="text-[#A78BFA] hover:underline text-[10px]"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingEstCheck ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={tempEstCheck}
                      onChange={e => setTempEstCheck(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs rounded border border-[#7C3AED] bg-[#1E1E1E] text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEstCheck}
                      className="px-2 py-1 rounded bg-[#7C3AED] text-white text-xs font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="text-base font-bold text-white">
                    {estimatedCheck !== null ? formatCurrency(estimatedCheck) : '$0.00'}
                  </div>
                )}
              </div>

              {/* Extra Cash Boosts */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2A]">
                <div className="text-[11px] text-emerald-400 font-medium mb-1">
                  Extra Cash / Income
                </div>
                <div className="text-base font-bold text-emerald-300">
                  +{formatCurrency(totalExtraIncome)}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {extraIncomes.length} {extraIncomes.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>

              {/* Total Available Income */}
              <div className="p-3 rounded-xl bg-[#1E1B2E] border border-[#3B236E]">
                <div className="text-[11px] text-[#A78BFA] font-bold mb-1 uppercase tracking-wider">
                  Total Available
                </div>
                <div className="text-lg font-extrabold text-white">
                  {totalAvailable !== null ? formatCurrency(totalAvailable) : '$0.00'}
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Base paycheck + Extra cash
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bills Checklist Due This Pay Period */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#A78BFA]" />
                Bills Due This Pay Period ({assignedBills.length})
              </h4>
              <span className="text-xs text-white/50">
                Check off paid bills or adjust variable amounts
              </span>
            </div>

            {assignedBills.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#1E1E1E] border border-dashed border-[#2A2A2A] text-white/50 text-xs">
                No monthly bills due between {formatDate(payday.date, 'medium')} and {formatDate(nextPaydayDate, 'medium')}.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedBills.map(assignedBill => {
                  const { bill, effectiveAmount, effectiveFullTotal, isOverride, isPaid, dueFullDate } = assignedBill;
                  const isEditingThisVar = editingVariableBillId === bill.id;
                  const currentFullTotal = effectiveFullTotal ?? bill.fullTotal ?? bill.amount;
                  const splitWays = bill.splitWays || bill.splitCount || 2;

                  if (isEditingThisVar) {
                    return (
                      <div
                        key={`${bill.id}_${dueFullDate}`}
                        className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E1E1E] border-[#7C3AED]"
                      >
                        <div>
                          <span className="text-sm font-semibold text-white block">
                            Adjusting {bill.name}
                          </span>
                          <span className="text-xs text-white/50 block">
                            Due {formatDate(dueFullDate, 'short')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-xl border border-[#7C3AED]">
                          {bill.isSplit ? (
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-white/50">Full Total $:</span>
                                <input
                                  type="number"
                                  value={tempVariableFullTotal}
                                  onChange={e => setTempVariableFullTotal(e.target.value)}
                                  className="w-20 px-2 py-1 text-xs rounded border border-[#2A2A2A] bg-[#1E1E1E] text-white"
                                  autoFocus
                                />
                              </div>
                              <span className="text-[10px] text-[#A78BFA] font-semibold">
                                My Share: {formatCurrency(parseFloat(tempVariableFullTotal) ? (parseFloat(tempVariableFullTotal) / splitWays) : 0)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempVariableAmount}
                                onChange={e => setTempVariableAmount(e.target.value)}
                                className="w-24 px-2 py-1 text-xs rounded border border-[#7C3AED] bg-[#1E1E1E] text-white"
                                autoFocus
                              />
                            </div>
                          )}

                          <button
                            onClick={() => handleSaveVariableOverride(assignedBill)}
                            className="p-1.5 rounded bg-[#7C3AED] text-white text-xs hover:bg-[#6D28D9] font-bold cursor-pointer"
                            title="Save variable amount"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <BillCard
                      key={`${bill.id}_${dueFullDate}`}
                      bill={bill}
                      viewMode="myShare"
                      isPaid={isPaid}
                      effectiveAmount={effectiveAmount}
                      dueFullDate={dueFullDate}
                      interactive={true}
                      onTogglePaid={() => toggleBillPaid(bill.id, payday.date)}
                      onAdjust={bill.type === 'variable' ? () => {
                        setTempVariableAmount(String(effectiveAmount));
                        setTempVariableFullTotal(String(currentFullTotal));
                        setEditingVariableBillId(bill.id);
                      } : undefined}
                      onSkip={() => {
                        if (confirm(`Skip ${bill.name} for the pay period starting ${formatDate(payday.date, 'short')}?`)) {
                          deleteBillOccurrence(bill.id, payday.date);
                        }
                      }}
                      onEdit={() => onEditBill(bill)}
                      onDelete={() => setDeletingBill(bill)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Tracked Spending Expenses List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#C084FC]" />
                Tracked Spending ({formatCurrency(totalExtraExpenses)})
              </h4>

              <button
                onClick={() => onOpenExpenseModal(payday.date)}
                className="flex items-center gap-1 text-xs font-semibold text-[#A78BFA] hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Expense
              </button>
            </div>

            {extraExpenses.length === 0 ? (
              <p className="text-xs text-white/40 italic">No tracked spending logged for this paycheck.</p>
            ) : (
              <div className="space-y-2">
                {extraExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {exp.description}
                        </span>
                        {exp.category && (
                          <span className="text-[10px] text-[#A78BFA] font-medium bg-[#121212] px-2 py-0.5 rounded-full border border-[#2A2A2A]">
                            {exp.category}
                          </span>
                        )}
                        {exp.paymentMethod && (
                          <span className="text-[10px] text-white/60 bg-[#2A2A2A] px-1.5 py-0.5 rounded">
                            {exp.paymentMethod}
                          </span>
                        )}
                      </div>
                      {exp.date && (
                        <span className="text-[10px] text-white/40 block mt-0.5">
                          {formatDate(exp.date, 'medium')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-rose-400">
                        -{formatCurrency(exp.amount)}
                      </span>
                      <button
                        onClick={() => deleteExtraExpense(exp.id)}
                        className="text-white/40 hover:text-rose-400 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3B: Extra Cash / Income Boosts List */}
          {(() => {
            const isCurrentPayPeriod = summary.payday.date === nextPaydaySummary?.payday.date;
            if (!isCurrentPayPeriod && extraIncomes.length === 0) return null;

            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Extra Cash Boosts (+{formatCurrency(totalExtraIncome)})
                  </h4>

                  {isCurrentPayPeriod && (
                    <button
                      onClick={() => onOpenIncomeModal(payday.date)}
                      className="flex items-center gap-1 text-xs font-semibold text-[#A78BFA] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      + Add Cash
                    </button>
                  )}
                </div>

                {extraIncomes.length === 0 ? (
                  <p className="text-xs text-white/40 italic">No extra cash/income added for this pay period.</p>
                ) : (
                  <div className="space-y-2">
                    {extraIncomes.map(inc => (
                      <div
                        key={inc.id}
                        className="p-3 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {inc.source}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                              + Extra Cash
                            </span>
                          </div>
                          <span className="text-[10px] text-white/40 block mt-0.5">
                            Received {formatDate(inc.dateAdded, 'medium')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-400">
                            +{formatCurrency(inc.amount)}
                          </span>
                          <button
                            onClick={() => deleteExtraIncome(inc.id)}
                            className="text-white/40 hover:text-rose-400 transition-colors"
                            title="Delete extra cash entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Section 4: Paycheck Calculation Math Table */}
          <div className="p-4 rounded-2xl bg-[#000000] border border-[#2A2A2A] text-white space-y-2.5 text-xs font-mono">
            <div className="text-[11px] font-bold tracking-wider text-white/50 uppercase font-sans mb-2">
              Paycheck Math Breakdown
            </div>

            {payday.useTax && (
              <div className="border-b border-[#2A2A2A]/60 pb-2 mb-2 space-y-1 font-sans">
                <div className="text-[10px] text-[#A78BFA] font-bold tracking-wider uppercase mb-1">Income Breakdown:</div>
                <div className="flex justify-between text-white/70">
                  <span>Gross Pay:</span>
                  <span>{formatCurrency(payday.gross || 0)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>Tax ({payday.taxPercent}%):</span>
                  <span>-{formatCurrency((payday.gross || 0) - (payday.estimatedAmount || 0))}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Net Take-Home:</span>
                  <span>{formatCurrency(payday.estimatedAmount || 0)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-white/80">
              <span>Base Estimated Check:</span>
              <span className="font-semibold text-white">
                +{estimatedCheck !== null ? formatCurrency(estimatedCheck) : '$0.00'}
              </span>
            </div>

            {totalExtraIncome > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>+ Extra Cash Boosts ({extraIncomes.length}):</span>
                <span className="font-semibold">
                  +{formatCurrency(totalExtraIncome)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-white border-t border-[#2A2A2A]/60 pt-1.5 font-bold">
              <span>= Total Available Income:</span>
              <span>
                {totalAvailable !== null ? formatCurrency(totalAvailable) : '$0.00'}
              </span>
            </div>

            <div className="flex justify-between text-white/80">
              <span>- Total Bills ({assignedBills.length}):</span>
              <span className="font-semibold text-[#C084FC]">
                -{formatCurrency(totalBills)}
              </span>
            </div>

            {totalExtraExpenses > 0 && (
              <div className="flex justify-between text-white/80">
                <span>- Tracked Spending ({extraExpenses.length}):</span>
                <span className="font-semibold text-rose-400">
                  -{formatCurrency(totalExtraExpenses)}
                </span>
              </div>
            )}

            <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold font-sans">
              <span>Left Over Amount:</span>
              {(() => {
                const hasValidAvailable = (estimatedCheck !== null && estimatedCheck > 0) || totalExtraIncome > 0;
                if (hasValidAvailable && leftOver !== null) {
                  return (
                    <span className={leftOver >= 0 ? 'text-[#A78BFA]' : 'text-[#FCA5A5]'}>
                      {formatCurrency(leftOver)}
                    </span>
                  );
                }
                return (
                  <span className="text-[#9CA3AF] text-xs font-medium font-sans">
                    Waiting for estimate
                  </span>
                );
              })()}
            </div>
          </div>

        </div>
      )}

      <DeleteBillModal
        isOpen={!!deletingBill}
        onClose={() => setDeletingBill(null)}
        bill={deletingBill}
        paydayDate={summary.payday.date}
      />

    </div>
  );
};
