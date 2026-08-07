import React, { useState } from 'react';
import { 
  Calendar, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock,
  ChevronDown
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { getCategoryEmoji } from '../utils/emojis';
import { PaydaySummary } from '../types';

interface PaydaysViewProps {
  onOpenScheduleModal: () => void;
  onOpenPaydayModal: () => void;
  onOpenIncomeModal?: (paydayDate: string) => void;
}

export const PaydaysView: React.FC<PaydaysViewProps> = ({
  onOpenScheduleModal,
  onOpenPaydayModal,
}) => {
  const { 
    schedule, 
    summaries, 
    deletePayday, 
    updatePayday, 
    updatePaydays, 
    showToast,
    toggleBillPaid,
    markAllBillsPaidInPayday,
    unmarkAllBillsPaidInPayday
  } = usePayday();
  
  const [estimateModalPayday, setEstimateModalPayday] = useState<PaydaySummary | null>(null);
  const [estimateModalInput, setEstimateModalInput] = useState<string>('');
  const [showAllPaydays, setShowAllPaydays] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (summaries.length > 0 && !expandedId) {
      const current = summaries[0]?.payday?.id || summaries[0]?.payday?.date;
      if (current) {
        setExpandedId(current);
      }
    }
  }, [summaries, expandedId]);

  const [useTax, setUseTax] = useState(false);
  const [grossInput, setGrossInput] = useState('');
  const [taxSelectType, setTaxSelectType] = useState('22');
  const [customTaxInput, setCustomTaxInput] = useState('');
  const [applyToAllFuture, setApplyToAllFuture] = useState(false);

  const openModal = (summary: PaydaySummary) => {
    setEstimateModalPayday(summary);
    const paydayObj = summary.payday;
    if (paydayObj.useTax) {
      setUseTax(true);
      setGrossInput(paydayObj.gross !== undefined && paydayObj.gross !== null ? String(paydayObj.gross) : '');
      const tPercent = paydayObj.taxPercent !== undefined ? paydayObj.taxPercent : 22;
      setTaxSelectType([10, 12, 15, 18, 20, 22, 25, 30].includes(tPercent) ? String(tPercent) : 'custom');
      setCustomTaxInput([10, 12, 15, 18, 20, 22, 25, 30].includes(tPercent) ? '' : String(tPercent));
      setEstimateModalInput('');
    } else {
      setUseTax(false);
      setEstimateModalInput(summary.estimatedCheck !== null ? String(summary.estimatedCheck) : '');
      setGrossInput('');
      setTaxSelectType('22');
      setCustomTaxInput('');
    }
    setApplyToAllFuture(false);
  };

  const getScheduleLabel = () => {
    switch (schedule.frequency) {
      case 'weekly': return 'Weekly Paycheck Schedule';
      case 'biweekly': return 'Bi-weekly Paycheck Schedule (Every 2 weeks)';
      case 'twice_monthly': return `Twice a Month (${schedule.firstDayOfMonth || 1}st & ${schedule.secondDayOfMonth || 15}th)`;
      case 'monthly': return `Monthly (${schedule.monthlyDay || 15}th of each month)`;
      case 'manual': return 'Manual Custom Dates';
      default: return 'Bi-weekly Paycheck Schedule (Every 2 weeks)';
    }
  };

  const displayedSummaries = showAllPaydays ? summaries : summaries.slice(0, 5);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white p-3 sm:p-6 pb-28 space-y-5">
      
      {/* Top Hero Card: Payday Schedule & Projections */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[#121212] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-[30px] leading-[1.1] font-black tracking-tight text-white">
              Payday Schedule
            </h1>
            <p className="text-[15px] leading-6 text-zinc-400 mt-3 max-w-[90%]">
              Current Rule: <span className="font-semibold text-[#A78BFA]">{getScheduleLabel()}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full pt-2">
          <button
            onClick={onOpenPaydayModal}
            className="h-11 rounded-2xl bg-[#1A1A1A] hover:bg-[#252525] border border-zinc-800 text-white font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate px-2 box-border w-full"
          >
            <Plus className="w-4 h-4 text-[#A78BFA] shrink-0" />
            <span className="truncate">Add Custom Date</span>
          </button>
          
          <button
            onClick={onOpenScheduleModal}
            className="h-11 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 shadow-[0_8px_20px_rgba(124,58,237,0.3)] cursor-pointer truncate px-2 box-border w-full"
          >
            <Settings className="w-4 h-4 text-[#DDD6FE] shrink-0" />
            <span className="truncate">Change Rule</span>
          </button>
        </div>
      </div>

      {/* Projected Upcoming Paydays Section Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#A78BFA]" />
          Projected Upcoming Paydays ({summaries.length})
        </h3>
      </div>

      {/* Payday Cards Grid / Stack */}
      {summaries.length === 0 ? (
        <div className="p-8 text-center rounded-[24px] border border-zinc-800/50 bg-[#121212] text-white space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No pay schedule configured</h4>
          <p className="text-xs text-white/60">Configure your schedule above to see projected paydays.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayedSummaries.map((summary) => {
            const { payday, assignedBills, totalBills, estimatedCheck, leftOver, status } = summary;
            const hasAmount = estimatedCheck !== null && estimatedCheck > 0;
            const isUserAdded = payday.isManual && payday.id.startsWith('payday_');
            const paydayId = payday.id || payday.date;
            const isExpanded = expandedId === paydayId;
            const paidCount = assignedBills.filter(b => b.isPaid).length;

            return (
              <div 
                key={payday.date}
                className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-4 sm:p-5 space-y-3 hover:border-[#7C3AED]/40 transition-all w-full max-w-full overflow-hidden box-border"
              >
                {/* Top Row: Date Badge + Title/Bills */}
                <div className="w-full min-w-0 max-w-full overflow-hidden flex items-start justify-between gap-2">
                  <div className="flex gap-2.5 min-w-0 flex-1 overflow-hidden">
                    {/* Big purple date badge */}
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#2a1f4a] border border-[#3B236E] flex flex-col items-center justify-center shadow-inner">
                      <span className="text-[10px] font-black text-purple-400 uppercase">
                        {formatDate(payday.date, 'short').split('/')[0]}
                      </span>
                      <span className="text-[22px] font-black text-white leading-none">
                        {String(payday.date || '').split('-')[2] || ''}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[15px] font-bold text-white truncate leading-tight">
                          {formatDate(payday.date, 'medium')}
                        </p>
                        {isUserAdded && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2E1B3E] text-[#C084FC] border border-[#58236E] shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                        {hasAmount ? `${formatCurrency(estimatedCheck)} avail` : 'Amount TBD'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate leading-tight">
                        {assignedBills.length} bills ({formatCurrency(totalBills)})
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[14px] font-black text-purple-400">
                      {hasAmount && leftOver !== null ? formatCurrency(leftOver) : formatCurrency(totalBills)}
                    </span>
                    {isUserAdded && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove custom payday on ${payday.date}?`)) {
                            deletePayday(payday.id);
                          }
                        }}
                        className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors"
                        title="Delete custom payday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Est. Check / Left Over */}
                <div className="pt-2.5 border-t border-[#2A2A2A] flex items-center justify-between gap-2 w-full max-w-full overflow-hidden">
                  
                  {/* Est. Check (Clickable to edit) */}
                  <div 
                    onClick={() => {
                      openModal(summary);
                    }}
                    className="cursor-pointer group flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden"
                  >
                    <div className="min-w-0 overflow-hidden">
                      <span className="text-[10px] text-[#9CA3AF] font-medium block group-hover:text-white transition-colors flex items-center gap-1 truncate">
                        Est. Check <Edit3 className="w-2.5 h-2.5 text-[#A78BFA] shrink-0" />
                      </span>
                      {hasAmount ? (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#C084FC] transition-colors leading-tight truncate">
                            {formatCurrency(estimatedCheck)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-[#9CA3AF]">TBD</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED] text-[#A78BFA] font-semibold text-[10px] shrink-0">
                            Set
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left Over */}
                  <div className="text-right shrink-0 min-w-0">
                    <span className="text-[10px] text-[#9CA3AF] font-medium block truncate">
                      Left Over
                    </span>
                    {hasAmount && leftOver !== null ? (
                      <span className={`text-xs sm:text-sm font-bold truncate block ${status === 'positive' ? 'text-[#A78BFA]' : status === 'negative' ? 'text-rose-400' : 'text-white'}`}>
                        {formatCurrency(leftOver)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-white/40 truncate block">
                        Waiting
                      </span>
                    )}
                  </div>

                </div>

                {/* Collapsible Assigned Bills Section */}
                <div className="mt-3 border-t border-zinc-800/60 pt-3 w-full max-w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : paydayId)}
                    className="w-full flex items-center justify-between py-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">
                        BILLS ({assignedBills.length})
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {paidCount}/{assignedBills.length} paid
                      </span>
                    </div>
                    <span className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 animate-in slide-in-from-top-1 space-y-2 w-full max-w-full overflow-hidden">
                      {assignedBills.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#0f0f12] p-3 text-center">
                          <p className="text-zinc-500 text-[12px]">No bills assigned to this paycheck period.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 w-full max-w-full overflow-hidden">
                          {assignedBills.map(assigned => {
                            const { bill, effectiveAmount, isPaid, dueFullDate } = assigned;
                            const billEmoji = bill.emoji || getCategoryEmoji(bill.category);

                            return (
                              <div
                                key={bill.id}
                                id={`bill-${bill.id}`}
                                onClick={() => toggleBillPaid(bill.id, payday.date)}
                                className={`w-full min-w-0 max-w-full overflow-hidden flex items-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all box-border ${
                                  isPaid ? 'paid-bill bg-purple-600/10 border-purple-600/30' : 'bg-[#1a1a1a] border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBillPaid(bill.id, payday.date);
                                  }}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isPaid ? 'bg-purple-600 border-purple-600' : 'border-zinc-600 hover:border-zinc-400'
                                  }`}
                                  title={isPaid ? "Mark Unpaid" : "Mark Paid"}
                                >
                                  {isPaid && <span className="text-white text-xs font-bold">✓</span>}
                                </button>
                                
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className={`text-[14px] font-bold truncate ${isPaid ? 'line-through text-zinc-500' : 'text-white'}`}>
                                    {isPaid ? '💜 ' : `${billEmoji} `}{bill.name}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 truncate">
                                    Due {formatDate(dueFullDate, 'short')}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right min-w-0">
                                  <p className={`text-[15px] font-bold ${isPaid ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                    {formatCurrency(effectiveAmount)}
                                  </p>
                                  <p className="text-[10px] text-purple-400 capitalize truncate">
                                    {bill.type || 'fixed'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dynamic Action Buttons */}
                      {(() => {
                        const allPaid = assignedBills.length > 0 && assignedBills.every(b => b.isPaid);
                        return (
                          <div className="grid grid-cols-2 gap-2 mt-3 w-full max-w-full">
                            <button
                              onClick={() => openModal(summary)}
                              className="h-[44px] rounded-full bg-[#7C3AED] hover:bg-purple-700 text-white font-bold text-[13px] transition-all cursor-pointer shadow-md truncate"
                            >
                              Edit Bills
                            </button>
                            {allPaid ? (
                              <button
                                onClick={() => unmarkAllBillsPaidInPayday(payday.date)}
                                className="h-[44px] rounded-full bg-[#1e1e1e] hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-[13px] flex items-center justify-center gap-1 transition-all cursor-pointer truncate px-1"
                              >
                                ↩️ Unmark All Paid
                              </button>
                            ) : (
                              <button
                                onClick={() => markAllBillsPaidInPayday(payday.date)}
                                className="h-[44px] rounded-full bg-[#1e1e1e] hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-[13px] flex items-center justify-center gap-1 transition-all cursor-pointer truncate px-1"
                              >
                                ✅ Mark All Paid
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {!isExpanded && assignedBills.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-zinc-500 truncate">
                      {assignedBills.length} bills • {formatCurrency(totalBills)} • Tap to expand
                    </div>
                  )}
                </div>

              </div>
            );
          })}

          {!showAllPaydays && summaries.length > 5 && (
            <button
              onClick={() => setShowAllPaydays(true)}
              className="w-full py-3 rounded-2xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-[#A78BFA] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              Show {summaries.length - 5} more paydays (to Dec) <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Edit / Set Estimate Modal */}
      {(() => {
        if (!estimateModalPayday) return null;

        const activeTaxPercent = taxSelectType === 'custom' 
          ? (parseFloat(customTaxInput) || 0) 
          : parseFloat(taxSelectType);

        const grossVal = parseFloat(grossInput) || 0;
        const computedNet = useTax 
          ? Math.round(grossVal * (1 - activeTaxPercent / 100)) 
          : (parseFloat(estimateModalInput) || 0);

        const displayNetVal = useTax ? String(computedNet) : estimateModalInput;
        const saveButtonText = useTax ? `Save Net ${formatCurrency(computedNet)}` : 'Save Estimate';

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Edit Estimate – {formatDate(estimateModalPayday.payday.date, 'medium')}
                </h3>
                <button
                  onClick={() => setEstimateModalPayday(null)}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-[#1E1E1E] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Bills Info block */}
              <div className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-white/70 flex justify-between items-center">
                <span>Bills due this period:</span>
                <span className="font-bold text-white">
                  {formatCurrency(estimateModalPayday.totalBills)} ({estimateModalPayday.assignedBills.length} bills)
                </span>
              </div>

              {/* Estimate Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80 block">
                  Estimate Amount (Net Take-Home)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={useTax}
                    placeholder="e.g. 1450.00"
                    value={displayNetVal}
                    onChange={(e) => setEstimateModalInput(e.target.value)}
                    autoFocus={!useTax}
                    className={`w-full pl-8 pr-4 py-3 rounded-xl bg-[#1E1E1E] border text-white font-bold text-base transition-colors focus:outline-none ${
                      useTax 
                        ? 'border-[#2A2A2A] text-white/40 bg-[#151515] cursor-not-allowed' 
                        : 'border-[#2A2A2A] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-white/40">
                  {useTax 
                    ? 'Calculated from gross and tax percent below' 
                    : 'Enter estimated paycheck amount or clear to return to TBD'}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-[#2A2A2A] my-4" />

              {/* Tax Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white/80 block">Apply tax estimate?</span>
                  <span className="text-[11px] text-white/50 block">Enter gross pay and tax % to auto-calculate net</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseTax(!useTax)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useTax ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${useTax ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {/* Tax Toggle ON content */}
              {useTax && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                  {/* Gross Pay */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/80 block">Gross Pay</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 1800.00"
                        value={grossInput}
                        onChange={e => setGrossInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-white font-semibold text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      />
                    </div>
                  </div>

                  {/* Tax Dropdown & Custom Option */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 block">Tax %</label>
                      <select
                        value={taxSelectType}
                        onChange={e => {
                          setTaxSelectType(e.target.value);
                          if (e.target.value !== 'custom') {
                            setCustomTaxInput('');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      >
                        <option value="10">10%</option>
                        <option value="12">12%</option>
                        <option value="15">15%</option>
                        <option value="18">18%</option>
                        <option value="20">20%</option>
                        <option value="22">22%</option>
                        <option value="25">25%</option>
                        <option value="30">30%</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {taxSelectType === 'custom' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/80 block">Custom Tax %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 22"
                            value={customTaxInput}
                            onChange={e => setCustomTaxInput(e.target.value)}
                            className="w-full pr-8 pl-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Calculation Card */}
                  <div className="p-4 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-sm font-mono space-y-1.5">
                    <div className="flex justify-between text-white/80">
                      <span>Gross Pay:</span>
                      <span className="font-semibold text-white">{formatCurrency(grossVal)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Tax ({activeTaxPercent}%):</span>
                      <span>-{formatCurrency(grossVal - computedNet)}</span>
                    </div>
                    <div className="border-t border-[#2D2D2D] pt-2 flex justify-between text-[18px] font-bold font-sans text-emerald-400">
                      <span>Net:</span>
                      <span>{formatCurrency(computedNet)}</span>
                    </div>
                  </div>

                  {/* Future TBD option */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToAllFuture}
                      onChange={e => setApplyToAllFuture(e.target.checked)}
                      className="mt-1 accent-[#7C3AED] h-4 w-4 rounded border-[#2A2A2A] bg-[#1E1E1E] text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white">Apply this tax % to all future TBD paychecks?</span>
                      <p className="text-[10px] text-white/50">Will auto-set {activeTaxPercent}% for next pay periods</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                {estimateModalPayday.estimatedCheck !== null ? (
                  <button
                    onClick={() => {
                      updatePayday({
                        id: estimateModalPayday.payday.id || `auto_${estimateModalPayday.payday.date}`,
                        date: estimateModalPayday.payday.date,
                        estimatedAmount: null,
                        useTax: false,
                        isManual: true,
                      });
                      showToast(`Cleared estimate for ${formatDate(estimateModalPayday.payday.date, 'short')}`);
                      setEstimateModalPayday(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold text-xs border border-rose-900/50 transition-colors"
                  >
                    Clear to TBD
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEstimateModalPayday(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white/70 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const dateStr = estimateModalPayday.payday.date;

                      if (useTax) {
                        updatePayday({
                          id: estimateModalPayday.payday.id || `auto_${dateStr}`,
                          date: dateStr,
                          estimatedAmount: computedNet,
                          gross: grossVal,
                          taxPercent: activeTaxPercent,
                          useTax: true,
                          isManual: true,
                        });

                        if (applyToAllFuture) {
                          const updates = summaries
                            .filter(s => s.payday.date > dateStr && s.payday.estimatedAmount === null)
                            .map(s => ({
                              id: s.payday.id || `auto_${s.payday.date}`,
                              date: s.payday.date,
                              estimatedAmount: null,
                              taxPercent: activeTaxPercent,
                              useTax: true,
                              isManual: true,
                            }));
                          if (updates.length > 0) {
                            updatePaydays(updates);
                          }
                          showToast(`Saved estimate & set tax ${activeTaxPercent}% for future TBD paychecks`);
                        } else {
                          showToast(`Updated estimate for ${formatDate(dateStr, 'short')} to ${formatCurrency(computedNet)}`);
                        }
                      } else {
                        const parsed = parseFloat(estimateModalInput);
                        updatePayday({
                          id: estimateModalPayday.payday.id || `auto_${dateStr}`,
                          date: dateStr,
                          estimatedAmount: isNaN(parsed) ? null : parsed,
                          useTax: false,
                          isManual: true,
                        });
                        showToast(`Updated estimate for ${formatDate(dateStr, 'short')} to ${formatCurrency(isNaN(parsed) ? 0 : parsed)}`);
                      }
                      setEstimateModalPayday(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
                  >
                    {saveButtonText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
