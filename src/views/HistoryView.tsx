import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock,
  Receipt,
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

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // e.g. '2026-08'
  const [expandedPaydayIds, setExpandedPaydayIds] = useState<Record<string, boolean>>({});
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
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

  useEffect(() => {
    setVisibleCount(5);
    setIsExpanded(false);
  }, [filterMode, selectedMonth]);

  const currentMonthStr = useMemo(() => toISODateString(new Date()).slice(0, 7), []);

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

  const activeMonthStr = selectedMonth || availableMonths[0] || currentMonthStr;

  const filteredSummaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = summaries.filter(s => {
      const [year, month, day] = s.payday.date.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      d.setHours(0, 0, 0, 0);
      return d <= today;
    });

    if (filterMode === 'month') {
      result = result.filter(s => s.payday.date.startsWith(activeMonthStr));
    } else if (filterMode !== 'all') {
      result = result.filter(s => s.payday.date.startsWith(filterMode));
    }

    const mapByDate = new Map<string, PaydaySummary>();
    result.forEach(s => {
      const dateKey = s.payday.date;
      if (!mapByDate.has(dateKey)) {
        mapByDate.set(dateKey, s);
      } else {
        const existing = mapByDate.get(dateKey)!;
        const sCheck = s.payday.estimatedAmount ?? 0;
        const eCheck = existing.payday.estimatedAmount ?? 0;
        if ((eCheck === 0 && sCheck > 0) || s.payday.isManual || s.assignedBills.length > existing.assignedBills.length) {
          mapByDate.set(dateKey, s);
        }
      }
    });

    return Array.from(mapByDate.values()).sort((a, b) => b.payday.date.localeCompare(a.payday.date));
  }, [summaries, filterMode, activeMonthStr]);

  const totalCount = filteredSummaries.length;

  const handleToggle = () => {
    if (isExpanded) {
      setVisibleCount(5);
      setIsExpanded(false);
      document.getElementById('paycheck-history-top')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      const nextCount = visibleCount + 5;
      setVisibleCount(nextCount);
      if (nextCount >= totalCount) {
        setIsExpanded(true);
      }
    }
  };

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `midnightledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[var(--bg)] text-white p-3 sm:p-6 pb-28 space-y-5">
      
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[var(--surface)] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <History className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-[30px] leading-[1.1] font-black tracking-tight text-white">
              History & Allocations
            </h1>
            <p className="text-[15px] leading-6 text-zinc-400 mt-3 max-w-[90%]">
              Past paycheck breakdown, payment timeline, and JSON backup.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleExport}
            className="flex-1 h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--border)] text-white font-bold text-xs border border-zinc-800 transition-colors cursor-pointer"
            title="Export full budget backup as JSON file"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            Export JSON
          </button>

          <label 
            className="flex-1 h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white font-bold text-xs cursor-pointer transition-all"
            title="Import budget backup JSON file"
          >
            <Upload className="w-4 h-4 text-white" />
            Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-zinc-800/50 bg-[var(--surface)] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white/70">
          <Filter className="w-4 h-4 text-[var(--accent)]" />
          Filter History:
        </div>

        <div className="flex items-center p-1 rounded-2xl bg-[var(--surface-2)] border border-zinc-800 flex-wrap gap-1">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[var(--accent)] text-white shadow-md'
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
                ? 'bg-[var(--accent)] text-white shadow-md'
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
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

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
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                    : 'bg-[var(--accent-soft)] text-white/70 border-[var(--border-strong)] hover:text-white hover:border-[var(--accent)]'
                }`}
              >
                {label} {isCurrent ? '(Current)' : ''}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4" id="paycheck-history-top">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[var(--accent)]" />
            Past Paycheck Allocations
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)]">
              {filteredSummaries.length}
            </span>
          </h3>
        </div>

        {filteredSummaries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            No past paychecks yet<br/>
            <span style={{ fontSize: '12px' }}>Allocations will appear here after your first paycheck date</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSummaries.slice(0, visibleCount).map(summary => {
              const paydayId = summary.payday.id;
              const isPaydayExpanded = expandedPaydayIds[paydayId] ?? false;

              const checkAmount = summary.payday.estimatedAmount ?? (summary.totalAvailable ?? 0);
              const hasCheckAmount = checkAmount > 0;

              const totalAssigned = summary.assignedBills.length;
              const paidBills = summary.assignedBills.filter(b => b.isPaid);
              const paidCount = paidBills.length;
              const isAllPaid = totalAssigned > 0 && paidCount === totalAssigned;
              const unpaidCount = totalAssigned - paidCount;

              return (
                <div 
                  key={paydayId}
                  className="rounded-[24px] bg-[var(--surface)] border border-zinc-800/50 p-5 sm:p-6 mb-3 w-full overflow-visible transition-all hover:border-[var(--border-strong)]/60 allocation-card"
                >
                  <div 
                    onClick={() => togglePaydayExpand(paydayId)}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 leading-normal">
                        <div className="text-sm text-white/60 leading-[1.5]">
                          {formatDate(summary.payday.date)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap leading-[1.4]">
                          {!hasCheckAmount ? (
                            <span className="text-zinc-500 font-semibold text-[16px] leading-[1.4]">
                              No amount set
                            </span>
                          ) : (
                            <span className="text-[var(--accent)] font-semibold text-[16px] leading-[1.4]">
                              Allocated: {formatCurrency(summary.totalBills)} / {formatCurrency(checkAmount)}
                            </span>
                          )}
                          <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                          
                          {totalAssigned === 0 ? (
                            <span className="bg-[var(--surface-2)] text-white/50 text-xs px-2.5 py-1 rounded-full border border-[var(--border)] font-semibold">
                              No Bills
                            </span>
                          ) : isAllPaid ? (
                            <span className="bg-emerald-950/60 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Paid ({paidCount}/{totalAssigned})
                            </span>
                          ) : paidCount === 0 ? (
                            <span className="bg-rose-950/60 text-rose-400 text-xs px-2.5 py-1 rounded-full border border-rose-800/60 flex items-center gap-1 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              Unpaid ({paidCount}/{totalAssigned})
                            </span>
                          ) : (
                            <span className="bg-amber-950/60 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-800/60 flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {unpaidCount} Unpaid ({paidCount}/{totalAssigned})
                            </span>
                          )}
                        </div>
                        <div className="text-[14px] text-white/50 leading-[1.5]">
                          {totalAssigned} Bill{totalAssigned === 1 ? '' : 's'}
                          {summary.totalExtraExpenses > 0 && ` + Extras: ${formatCurrency(summary.totalExtraExpenses)}`}
                        </div>
                      </div>

                      <button className="p-1.5 rounded-xl bg-[var(--surface-2)] text-white/60 hover:text-white transition-colors shrink-0">
                        {isPaydayExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isPaydayExpanded && (
                    <div className="border-t border-[var(--border)]/60 bg-[var(--bg)] space-y-4 pt-4 mt-4 rounded-2xl p-3 overflow-visible">
                      
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

                      {summary.extraExpenses.length > 0 && (
                        <div>
                          <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wider mb-2">
                            Tracked Extra Expenses
                          </h4>
                          <div className="space-y-1.5">
                            {summary.extraExpenses.map(expense => (
                              <div key={expense.id} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs">
                                <span className="font-semibold text-white/90">{expense.description}</span>
                                <span className="font-bold text-rose-400">-{formatCurrency(expense.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-white/50 block">Check Estimate</span>
                          <span className="text-xs font-extrabold text-white">
                            {hasCheckAmount ? formatCurrency(checkAmount) : 'No amount set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Total Outflow</span>
                          <span className="text-xs font-extrabold text-rose-400">-{formatCurrency(summary.totalOutflow)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Total Bills</span>
                          <span className="text-xs font-extrabold text-[var(--accent)]">{formatCurrency(summary.totalBills)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/50 block">Net Left Over</span>
                          <span className={`text-xs font-extrabold ${
                            !hasCheckAmount ? 'text-zinc-500' : (summary.leftOver ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {hasCheckAmount ? formatCurrency(summary.leftOver) : 'N/A'}
                          </span>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}

            <div className="flex justify-center py-3">
              {visibleCount < totalCount ? (
                <button 
                  onClick={handleToggle} 
                  className="bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg text-xs font-extrabold cursor-pointer border border-[var(--accent)]"
                >
                  <ChevronDown className="w-4 h-4" /> Show 5 more ({totalCount - visibleCount} remaining)
                </button>
              ) : totalCount > 5 && (
                <button 
                  onClick={handleToggle} 
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-full flex items-center gap-2 border border-zinc-700 text-xs font-extrabold cursor-pointer shadow-lg"
                >
                  <ChevronUp className="w-4 h-4" /> Show less
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent)]" />
            Bill Payment History & Timeline
          </h3>
        </div>

        {bills.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-white/50">
            <p className="text-xs font-semibold">No bills configured in MidnightLedger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bills.map(bill => {
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

              billOccurrences.sort((a, b) => a.paydayDate.localeCompare(b.paydayDate));

              const totalAssigned = billOccurrences.length;
              const paidCount = billOccurrences.filter(o => o.isPaid).length;
              const lastPaidOccurrence = [...billOccurrences].reverse().find(o => o.isPaid);

              return (
                <div key={bill.id} className="p-3 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3">
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white mb-0.5">{bill.name}</h4>
                      <p className="text-[11px] text-white/60">
                        {formatCurrency(bill.amount)} &bull; Due on the {getOrdinalSuffix(bill.dueDate)} of every month
                      </p>
                    </div>

                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)]">
                      {bill.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[13px] pt-1 border-t border-[var(--border)]/60">
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

                  <div className="pt-1">
                    {billOccurrences.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#0D0D0D] border border-dashed border-[var(--border)]">
                        <p className="text-xs text-white/50 italic">No paycheck history yet - dots will appear after your first allocation</p>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-white/40 block mb-1.5">
                          Paycheck Timeline History:
                        </span>
                        <div className="flex items-center gap-[6px] overflow-x-auto pb-1 scrollbar-none">
                          {billOccurrences.map((occ, idx) => (
                            <div 
                              key={`${occ.paydayDate}_${idx}`}
                              className="group relative flex flex-col items-center cursor-pointer shrink-0"
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                occ.isPaid 
                                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-950' 
                                  : 'bg-[var(--surface-2)] border border-[var(--border-strong)] text-white/30'
                              }`}>
                                {occ.isPaid ? (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                ) : (
                                  <div className="w-1 h-1 rounded-full bg-white/30" />
                                )}
                              </div>

                              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                <div className="px-2 py-1 rounded-lg bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[10px] text-white font-bold whitespace-nowrap shadow-xl">
                                  {formatDate(occ.paydayDate)}: {occ.isPaid ? `Paid (${formatCurrency(occ.amount)})` : 'Unpaid'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <div 
        className="p-5 sm:p-6 rounded-[24px] bg-[#1A1010] border border-[#EF444440] shadow-xl space-y-4 mt-8"
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
          <div className="text-[11px] text-[var(--accent)] text-center font-semibold mt-2.5">
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
