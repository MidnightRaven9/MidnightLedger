import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Receipt, 
  Calendar, 
  Activity, 
  AlertCircle,
  Filter,
  Check,
  Trash2
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { 
  formatDate, 
  formatCurrency, 
  formatMonthYear, 
  getOrdinalSuffix,
  toISODateString 
} from '../utils/dateUtils';
import { PaydaySummary } from '../types';
import { ClearDataModal } from '../components/ClearDataModal';
import { BillCard } from '../components/BillCard';

type FilterMode = 'all' | 'month' | string; // 'all' | 'month' | '2026' | '2025' etc.

export const HistoryView: React.FC = () => {
  const { summaries, bills, exportData, importData, toggleBillPaid, showToast, lastSaved } = usePayday();

  // State
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // e.g. '2026-08'
  const [expandedPaydayIds, setExpandedPaydayIds] = useState<Record<string, boolean>>({});
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [saveStatusText, setSaveStatusText] = useState('Data stored locally on this device');

  useEffect(() => {
    const updateText = () => {
      if (!lastSaved) {
        setSaveStatusText('Data stored locally on this device');
        return;
      }
      const savedTime = new Date(lastSaved).getTime();
      const diffMs = Date.now() - savedTime;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) {
        setSaveStatusText('Last saved: Just now • Data stored locally on this device');
      } else if (diffSec < 60) {
        setSaveStatusText(`Last saved: ${diffSec} sec ago • Data stored locally on this device`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin === 1) {
          setSaveStatusText('Last saved: 1 min ago • Data stored locally on this device');
        } else {
          setSaveStatusText(`Last saved: ${diffMin} min ago • Data stored locally on this device`);
        }
      }
    };

    updateText();
    const interval = setInterval(updateText, 10000); // update text every 10 seconds
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleCount(5);
  }, [filterMode, selectedMonth]);

  // Get current year and month strings
  const currentMonthStr = useMemo(() => toISODateString(new Date()).slice(0, 7), []);

  // Collect all unique years & months from summaries
  const { availableYears, availableMonths } = useMemo(() => {
    const yearsSet = new Set<string>();
    const monthsSet = new Set<string>();

    summaries.forEach(s => {
      if (s.payday.date) {
        const yr = s.payday.date.slice(0, 4);
        const mo = s.payday.date.slice(0, 7);
        yearsSet.add(yr);
        monthsSet.add(mo);
      }
    });

    const years = Array.from(yearsSet).sort().reverse();
    const months = Array.from(monthsSet).sort().reverse();

    return { availableYears: years, availableMonths: months };
  }, [summaries]);

  // Default selected month to current month if not set
  const activeMonthStr = selectedMonth || availableMonths[0] || currentMonthStr;

  // Filter summaries based on time selection
  const filteredSummaries = useMemo(() => {
    let result = [...summaries];

    if (filterMode === 'month') {
      result = result.filter(s => s.payday.date.startsWith(activeMonthStr));
    } else if (filterMode !== 'all') {
      // Filter by specific year (e.g. '2026')
      result = result.filter(s => s.payday.date.startsWith(filterMode));
    }

    // Sort newest paydays first
    return result.sort((a, b) => b.payday.date.localeCompare(a.payday.date));
  }, [summaries, filterMode, activeMonthStr]);

  // Handle Export / Import
  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `midnightledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exported successfully');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) showToast('Data imported successfully!');
        else showToast('Failed to import budget data');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const togglePaydayExpand = (id: string) => {
    setExpandedPaydayIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6 pb-32">
      
      {/* 1. Compact Backup & Header Row */}
      <div className="p-3.5 rounded-3xl bg-[#121212] border border-[#2A2A2A] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold shrink-0">
            <History className="w-5 h-5 text-[#C084FC]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              History & Allocations
            </h2>
            <p className="text-[13px] text-white/60">
              Past paycheck breakdown, payment timeline, and JSON backup.
            </p>
          </div>
        </div>

        {/* Compact Export / Import Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleExport}
            className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white/90 font-bold text-xs border border-[#2A2A2A] transition-colors cursor-pointer"
            title="Export full budget backup as JSON file"
          >
            <Download className="w-3.5 h-3.5 text-[#C084FC]" />
            Export JSON
          </button>

          <label 
            className="h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-violet-900/30"
            title="Import budget backup JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* 2. Time Control Bar */}
      <div className="h-[70px] flex items-center justify-between px-4 rounded-3xl bg-[#121212] border border-[#2A2A2A] shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-white/70">
          <Filter className="w-4 h-4 text-[#A78BFA]" />
          Filter History:
        </div>

        {/* Segmented Controls */}
        <div className="flex items-center p-1 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A]">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            All Time
          </button>

          <button
            onClick={() => {
              setFilterMode('month');
              if (!selectedMonth && availableMonths.length > 0) {
                setSelectedMonth(availableMonths[0]);
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'month'
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            By Month
          </button>

          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setFilterMode(year)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === year
                  ? 'bg-[#7C3AED] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Month Chips Strip (Visible when 'By Month' is selected) */}
      {filterMode === 'month' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
          {availableMonths.map(moStr => {
            const label = formatMonthYear(`${moStr}-01`);
            const isCurrent = moStr === currentMonthStr;
            const isSelected = moStr === activeMonthStr;

            return (
              <button
                key={moStr}
                onClick={() => setSelectedMonth(moStr)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-violet-950/50'
                    : 'bg-[#1E1B2E] text-white/70 border-[#3B236E] hover:text-white hover:border-[#7C3AED]'
                }`}
              >
                {label} {isCurrent ? '(Current)' : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Section A: Past Paycheck Allocations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#A78BFA]" />
            Past Paycheck Allocations
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1E1B2E] border border-[#3B236E] text-[#C084FC]">
              {filteredSummaries.length}
            </span>
          </h3>
        </div>

        {filteredSummaries.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-[#121212] border border-[#2A2A2A] text-white/60 space-y-3 shadow-md">
            <Clock className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-xs font-semibold">No paycheck history yet - your past paydays will appear here after your first pay period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSummaries.slice(0, visibleCount).map(summary => {
              const paydayId = summary.payday.id;
              const isExpanded = expandedPaydayIds[paydayId] ?? false;

              const totalAssigned = summary.assignedBills.length;
              const paidBills = summary.assignedBills.filter(b => b.isPaid);
              const paidCount = paidBills.length;
              const isAllPaid = totalAssigned > 0 && paidCount === totalAssigned;
              const unpaidCount = totalAssigned - paidCount;

              return (
                <div 
                  key={paydayId}
                  className="rounded-3xl bg-[#121212] border border-[#2A2A2A] overflow-hidden shadow-md transition-all hover:border-[#3B236E]"
                >
                  {/* Card Header */}
                  <div 
                    onClick={() => togglePaydayExpand(paydayId)}
                    className="h-[72px] flex items-center justify-between px-4 sm:px-5 cursor-pointer select-none hover:bg-[#181818] transition-colors"
                  >
                    {/* Left: One line info */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-extrabold text-white">
                        {formatDate(summary.payday.date)}
                      </span>
                      <span className="text-white/40">&bull;</span>
                      {summary.payday.estimatedAmount === 0 ? (
                        <span className="font-bold text-zinc-500">
                          Check: TBD
                        </span>
                      ) : (
                        <span className="font-bold text-[#A78BFA]">
                          Check: {formatCurrency(summary.payday.estimatedAmount)}
                        </span>
                      )}
                      <span className="text-white/40">&bull;</span>
                      <span className="text-white/60 font-medium">
                        {totalAssigned} Bill{totalAssigned === 1 ? '' : 's'} ({formatCurrency(summary.totalBills)})
                      </span>
                      {summary.totalExtraExpenses > 0 && (
                        <>
                          <span className="text-white/40">&bull;</span>
                          <span className="text-white/60 font-medium">
                            Extras: {formatCurrency(summary.totalExtraExpenses)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badge */}
                      {totalAssigned === 0 ? (
                        <span className="h-7 px-3 rounded-full bg-[#1E1E1E] text-white/50 text-xs font-bold border border-[#2A2A2A] flex items-center whitespace-nowrap">
                          No Bills Due
                        </span>
                      ) : isAllPaid ? (
                        <span className="h-7 px-3 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-extrabold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          All {paidCount} Paid
                          {summary.leftOver !== null && (
                            <span className="text-emerald-300 font-normal">({formatCurrency(summary.leftOver)})</span>
                          )}
                        </span>
                      ) : (
                        <span className="h-7 px-3 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-extrabold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                          <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
                          {unpaidCount} Unpaid ({paidCount}/{totalAssigned})
                        </span>
                      )}

                      <button className="p-1.5 rounded-xl bg-[#1E1E1E] text-white/60 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-5 border-t border-[#2A2A2A] bg-[#0A0A0A] space-y-4 pt-4">
                      
                      {/* Bills Assigned Table */}
                      <div>
                        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wider mb-2">
                          Assigned Bills & Status
                        </h4>

                        {summary.assignedBills.length === 0 ? (
                          <p className="text-xs text-white/40 italic">No bills assigned to this check.</p>
                        ) : (
                          <div className="space-y-2">
                            {summary.assignedBills.map(item => (
                              <BillCard
                                key={item.bill.id}
                                bill={item.bill}
                                viewMode="myShare"
                                isPaid={item.isPaid}
                                effectiveAmount={item.effectiveAmount}
                                dueFullDate={item.dueFullDate}
                                interactive={true}
                                onTogglePaid={() => toggleBillPaid(item.bill.id, summary.payday.date)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Extra Expenses for this pay period */}
                      {summary.extraExpenses.length > 0 && (
                        <div>
                          <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wider mb-2">
                            Tracked Extra Expenses
                          </h4>
                          <div className="space-y-1.5">
                            {summary.extraExpenses.map(expense => (
                              <div key={expense.id} className="p-2.5 rounded-xl bg-[#121212] border border-[#2A2A2A] flex items-center justify-between text-xs">
                                <span className="font-semibold text-white/90">{expense.description}</span>
                                <span className="font-bold text-rose-400">-{formatCurrency(expense.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Financial Summary Strip */}
                      <div className="p-3 rounded-2xl bg-[#121212] border border-[#2A2A2A] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-white/50 block">Check Estimate</span>
                          <span className="text-xs font-extrabold text-white">{formatCurrency(summary.payday.estimatedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Total Outflow</span>
                          <span className="text-xs font-extrabold text-rose-400">-{formatCurrency(summary.totalOutflow)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Total Bills</span>
                          <span className="text-xs font-extrabold text-[#A78BFA]">{formatCurrency(summary.totalBills)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Net Left Over</span>
                          <span className={`text-xs font-extrabold ${
                            (summary.leftOver ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {formatCurrency(summary.leftOver)}
                          </span>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}

            {/* Show More Button */}
            {filteredSummaries.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="px-5 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white font-extrabold text-xs border border-[#2A2A2A] transition-all cursor-pointer shadow-md"
                >
                  Show 5 more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Section B: Bill Payment History & Timeline */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C084FC]" />
            Bill Payment History & Timeline
          </h3>
        </div>

        {bills.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-[#121212] border border-[#2A2A2A] text-white/50">
            <p className="text-xs font-semibold">No bills configured in MidnightLedger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bills.map(bill => {
              // Find all assigned occurrences for this bill across summaries
              const billOccurrences: Array<{ paydayDate: string; isPaid: boolean; amount: number }> = [];

              summaries.forEach(s => {
                const assigned = s.assignedBills.find(ab => ab.bill.id === bill.id);
                if (assigned) {
                  billOccurrences.push({
                    paydayDate: s.payday.date,
                    isPaid: assigned.isPaid,
                    amount: assigned.effectiveAmount,
                  });
                }
              });

              // Sort occurrences ascending by date for timeline rendering
              billOccurrences.sort((a, b) => a.paydayDate.localeCompare(b.paydayDate));

              const totalAssigned = billOccurrences.length;
              const paidCount = billOccurrences.filter(o => o.isPaid).length;
              const lastPaidOccurrence = [...billOccurrences].reverse().find(o => o.isPaid);

              return (
                <div key={bill.id} className="p-3 rounded-3xl bg-[#121212] border border-[#2A2A2A] shadow-md space-y-3">
                  
                  {/* Bill Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white mb-0.5">{bill.name}</h4>
                      <p className="text-[11px] text-white/60">
                        {formatCurrency(bill.amount)} &bull; Due on the {getOrdinalSuffix(bill.dueDate)} of every month
                      </p>
                    </div>

                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#1E1B2E] border border-[#3B236E] text-[#C084FC]">
                      {bill.category}
                    </span>
                  </div>

                  {/* Payment Stats */}
                  <div className="flex items-center justify-between text-[13px] pt-1 border-t border-[#2A2A2A]/60">
                    <span className="text-white/70 font-semibold">
                      Paid {paidCount}/{totalAssigned} instances
                    </span>
                    {lastPaidOccurrence ? (
                      <span className="text-emerald-400 text-[11px] font-bold">
                        Last paid: {formatDate(lastPaidOccurrence.paydayDate)}
                      </span>
                    ) : (
                      <span className="text-white/40 text-[11px]">Unpaid</span>
                    )}
                  </div>

                  {/* Dot History Timeline */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-white/40 block mb-1.5">
                      Paycheck Timeline History:
                    </span>

                    {billOccurrences.length === 0 ? (
                      <p className="text-[10px] text-white/30 italic">No paydays calculated for this bill yet.</p>
                    ) : (
                      <div className="flex items-center gap-[6px] overflow-x-auto pb-1 scrollbar-none">
                        {billOccurrences.map((occ, idx) => (
                          <div 
                            key={`${occ.paydayDate}_${idx}`}
                            className="group relative flex flex-col items-center cursor-pointer shrink-0"
                          >
                            {/* Dot Indicator */}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              occ.isPaid 
                                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-950' 
                                : 'bg-[#1E1E1E] border border-[#3B236E] text-white/30'
                            }`}>
                              {occ.isPaid ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                              )}
                            </div>

                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                              <div className="px-2 py-1 rounded-lg bg-[#1E1B2E] border border-[#3B236E] text-[10px] text-white font-bold whitespace-nowrap shadow-xl">
                                {formatDate(occ.paydayDate)}: {occ.isPaid ? `Paid (${formatCurrency(occ.amount)})` : 'Unpaid'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Danger Zone - Factory Reset */}
      <div 
        className="p-3.5 rounded-3xl bg-[#1A1010] border border-[#EF444440] shadow-xl space-y-4 mt-8"
        style={{ backgroundColor: '#1A1010', border: '1px solid #EF444440' }}
      >
        <div>
          <h3 className="text-base font-extrabold text-[#F87171] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            Danger Zone
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Permanent actions that wipe your data.
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="w-full h-11 px-4 rounded-2xl bg-[#7F1D1D] hover:bg-rose-900 text-rose-200 border border-rose-800/80 font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#7F1D1D' }}
          >
            <Trash2 className="w-4 h-4 text-rose-300" />
            Factory Reset / Wipe All Data
          </button>
          <p className="text-[11px] text-white/50 text-center font-medium mt-2">
            This will wipe ALL data to share a clean app - bills, paydays, expenses, history, everything. You will start at 0.
          </p>
          <div className="text-[11px] text-[#A78BFA] text-center font-semibold mt-2.5">
            {saveStatusText}
          </div>
        </div>
      </div>

      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
      />

    </div>
  );
};
