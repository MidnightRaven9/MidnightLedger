import React, { useState, useEffect, useRef } from 'react';
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
  Edit3, Edit2
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatDate, formatCurrency, parseISODate } from '../utils/dateUtils';
import { getCategoryEmoji, CATEGORY_EMOJIS, triggerConfetti, triggerPurpleHearts } from '../utils/emojis';
import { tryCelebrate } from '../utils/celebrate';
import { PaydaySummary } from '../types';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { EditItemsModal } from '../components/EditItemsModal';
import { getCategoryColor } from '../utils/categoryColors';
import { BillCard } from '../components/BillCard';

interface PaycheckCardProps {
  summaryItem: PaydaySummary;
  initialOpen?: boolean;
  onOpenBillModal: (billToEdit?: any) => void;
  onNavigateToTab: (tab: 'bills' | 'paydays' | 'expenses' | 'reports' | 'history') => void;
  onEditItems: (date: string) => void;
  toggleBillPaid: (billId: string, date: string) => void;
}


function useAnimatedNumber(value: number, duration: number = 200) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const startValue = displayValue;
    const change = value - startValue;

    if (change === 0) return;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // ease out cubic
      const easeProgress = 1 - Math.pow(1 - percentage, 3);
      
      setDisplayValue(startValue + change * easeProgress);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return displayValue;
}

const PaycheckCard: React.FC<PaycheckCardProps> = ({
  summaryItem,
  initialOpen = false,
  onOpenBillModal,
  onNavigateToTab,
  onEditItems,
  toggleBillPaid,
}) => {

  const { markAllBillsPaidInPayday, unmarkAllBillsPaidInPayday, paidStatuses, setVariableOverride, showToast } = usePayday();
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState('');
  const [isOpen, setIsOpen] = useState(initialOpen);
  const dateStr = summaryItem.payday.date;
  const hasAmt = summaryItem.estimatedCheck !== null;

  const parsedDate = parseISODate(dateStr);
  const monthAbbr = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(parsedDate.getDate());


  
  const billsCount = summaryItem.assignedBills.length;
  
  const extraItems = summaryItem.extraExpenses.map(exp => {
    const isExpense = exp.category && exp.category !== 'Bills' && exp.category !== 'Other' && exp.category !== 'Bills / One-Time';
    const isPaid = !!paidStatuses[`${exp.id}::${dateStr}`];
    return {
      id: exp.id,
      type: isExpense ? 'expense' : 'one-time',
      name: exp.description,
      category: isExpense ? exp.category : 'One-time',
      amount: exp.amount,
      isPaid,
      dueDateStr: formatDate(exp.date || exp.paydayDate, 'short'),
      emoji: exp.emoji || getCategoryEmoji(exp.category) || '📌',
      originalItem: exp
    };
  });

  const expensesCount = extraItems.filter(i => i.type === 'expense').length;
  const oneTimeCount = extraItems.filter(i => i.type === 'one-time').length;

  const subtitleParts = [];
  if (billsCount > 0) subtitleParts.push(`${billsCount} bill${billsCount === 1 ? '' : 's'}`);
  if (expensesCount > 0) subtitleParts.push(`${expensesCount} expense${expensesCount === 1 ? '' : 's'}`);
  if (oneTimeCount > 0) subtitleParts.push(`${oneTimeCount} one-time`);
  const subtitleItemsStr = subtitleParts.join(' + ') || '0 items';

  const allItems = [
    ...summaryItem.assignedBills.map(assigned => {
      const bill = assigned.bill;
      // If paid with another paycheck, it shouldn't count towards THIS paycheck's totals
      const isPaidWithOther = assigned.paidWithPaydayId && assigned.paidWithPaydayId !== dateStr;
      
      return {
        id: bill.id,
        type: 'bill',
        name: bill.name,
        category: bill.isSplit ? 'Split' : 'Personal',
        amount: assigned.effectiveAmount, // Keep actual amount for display
        calcAmount: isPaidWithOther ? 0 : assigned.effectiveAmount, // Use 0 for totals
        isPaid: assigned.isPaid,
        dueDateStr: formatDate(assigned.dueFullDate, 'short'),
        emoji: bill.emoji || getCategoryEmoji(bill.category) || '💜',
        isSplit: !!bill.isSplit,
        fullTotal: bill.fullTotal || bill.amount,
        isVariable: bill.type.toLowerCase() === 'variable',
        originalItem: assigned,
        isPaidWithOther,
        isPaidEarlyFuture: assigned.isPaidEarly // Pulled in from future
      };
    }),
    ...summaryItem.extraExpenses.map(exp => {
      const isExpense = exp.category && exp.category !== 'Bills' && exp.category !== 'Other' && exp.category !== 'Bills / One-Time';
      const isPaid = !!paidStatuses[`${exp.id}::${dateStr}`];
      return {
        id: exp.id,
        type: isExpense ? 'expense' : 'one-time',
        name: exp.description,
        category: isExpense ? exp.category : 'One-time',
        amount: exp.amount,
        isPaid,
        dueDateStr: formatDate(exp.date || exp.paydayDate, 'short'),
        emoji: exp.emoji || getCategoryEmoji(exp.category) || '📌',
        originalItem: exp,
        calcAmount: exp.amount,
        isPaidWithOther: false,
        isPaidEarlyFuture: false
      };
    })
  ];

  const totalItemsAmount = allItems.reduce((sum, item) => sum + item.calcAmount, 0);
  const totalRemaining = allItems.filter(item => !item.isPaid).reduce((sum, item) => sum + item.calcAmount, 0);
  const totalPaidAmount = allItems.filter(item => item.isPaid).reduce((sum, item) => sum + item.calcAmount, 0);

  // Make avail dynamic based on what's paid with this check
  const dynamicAvail = summaryItem.totalAvailable !== null ? summaryItem.totalAvailable - totalPaidAmount : null;
  const animatedDynamicAvail = useAnimatedNumber(dynamicAvail || 0, 200);
  const availStr = hasAmt && dynamicAvail !== null ? `${formatCurrency(animatedDynamicAvail).replace(/\.00$/, '')} available` : 'Est: Not set';
  
  const animatedTotalRemaining = useAnimatedNumber(totalRemaining, 200);
  const animatedTotalPaidAmount = useAnimatedNumber(totalPaidAmount, 200);

  const billsTotalStr = formatCurrency(totalItemsAmount).replace(/\.00$/, '');
  const remainingStr = formatCurrency(animatedTotalRemaining).replace(/\.00$/, '');
  const paidStr = formatCurrency(animatedTotalPaidAmount).replace(/\.00$/, '');

  const billItems = allItems.filter(i => i.type === 'bill');
  const allPaidCount = allItems.filter(i => i.isPaid).length;
  const allPaidNow = allItems.length > 0 && allPaidCount === allItems.length;
  const allPaid = allPaidNow;

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const prevDashAllPaidRef = useRef<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prevDashAllPaidRef.current === null) {
      prevDashAllPaidRef.current = allPaidNow;
      return;
    }
    const newPrev = tryCelebrate('dash_' + dateStr, allPaidNow, prevDashAllPaidRef.current, isInitialLoad);
    prevDashAllPaidRef.current = newPrev;
  }, [allPaidNow, isInitialLoad, dateStr]);

  return (
    <div 
      onClick={() => setIsOpen(!isOpen)} 
      className={`rounded-[20px] bg-[#121212] border border-white/10 p-4 mb-3 w-full cursor-pointer select-none shadow-md transition-all min-h-0 ${
        isOpen ? 'overflow-visible border-[#7C3AED]/50' : 'overflow-hidden hover:border-violet-500/40'
      }`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minWidth: 0, width: '100%' }}>
        <div className="flex flex-col items-center justify-center bg-[#1E1438] border border-[#7C3AED]/30 rounded-2xl w-[50px] h-[50px] shrink-0 leading-[1.4]">
          <span className="text-[10px] text-[#B794F6] font-semibold uppercase tracking-wider leading-none mb-0.5">
            {monthAbbr}
          </span>
          <span className="text-[20px] text-white font-bold leading-none">
            {day}
          </span>
        </div>

        <div className="payday-summary" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
            {formatDate(dateStr, 'medium')}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3, whiteSpace: 'normal' }}>
            <span style={{ whiteSpace: 'nowrap' }}>{availStr}</span> • {subtitleParts.map((part, idx) => (
              <span key={idx} style={{ whiteSpace: 'nowrap' }}>
                {idx > 0 ? ' + ' : ''}{part}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flexShrink: 0, marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#B794F6' }}>
            {hasAmt && summaryItem.leftOver !== null ? formatCurrency(summaryItem.leftOver) : remainingStr}
          </span>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '8px' }}
          className="animate-in slide-in-from-top-2 duration-200 overflow-visible min-h-0"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#6b7280', textTransform: 'uppercase' }}>
              ITEMS ASSIGNED ({allItems.length})
            </span>
            {allItems.length > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', whiteSpace: 'nowrap' }}>
                {allPaidCount} of {allItems.length} paid
              </span>
            )}
          </div>

          {allItems.length > 0 && (
            <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
              {billsCount > 0 && <span>{billItems.filter(i => i.isPaid).length} of {billsCount} bills paid</span>}
              {billsCount > 0 && (expensesCount > 0 || oneTimeCount > 0) && <span style={{ opacity: 0.5 }}>•</span>}
              {expensesCount > 0 && <span>{extraItems.filter(i => i.type === 'expense' && i.isPaid).length} of {expensesCount} expenses paid</span>}
              {expensesCount > 0 && oneTimeCount > 0 && <span style={{ opacity: 0.5 }}>•</span>}
              {oneTimeCount > 0 && <span>{extraItems.filter(i => i.type === 'one-time' && i.isPaid).length} of {oneTimeCount} one-time paid</span>}
            </div>
          )}

          {allItems.length === 0 ? (
            <div className="text-xs text-white/40 italic py-2 leading-[1.4]">
              No items assigned to this paycheck.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-visible min-h-0">
              {allItems.map(item => {
                const isPaid = item.isPaid;
                const myPortionStr = formatCurrency(item.amount);
                const totalStr = item.fullTotal ? formatCurrency(item.fullTotal) : myPortionStr;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleBillPaid(item.id, item.originalItem?.originalAssignedPayday || dateStr)}
                    className={`flex justify-between items-center rounded-2xl p-3 border cursor-pointer transition-all ${
                      isPaid 
                        ? item.isPaidWithOther 
                          ? 'bg-zinc-900/50 border-zinc-800/50 opacity-60' 
                          : 'paid-bill bg-purple-600/10 border-purple-600/30' 
                        : 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBillPaid(item.id, dateStr);
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
                            {isPaid && item.type === 'bill' && !item.isPaidWithOther ? '💜 ' : `${item.emoji} `}{item.name}
                          </span>
                        </div>
                        <div className="text-zinc-500 text-xs">
                          {item.isPaidWithOther 
                            ? `Paid early on ${formatDate(item.originalItem?.paidWithPaydayId || '', 'short')}`
                            : item.isPaidEarlyFuture
                            ? `Paid early from ${formatDate(item.originalItem?.originalAssignedPayday || '', 'short')}`
                            : `Due ${item.dueDateStr}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3 flex flex-col items-end">
                      {editingVariableId === item.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            type="number" 
                            className="bg-black border border-white/20 rounded px-2 py-1 text-white text-sm w-20 text-right font-bold"
                            value={tempAmount}
                            autoFocus
                            onChange={e => setTempAmount(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(tempAmount);
                                if (!isNaN(val) && val >= 0) {
                                  setVariableOverride(item.id, dateStr, val, val);
                                }
                                setEditingVariableId(null);
                              } else if (e.key === 'Escape') {
                                setEditingVariableId(null);
                              }
                            }}
                          />
                          <button 
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded"
                            onClick={() => {
                              const val = parseFloat(tempAmount);
                              if (!isNaN(val) && val >= 0) {
                                setVariableOverride(item.id, dateStr, val, val);
                              }
                              setEditingVariableId(null);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-bold ${isPaid ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {item.isSplit ? `${myPortionStr} of ${totalStr}` : myPortionStr}
                          </div>
                          {item.type === 'bill' && item.isVariable && !isPaid && (
                            <button 
                              onClick={e => {
                                e.stopPropagation();
                                setEditingVariableId(item.id);
                                setTempAmount(String(item.amount));
                              }}
                              className="text-zinc-400 hover:text-white p-1"
                              title="Edit Amount"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="text-[#A78BFA] text-xs font-semibold">{item.category}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between items-end pt-2 text-sm leading-[1.4] transition-all duration-200">
            {allPaidCount === 0 ? (
              <>
                <span className="text-white/60 leading-[1.4]">Total for this check:</span>
                <span className="text-white font-semibold leading-[1.4] text-lg">
                  {billsTotalStr}
                </span>
              </>
            ) : allPaid ? (
              <>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> All paid!
                </span>
                <div className="text-right">
                  <span className="text-white font-bold leading-[1.4] text-lg block">Remaining: $0</span>
                  <span className="text-white/40 text-[10px]">Total was {billsTotalStr}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-white/80 font-bold leading-[1.4] text-lg">Remaining: {remainingStr}</span>
                  <span className="text-white/40 text-[11px] mt-0.5">Paid {paidStr} of {billsTotalStr}</span>
                </div>
                <span className="text-white font-semibold leading-[1.4] text-lg">
                  {remainingStr}
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEditItems(dateStr); }}
              className="flex-1 bg-[#7C3AED] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#6D28D9] transition-colors leading-[1.4]"
            >
              Edit Items
            </button>
            {allPaid ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  allItems.filter(i => i.isPaid).forEach(i => toggleBillPaid(i.id, dateStr));
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 leading-[1.4]"
              >
                ↩️ Unmark All
              </button>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  allItems.filter(i => !i.isPaid).forEach(i => toggleBillPaid(i.id, dateStr));
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
  const [editItemsDate, setEditItemsDate] = useState<string | null>(null);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
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
  , paidStatuses } = usePayday();


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedSummaries = [...summaries].sort((a, b) => new Date(a.payday.date).getTime() - new Date(b.payday.date).getTime());
  // Polyfill for findLastIndex
  let currentIdx = -1;
  for (let i = sortedSummaries.length - 1; i >= 0; i--) {
    const pDate = new Date(sortedSummaries[i].payday.date + 'T00:00:00');
    if (pDate <= today) {
      currentIdx = i;
      break;
    }
  }
  if (currentIdx === -1) currentIdx = 0;

  const orderedSummaries = summaries.length > 0 ? [
    sortedSummaries[currentIdx],
    ...sortedSummaries.slice(currentIdx + 1),
    ...sortedSummaries.slice(0, currentIdx).reverse()
  ] : [];

  const currentPaydayDate = summaries.length > 0 ? sortedSummaries[currentIdx].payday.date : null;

  const activeSummary = nextPaydaySummary || summaries[0];

  // Current active index in the carousel
  const [currentPaydayIndex, setCurrentPaydayIndex] = useState(0);

  // Initialize expanded dates so the active payday is expanded by default, and others are collapsed.
  const [expandedTimelineDates, setExpandedTimelineDates] = useState<Record<string, boolean>>(() => {
    return activeSummary ? { [activeSummary.payday.date]: true } : {};
  });

  // Hero Edit Est Check state
  const [editingEstCheckId, setEditingEstCheckId] = useState<string | null>(null);
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

  const handleSaveEstCheck = (pDay: any) => {
    const val = parseFloat(tempEstCheck);
    updatePayday({
      ...pDay,
      estimatedAmount: isNaN(val) ? null : val,
    });
    setEditingEstCheckId(null);
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
  const categorySummaryMap: Record<string, { amount: number; fullAmount: number; count: number; billCount: number; expCount: number; items: any[] }> = {};
  let totalPeriodAmount = 0;

  assignedBills.forEach(item => {
    const rawCat = item.bill.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const myShare = item.effectiveAmount;
    const fullBillAmt = item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : myShare;
    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };
    categorySummaryMap[cat].amount += myShare;
    categorySummaryMap[cat].fullAmount += fullBillAmt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].billCount += 1;
        const [y, m] = payday.date.split('-');
    const day = item.bill.dueDay || item.bill.dueDate || 1;
    const dueDateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
    categorySummaryMap[cat].items.push({ 
      id: item.bill.id, 
      name: item.bill.name, 
      category: item.bill.category,
      emoji: item.bill.emoji || getCategoryEmoji(cat), 
      amount: myShare, 
      type: 'bill',
      dueDate: dueDateStr
    });
    totalPeriodAmount += myShare;
  });

  extraExpenses.forEach(exp => {
    const rawCat = exp.category || 'Other';
    const cat = (rawCat as string) === 'Streaming Subscriptions' ? 'Subscriptions' : rawCat;
    const amt = exp.amount;
    categorySummaryMap[cat] = categorySummaryMap[cat] || { amount: 0, fullAmount: 0, count: 0, billCount: 0, expCount: 0, items: [] };
    categorySummaryMap[cat].amount += amt;
    categorySummaryMap[cat].fullAmount += amt;
    categorySummaryMap[cat].count += 1;
    categorySummaryMap[cat].expCount += 1;
        categorySummaryMap[cat].items.push({ 
      id: exp.id, 
      name: exp.description || (exp as any).name, 
      category: exp.category,
      emoji: exp.emoji || getCategoryEmoji(cat), 
      amount: amt, 
      type: 'expense',
      date: exp.date || exp.createdAt
    });
    totalPeriodAmount += amt;
  });

  const categoriesList = Object.entries(categorySummaryMap).map(([name, data]) => {
    const percentage = totalPeriodAmount > 0 ? Math.round((data.amount / totalPeriodAmount) * 100) : 0;
    let subtitle = '';
    if (data.billCount > 0 && data.expCount > 0) {
      subtitle = `${data.billCount} bill${data.billCount !== 1 ? 's' : ''}, ${data.expCount} exp${data.expCount !== 1 ? 's' : ''}`;
    } else if (data.expCount > 0) {
      subtitle = `${data.expCount} expense${data.expCount !== 1 ? 's' : ''}`;
    } else {
      subtitle = `${data.billCount} bill${data.billCount !== 1 ? 's' : ''}`;
    }
    return {
      name,
      amount: data.amount,
      fullAmount: data.fullAmount,
      count: data.count,
      subtitle,
      percentage,
      color: getCategoryColor(name),
      items: data.items
    };
  }).sort((a, b) => b.amount - a.amount);

  return (
    <div className="w-full max-w-[600px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-4 box-border pb-32 space-y-4">
      {/* 1. UPCOMING PAYDAY HEADER CAROUSEL */}
      <div className="space-y-4">
        <div 
          className="payday-slider flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '0',
            padding: '0',
            margin: '0 auto',
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box'
          }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const cards = el.querySelectorAll('[data-payday-card]');
            if (cards.length > 0) {
              const containerCenter = el.scrollLeft + el.offsetWidth / 2;
              let closestIdx = 0;
              let minDistance = Infinity;
              cards.forEach((card, idx) => {
                const cardCenter = (card as HTMLElement).offsetLeft + (card as HTMLElement).offsetWidth / 2;
                const dist = Math.abs(containerCenter - cardCenter);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIdx = idx;
                }
              });
              if (closestIdx !== currentPaydayIndex) {
                setCurrentPaydayIndex(closestIdx);
              }
            }
          }}
        >
          {orderedSummaries.map((summary) => {
            const isCurrent = summary.payday.date === currentPaydayDate;
            const isPast = new Date(summary.payday.date + 'T00:00:00') < today && !isCurrent;
            const {
              payday: sPayday,
              nextPaydayDate: sNextPaydayDate,
              assignedBills: sAssignedBills,
              extraExpenses: sExtraExpenses,
              totalBills: sTotalBills,
              totalExtraExpenses: sTotalExtraExpenses,
              totalOutflow: sTotalOutflow,
              estimatedCheck: sEstimatedCheck,
              leftOver: sLeftOver
            } = summary;

            const sDisplayTotalBills = viewMode === 'myShare'
              ? sTotalBills
              : sAssignedBills.reduce((sum, item) => sum + (item.bill.isSplit ? (item.bill.fullTotal || item.bill.amount) : item.effectiveAmount), 0);

            const sPaidBillsCount = sAssignedBills.filter(b => b.isPaid).length;
            const allocationPct = sEstimatedCheck && sEstimatedCheck > 0 ? Math.min(100, Math.round((sTotalOutflow / sEstimatedCheck) * 100)) : 0;

            return (
              <div 
                key={summary.payday.date} 
                data-payday-card="true"
                className="payday-card box-border flex-shrink-0 flex flex-col mb-2"
                style={{
                  flex: '0 0 100%',
                  width: '100%',
                  maxWidth: '100%',
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always',
                  boxSizing: 'border-box',
                  padding: '0',
                  margin: '0'
                }}
              >
                <div
                  className="rounded-[20px] bg-[#1a112e] border border-[#2a2a2a] shadow-2xl flex flex-col"
                  style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '20px',
                    background: '#1a112e',
                    border: '1px solid #2a2a2a',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Top Row */}
                  <div className="flex flex-row items-center justify-between gap-2 w-full flex-wrap">
                    <div 
                      className="inline-flex items-center gap-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full w-fit shrink-0 text-purple-300 uppercase"
                      style={{ padding: '6px 12px', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700 }}
                    >
                      ✨ {isCurrent ? 'CURRENT PAYDAY' : isPast ? 'PAST PAYDAY' : 'UPCOMING PAYDAY'}
                    </div>
                    <span style={{ fontSize: '13px', color: '#9ca3af', whiteSpace: 'nowrap' }} className="font-medium">
                      Covers {formatDate(sPayday.date, 'short')} – {formatDate(sNextPaydayDate, 'short')}
                    </span>
                  </div>

                  {/* Title Date & Swipe Hint */}
                  <div className="flex items-center justify-between w-full min-w-0" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div style={{ width: '48px', height: '48px', background: '#2a1f4a', borderRadius: '12px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8">
                          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                          <path d="M16 2v4M8 2v4M3 9h18"></path>
                        </svg>
                      </div>
                      <h1 style={{ fontSize: 'clamp(24px, 7vw, 36px)', fontWeight: 800, lineHeight: 1, color: '#ffffff' }} className="tracking-tight truncate">
                        {formatDate(sPayday.date, 'medium')}
                      </h1>
                    </div>
                    {isCurrent && orderedSummaries.length > 1 && (
                      <span className="text-zinc-500 text-[10px] font-medium tracking-wide animate-pulse pr-1 hidden sm:block shrink-0">
                        Swipe →
                      </span>
                    )}
                  </div>

                  {/* Action Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }} className="w-full">
                    <button
                      type="button"
                      onClick={() => onOpenIncomeModal(sPayday.date)}
                      style={{ height: '48px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, padding: '0 10px', letterSpacing: '-0.01em', background: 'transparent', border: '1px solid #7c3aed', color: '#c4b5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      className="hover:bg-purple-500/10 transition-colors"
                    >
                      + Add Extra Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenExpenseModal(sPayday.date)}
                      style={{ height: '48px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, padding: '0 10px', letterSpacing: '-0.01em', background: '#222222', border: '1px solid #2a2a2a', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      className="hover:bg-zinc-700/80 transition-colors"
                    >
                      + Add Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBillModal()}
                      style={{ height: '48px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, padding: '0 10px', letterSpacing: '-0.01em', background: '#222222', border: '1px solid #2a2a2a', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      className="hover:bg-zinc-700/80 transition-colors"
                    >
                      🧾 New Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sAssignedBills.forEach(b => {
                          if (!b.isPaid) {
                            toggleBillPaid(b.bill.id, sPayday.date);
                          }
                        });
                        sExtraExpenses.forEach(exp => {
                          const expKey = `${exp.id}::${sPayday.date}`;
                          if (!paidStatuses[expKey]) {
                            toggleBillPaid(exp.id, sPayday.date);
                          }
                        });
                      }}
                      style={{ height: '48px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, padding: '0 10px', letterSpacing: '-0.01em', background: '#7c3aed', border: 'none', color: '#ffffff', boxShadow: '0 0 20px rgba(124,58,237,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      className="hover:bg-[#6D28D9] transition-colors"
                    >
                      ✓ Mark All Paid
                    </button>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: '#2a2a2a', margin: '4px 0' }} className="w-full" />

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }} className="w-full">
                    {/* Estimated Check */}
                    <div 
                      onClick={() => {
                        setTempEstCheck(sEstimatedCheck !== null ? String(sEstimatedCheck) : '');
                        setEditingEstCheckId(sPayday.date);
                      }}
                      style={{ padding: '14px 12px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden' }}
                      className="cursor-pointer hover:border-purple-500/40 transition-all"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.2 }}>Estimated Check</span>
                      </div>
                      {editingEstCheckId === sPayday.date ? (
                        <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            value={tempEstCheck}
                            onChange={e => setTempEstCheck(e.target.value)}
                            placeholder="0.00"
                            className="w-16 pl-1.5 pr-1 py-0.5 rounded bg-[#121212] border border-[#7C3AED] text-white text-xs focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEstCheck(sPayday)} className="px-2 py-0.5 rounded bg-[#7C3AED] text-white text-xs font-bold shrink-0">
                            Save
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '4px 0 2px 0', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                          {sEstimatedCheck !== null ? formatCurrency(sEstimatedCheck) : 'TBD'}
                        </p>
                      )}
                      <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Expected deposit</p>
                    </div>

                    {/* Bills Due */}
                    <div style={{ padding: '14px 12px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.2 }}>Bills Due</span>
                        <span style={{ fontSize: '10px', background: '#2a1f4a', color: '#c4b5fd', padding: '2px 6px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {sAssignedBills.length} Bills
                        </span>
                      </div>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#c4b5fd', margin: '4px 0 2px 0', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        {formatCurrency(sDisplayTotalBills)}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {sPaidBillsCount} of {sAssignedBills.length} marked paid
                      </p>
                    </div>

                    {/* Extra Expenses */}
                    <div style={{ padding: '14px 10px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>Expenses</span>
                        <span style={{ fontSize: '10px', background: '#4a1a1a', color: '#ff8a8a', padding: '3px 7px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {sExtraExpenses.length} Items
                        </span>
                      </div>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#fb7185', margin: '4px 0 2px 0', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        {formatCurrency(sTotalExtraExpenses)}
                      </p>
                      <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Non-recurring</p>
                    </div>

                    {/* MONEY LEFT OVER */}
                    <div style={{ padding: '14px 12px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: '#c4b5fd', whiteSpace: 'nowrap', display: 'block' }}>
                        MONEY LEFT OVER ✓
                      </span>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '4px 0 2px 0', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        {sLeftOver !== null ? formatCurrency(sLeftOver) : 'TBD'}
                      </p>
                      <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Safe to spend</p>
                    </div>
                  </div>

                  {/* Allocation Progress */}
                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between" style={{ fontSize: '13px', color: '#9ca3af' }}>
                      <span>Paycheck Allocation</span>
                      <span style={{ color: '#c4b5fd', fontWeight: 600 }}>
                        {allocationPct}% allocated
                      </span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#222222', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div 
                        style={{ height: '100%', background: '#7c3aed', borderRadius: '9999px', width: `${allocationPct}%` }}
                        className="transition-all"
                      />
                    </div>
                  </div>

                  {/* Checklist View Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedTimelineDates({ [sPayday.date]: true });
                      const el = document.getElementById('timeline-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ color: '#c4b5fd', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    className="hover:text-purple-300 transition-colors mt-1"
                  >
                    View Checklist & Breakdown →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Pagination Dots */}
        {orderedSummaries.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', margin: '8px 0 12px' }}>
            {orderedSummaries.map((s, idx) => {
              const isActive = idx === currentPaydayIndex;
              return (
                <div 
                  key={s.payday.date}
                  style={{
                    height: '8px',
                    borderRadius: '9999px',
                    transition: 'all 0.2s',
                    width: isActive ? '20px' : '8px',
                    background: isActive ? '#a855f7' : '#3a3a3a'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SPENDING BY CATEGORY THIS CHECK CARD */}
      <div 
        style={{ padding: '20px', borderRadius: '20px', background: '#1a1a1a', border: '1px solid #2a2a2a', marginBottom: '16px' }}
        className="space-y-4"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#2a1a4a', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              <svg className="w-5 h-5 text-[#C084FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>Spending by Category This Check</h3>
          </div>
          <span style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px', display: 'block' }}>
            Category breakdown for paycheck on {formatDate(payday.date, 'medium')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToTab('reports')}
          style={{ width: '100%', height: '52px', borderRadius: '14px', fontSize: '15px', fontWeight: 600, background: '#222222', border: '1px solid #2a2a2a', color: '#ffffff', margin: '16px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          className="hover:bg-zinc-700/80 transition-all"
        >
          <svg className="w-4 h-4 text-[#A78BFA] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          View Full Analytics Reports
        </button>

        <div className="category-allocation-dropdown">
          <button 
            className="w-full flex items-center justify-between cursor-pointer focus:outline-none bg-transparent border-none p-0" 
            onClick={() => setShowCategoryList(!showCategoryList)}
            style={{ margin: '16px 0 12px' }}
          >
            <span style={{ fontSize: '12px', letterSpacing: '0.08em', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', flex: 1, paddingRight: '12px' }}>
              CATEGORY ALLOCATION LIST ({categoriesList.length}) - Total {formatCurrency(totalPeriodAmount)}
            </span>
            <span className="text-zinc-500" style={{ fontSize: '12px' }}>{showCategoryList ? '▲' : '▼'}</span>
          </button>

          {showCategoryList && (
            <div>
              {categoriesList.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No spending in this period.</p>
              ) : (
                categoriesList.map(cat => (
                  <div 
                    key={cat.name} 
                    className="mb-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden"
                  >
                    <div 
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222222] transition-colors"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', display: 'block' }}>{cat.name}</span>
                          <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                            {cat.subtitle} ({cat.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'block' }}>{formatCurrency(cat.amount)}</span>
                          {cat.fullAmount > cat.amount && (
                            <span style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>(Full {formatCurrency(cat.fullAmount)})</span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          {expandedCategories[cat.name] ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>

                    {expandedCategories[cat.name] && (
                      <div className="px-4 pb-4 pt-1">
                        <div className="pl-4 border-l border-zinc-800 space-y-2.5 mt-2">
                          {cat.items.map((item: any, idx: number) => (
                            <div key={`${item.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f1f1f' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                <span style={{ fontSize: '14px' }}>{item.emoji || (item.type === 'bill' ? '🧾' : '💸')}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#e5e7eb' }}>{item.name || item.title || item.description || 'Untitled'}</span>
                                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    {item.type === 'bill' || item.dueDate ? (
                                      `Due ${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${item.category || cat.name}`
                                    ) : (
                                      item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Visual Donut Allocation Card inside */}
        <div style={{ padding: '16px', borderRadius: '16px', background: '#141414', border: '1px dashed #2a2a2a', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
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

      {/* 3. DASHBOARD STATS COLUMN */}
      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
        
        {/* Total Monthly Bills */}
        <div style={{ padding: '12px 10px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', flexShrink: 0 }}>
            <Receipt className="w-4 h-4" />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>Monthly Bills</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatCurrency(bills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0))}
            </p>
            <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bills.filter(b => b.isActive).length} active bills
            </p>
          </div>
        </div>

        {/* Upcoming Paydays */}
        <div style={{ padding: '12px 10px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', flexShrink: 0 }}>
            <Calendar className="w-4 h-4" />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>Upcoming</p>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {summaries.length} Paydays
            </p>
            <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Projected schedule
            </p>
          </div>
        </div>

        {/* Bill Mix */}
        <div style={{ padding: '12px 10px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', flexShrink: 0 }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>Bill Mix</p>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bills.filter(b => b.isActive && b.type === 'fixed').length} F / {bills.filter(b => b.isActive && b.type === 'variable').length} V
            </p>
            <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Fixed vs Variable
            </p>
          </div>
        </div>

        {/* Extra Expenses */}
        <div style={{ padding: '12px 10px', borderRadius: '16px', background: '#111111', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', flexShrink: 0 }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>Expenses</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {extraExpenses.length} Items
            </p>
            <p style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              One-time items
            </p>
          </div>
        </div>

      </div>

      {/* 4. PAYCHECK TIMELINE & BILL CHECKLISTS */}
      <div id="timeline-section" className="space-y-4" style={{ marginBottom: '16px' }}>
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
                type="button"
                onClick={onOpenPaydayModal}
                className="px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-xs font-semibold hover:bg-[#2A2A2A] transition-all cursor-pointer"
              >
                + Add Custom Payday
              </button>
              <button
                type="button"
                onClick={onOpenScheduleModal}
                className="px-3 py-1.5 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C084FC] text-xs font-semibold hover:bg-[#7C3AED]/30 transition-all cursor-pointer"
              >
                Configure Schedule
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 overflow-x-hidden">
          {summaries.map((summaryItem) => (
            <PaycheckCard
              key={summaryItem.payday.date}
              summaryItem={summaryItem}
              initialOpen={summaryItem.payday.date === activeSummary?.payday.date}
              onOpenBillModal={onOpenBillModal}
              onNavigateToTab={onNavigateToTab}
              onEditItems={setEditItemsDate}
              toggleBillPaid={toggleBillPaid}
            />
          ))}
        </div>
      </div>

      {editItemsDate && (
        <EditItemsModal 
          isOpen={!!editItemsDate} 
          onClose={() => setEditItemsDate(null)} 
          paydayDate={editItemsDate} 
        />
      )}
    </div>
  );
};
