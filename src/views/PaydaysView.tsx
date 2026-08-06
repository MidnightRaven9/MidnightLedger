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
  const { schedule, summaries, deletePayday, updatePayday, updatePaydays, showToast } = usePayday();
  
  const [estimateModalPayday, setEstimateModalPayday] = useState<PaydaySummary | null>(null);
  const [estimateModalInput, setEstimateModalInput] = useState<string>('');
  const [showAllPaydays, setShowAllPaydays] = useState(false);

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
    <div className="space-y-5 pb-32">
      
      {/* Top Card: Payday Schedule & Projections */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-lg space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#C084FC]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Payday Schedule & Projections</h2>
            <p className="text-xs text-white/60 mt-0.5">
              Current Schedule Rule: <span className="font-semibold text-[#A78BFA]">{getScheduleLabel()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button
            onClick={onOpenPaydayModal}
            className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-[#2A2A2A] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#A78BFA]" />
            Add Custom Date
          </button>
          
          <button
            onClick={onOpenScheduleModal}
            className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#DDD6FE]" />
            Change Schedule Rule
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
        <div className="p-12 text-center rounded-2xl bg-[#121212] border border-[#2A2A2A] text-white space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No pay schedule configured</h4>
          <p className="text-xs text-white/60">Configure your schedule above to see projected paydays.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedSummaries.map((summary) => {
            const { payday, assignedBills, totalBills, estimatedCheck, leftOver, status } = summary;
            const hasAmount = estimatedCheck !== null && estimatedCheck > 0;
            const isUserAdded = payday.isManual && payday.id.startsWith('payday_');

            return (
              <div 
                key={payday.date}
                className="p-4 sm:p-5 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-lg space-y-3.5 hover:border-[#7C3AED]/40 transition-all"
              >
                {/* Top Row: Date Badge + Title/Bills */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Big purple date badge */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#1E1B2E] border border-[#3B236E] flex flex-col items-center justify-center text-[#A78BFA] font-bold shrink-0 shadow-inner">
                      <span className="text-[10px] uppercase font-semibold text-[#C084FC]">
                        {formatDate(payday.date, 'short').split('/')[0]}
                      </span>
                      <span className="text-xl sm:text-2xl leading-none font-extrabold text-white">
                        {String(payday.date || '').split('-')[2] || ''}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-white">
                          {formatDate(payday.date, 'medium')}
                        </h4>
                        {isUserAdded && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2E1B3E] text-[#C084FC] border border-[#58236E]">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">
                        {assignedBills.length} bills assigned • Due total: <span className="text-white/80 font-semibold">{formatCurrency(totalBills)}</span>
                      </p>
                    </div>
                  </div>

                  {isUserAdded && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove custom payday on ${payday.date}?`)) {
                          deletePayday(payday.id);
                        }
                      }}
                      className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete custom payday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Bottom Row: Est. Check / Left Over */}
                <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between gap-4">
                  
                  {/* Est. Check (Clickable to edit) */}
                  <div 
                    onClick={() => {
                      openModal(summary);
                    }}
                    className="cursor-pointer group flex items-center gap-2"
                  >
                    <div>
                      <span className="text-[11px] text-[#9CA3AF] font-medium block group-hover:text-white transition-colors flex items-center gap-1">
                        Est. Check <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#A78BFA] transition-opacity" />
                      </span>
                      {hasAmount ? (
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-white group-hover:text-[#C084FC] transition-colors leading-tight">
                            {formatCurrency(estimatedCheck)}
                          </span>
                          {payday.useTax && (
                            <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors flex items-center gap-1 leading-none mt-0.5 font-mono">
                              ({formatCurrency(payday.gross || 0)} gross - {payday.taxPercent}% tax)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-bold text-[#9CA3AF]">TBD</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED] text-[#A78BFA] font-semibold text-[11px]">
                              Set Estimate
                            </span>
                          </div>
                          {payday.useTax && (
                            <span className="text-[11px] text-white/40 mt-1 font-mono">
                              (Prefilled: {payday.taxPercent}% tax)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left Over */}
                  <div className="text-right">
                    <span className="text-[11px] text-[#9CA3AF] font-medium block">
                      Left Over
                    </span>
                    {hasAmount && leftOver !== null ? (
                      <span className={`text-base font-bold ${status === 'positive' ? 'text-[#A78BFA]' : status === 'negative' ? 'text-rose-400' : 'text-white'}`}>
                        {formatCurrency(leftOver)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-white/40">
                        Waiting for amount
                      </span>
                    )}
                  </div>

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
