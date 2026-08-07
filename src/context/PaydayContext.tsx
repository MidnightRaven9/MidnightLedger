import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Bill, 
  Payday, 
  PaydaySchedule, 
  ExtraExpense, 
  ExtraIncome,
  PaydaySummary 
} from '../types';
import { toISODateString, formatDate } from '../utils/dateUtils';
import { generatePaydaysFromSchedule, calculatePaydaySummaries } from '../utils/paydayLogic';
import { triggerConfetti } from '../utils/emojis';

const STORAGE_KEY = 'midnightledger_v1';

// Seed sample data
const DEFAULT_SCHEDULE: PaydaySchedule = {
  frequency: 'biweekly',
  anchorDate: '2026-08-15',
};

const DEFAULT_PAYDAYS: Payday[] = [
  { id: 'sample_payday_1', date: '2026-08-15', estimatedAmount: 1450, isManual: false, notes: 'Mid-month check' },
  { id: 'sample_payday_2', date: '2026-08-29', estimatedAmount: 1450, isManual: false, notes: 'End of month check' },
];

const DEFAULT_BILLS: Bill[] = [
  {
    id: 'sample_bill_1',
    name: 'Apartment Rent',
    amount: 950,
    dueDate: 1,
    type: 'fixed',
    category: 'Housing',
    notes: 'Due on the 1st of every month',
    isActive: true,
    isRecurringTemplate: true,
  },
  {
    id: 'sample_bill_2',
    name: 'Electric Utility',
    amount: 95.50,
    myShare: 95.50,
    fullTotal: 191.00,
    isSplit: true,
    splitType: 'even',
    splitCount: 2,
    splitWays: 2,
    mySharePercentage: 50,
    dueDate: 12,
    type: 'variable',
    category: 'Utilities',
    notes: 'Split 2 ways with roommate ($191 total)',
    isActive: true,
    isRecurringTemplate: true,
  },
  {
    id: 'sample_bill_3',
    name: 'Car Insurance',
    amount: 120,
    dueDate: 18,
    type: 'fixed',
    category: 'Insurance',
    notes: 'Auto-debit on the 18th',
    isActive: true,
    isRecurringTemplate: true,
  },
  {
    id: 'sample_bill_4',
    name: 'Phone & Internet',
    amount: 65,
    dueDate: 22,
    type: 'fixed',
    category: 'Phone & Internet',
    notes: 'Fiber home connection',
    isActive: true,
    isRecurringTemplate: true,
  },
  {
    id: 'sample_bill_5',
    name: 'Subscriptions',
    amount: 18,
    dueDate: 27,
    type: 'fixed',
    category: 'Subscriptions',
    notes: 'Netflix & Spotify bundle',
    isActive: true,
    isRecurringTemplate: true,
  },
];

const DEFAULT_EXPENSES: ExtraExpense[] = [
  {
    id: 'sample_expense_1',
    description: 'Groceries & Household Supplies',
    amount: 80,
    paydayDate: '2026-08-15',
    category: 'Food & Household',
    createdAt: '2026-08-05',
  },
];

const migrateBills = (loadedBills: Bill[]): Bill[] => {
  if (!Array.isArray(loadedBills)) return DEFAULT_BILLS;
  return loadedBills.map(b => {
    const nameLower = (b.name || '').toLowerCase();
    const isStreamingSub = nameLower.includes('streaming') && nameLower.includes('subscript');
    const isOldName = b.name === 'Streaming Subscriptions' || isStreamingSub;
    const catIsOld = b.category === 'Streaming Subscriptions';
    
    if (isOldName || catIsOld) {
      return {
        ...b,
        name: isOldName ? 'Subscriptions' : b.name,
        category: catIsOld ? 'Subscriptions' : b.category,
      };
    }
    return b;
  });
};

const getSavedState = () => {
  try {
    let saved = localStorage.getItem('midnightledger_v1');
    if (!saved) {
      // Fallback migration from previous key
      saved = localStorage.getItem('payday_planner_data_v1');
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.isWiped) {
        return {
          schedule: { frequency: 'manual', anchorDate: '' } as PaydaySchedule,
          paydays: [] as Payday[],
          bills: [] as Bill[],
          extraExpenses: [] as ExtraExpense[],
          extraIncomes: [] as ExtraIncome[],
          variableOverrides: {} as Record<string, number>,
          variableFullTotalOverrides: {} as Record<string, number>,
          paidStatuses: {} as Record<string, boolean>,
          excludedOccurrences: {} as Record<string, boolean>,
          lastSaved: parsed.lastSaved || null,
        };
      }
      
      let extraIncomes = parsed.extraIncomes || parsed.extraCash || [];
      const extraIncSaved = localStorage.getItem('midnightledger_extra_income');
      if (extraIncSaved) {
        try {
          const parsedInc = JSON.parse(extraIncSaved);
          if (Array.isArray(parsedInc) && parsedInc.length > 0) {
            extraIncomes = parsedInc;
          }
        } catch (_) {}
      }

      const rawBills = Array.isArray(parsed.bills) ? parsed.bills : DEFAULT_BILLS;

      return {
        schedule: parsed.schedule || DEFAULT_SCHEDULE,
        paydays: Array.isArray(parsed.paydays) ? parsed.paydays : (Array.isArray(parsed.paychecks) ? parsed.paychecks : DEFAULT_PAYDAYS),
        bills: migrateBills(rawBills),
        extraExpenses: Array.isArray(parsed.extraExpenses) ? parsed.extraExpenses : (Array.isArray(parsed.expenses) ? parsed.expenses : DEFAULT_EXPENSES),
        extraIncomes: extraIncomes,
        variableOverrides: parsed.variableOverrides || {},
        variableFullTotalOverrides: parsed.variableFullTotalOverrides || {},
        paidStatuses: parsed.paidStatuses || {},
        excludedOccurrences: parsed.excludedOccurrences || {},
        lastSaved: parsed.lastSaved || null,
      };
    }
  } catch (err) {
    console.error('Failed to load initial state from local storage', err);
  }
  return null;
};

interface PaydayContextType {
  schedule: PaydaySchedule;
  paydays: Payday[];
  bills: Bill[];
  extraExpenses: ExtraExpense[];
  extraIncomes: ExtraIncome[];
  variableOverrides: Record<string, number>;
  variableFullTotalOverrides: Record<string, number>;
  paidStatuses: Record<string, boolean>;
  excludedOccurrences: Record<string, boolean>;
  toastMessage: string | null;
  lastSaved: string | null;
  viewMode: 'myShare' | 'fullTotal';
  setViewMode: (mode: 'myShare' | 'fullTotal') => void;
  
  summaries: PaydaySummary[];
  nextPaydaySummary: PaydaySummary | null;
  
  // Actions
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  deleteBillOccurrence: (billId: string, paydayDate: string) => void;
  showToast: (msg: string) => void;
  
  addPayday: (payday: Omit<Payday, 'id'>) => void;
  updatePayday: (payday: Payday) => void;
  updatePaydays: (paydays: Payday[]) => void;
  deletePayday: (id: string) => void;
  
  addExtraExpense: (expense: Omit<ExtraExpense, 'id'>) => void;
  deleteExtraExpense: (id: string) => void;

  addExtraIncome: (income: Omit<ExtraIncome, 'id'>) => void;
  deleteExtraIncome: (id: string) => void;
  
  updateSchedule: (schedule: PaydaySchedule) => void;
  setVariableOverride: (billId: string, paydayDate: string, amount: number, fullTotalOverride?: number) => void;
  toggleBillPaid: (billId: string, paydayDate?: string) => void;
  markAllBillsPaidInPayday: (paydayDate: string) => void;
  unmarkAllBillsPaidInPayday: (paydayDate: string) => void;
  
  clearAllData: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

const PaydayContext = createContext<PaydayContextType | undefined>(undefined);

export const PaydayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schedule, setSchedule] = useState<PaydaySchedule>(() => {
    const saved = getSavedState();
    return saved ? saved.schedule : DEFAULT_SCHEDULE;
  });
  const [paydays, setPaydays] = useState<Payday[]>(() => {
    const saved = getSavedState();
    return saved ? saved.paydays : DEFAULT_PAYDAYS;
  });
  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = getSavedState();
    return saved ? saved.bills : DEFAULT_BILLS;
  });
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>(() => {
    const saved = getSavedState();
    return saved ? saved.extraExpenses : DEFAULT_EXPENSES;
  });
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>(() => {
    const saved = getSavedState();
    return saved ? saved.extraIncomes : [];
  });
  const [variableOverrides, setVariableOverrides] = useState<Record<string, number>>(() => {
    const saved = getSavedState();
    return saved ? saved.variableOverrides : {};
  });
  const [variableFullTotalOverrides, setVariableFullTotalOverrides] = useState<Record<string, number>>(() => {
    const saved = getSavedState();
    return saved ? saved.variableFullTotalOverrides : {};
  });
  const [paidStatuses, setPaidStatuses] = useState<Record<string, boolean>>(() => {
    const saved = getSavedState();
    return saved ? saved.paidStatuses : {};
  });
  const [excludedOccurrences, setExcludedOccurrences] = useState<Record<string, boolean>>(() => {
    const saved = getSavedState();
    return saved ? saved.excludedOccurrences : {};
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(() => {
    const saved = getSavedState();
    return saved ? saved.lastSaved : null;
  });

  const [viewMode, setViewModeState] = useState<'myShare' | 'fullTotal'>(() => {
    try {
      const saved = localStorage.getItem('midnightledger_viewMode');
      if (saved === 'myShare' || saved === 'fullTotal') {
        return saved;
      }
    } catch (_) {}
    return 'myShare';
  });

  const setViewMode = (mode: 'myShare' | 'fullTotal') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('midnightledger_viewMode', mode);
    } catch (_) {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2000);
  };

  // Save changes to local storage
  useEffect(() => {
    try {
      const savedTime = new Date().toISOString();
      const stateToSave = {
        schedule,
        paydays,
        paychecks: paydays,
        bills,
        expenses: extraExpenses,
        extraExpenses,
        extraIncomes,
        extraCash: extraIncomes,
        variableOverrides,
        variableFullTotalOverrides,
        paidStatuses,
        excludedOccurrences,
        lastSaved: savedTime,
      };
      localStorage.setItem('midnightledger_v1', JSON.stringify(stateToSave));
      localStorage.setItem('midnightledger_extra_income', JSON.stringify(extraIncomes));
      setLastSaved(savedTime);
    } catch (err) {
      console.error('Failed to save to local storage', err);
    }
  }, [schedule, paydays, bills, extraExpenses, extraIncomes, variableOverrides, variableFullTotalOverrides, paidStatuses, excludedOccurrences]);

  // Generate full active paydays list based on schedule and custom manual entries
  const activePaydays = useMemo(() => {
    return generatePaydaysFromSchedule(schedule, paydays, 10);
  }, [schedule, paydays]);

  // Calculate dynamic summaries
  const summaries = useMemo(() => {
    return calculatePaydaySummaries(
      activePaydays,
      bills,
      extraExpenses,
      schedule.frequency,
      variableOverrides,
      paidStatuses,
      variableFullTotalOverrides,
      excludedOccurrences,
      extraIncomes
    );
  }, [activePaydays, bills, extraExpenses, schedule.frequency, variableOverrides, paidStatuses, variableFullTotalOverrides, excludedOccurrences, extraIncomes]);

  // Identify next payday summary (closest upcoming or current date)
  const nextPaydaySummary = useMemo(() => {
    if (!summaries.length) return null;
    const todayStr = toISODateString(new Date());
    // Find first payday that is >= today or closest future payday
    const upcoming = summaries.find(s => s.payday.date >= todayStr);
    return upcoming || summaries[0];
  }, [summaries]);

  // Handlers
  const addBill = (billData: Omit<Bill, 'id'>) => {
    const newBill: Bill = {
      ...billData,
      isRecurringTemplate: billData.isRecurringTemplate ?? true,
      id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setBills(prev => [...prev, newBill]);
  };

  const updateBill = (updated: Bill) => {
    setBills(prev => prev.map(b => (b.id === updated.id ? updated : b)));
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    setVariableOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${id}_`)) delete next[k]; });
      return next;
    });
    setVariableFullTotalOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${id}_`)) delete next[k]; });
      return next;
    });
    setPaidStatuses(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${id}_`)) delete next[k]; });
      return next;
    });
    setExcludedOccurrences(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${id}_`)) delete next[k]; });
      return next;
    });
    showToast('Bill deleted');
  };

  const deleteBillOccurrence = (billId: string, paydayDate: string) => {
    const key = `${billId}_${paydayDate}`;
    const month = paydayDate.slice(0, 7);
    const monthKey = `${billId}_${month}`;
    setExcludedOccurrences(prev => ({
      ...prev,
      [key]: true,
      [monthKey]: true,
    }));
  };

  const addPayday = (paydayData: Omit<Payday, 'id'>) => {
    const newPayday: Payday = {
      ...paydayData,
      id: `payday_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isManual: true,
    };
    setPaydays(prev => {
      const filtered = prev.filter(p => p.date !== paydayData.date);
      return [...filtered, newPayday].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const updatePayday = (updated: Payday) => {
    setPaydays(prev => {
      const exists = prev.some(p => p.id === updated.id || p.date === updated.date);
      if (exists) {
        return prev.map(p => (p.id === updated.id || p.date === updated.date ? { ...p, ...updated, isManual: true } : p));
      }
      return [...prev, { ...updated, isManual: true }];
    });
  };

  const updatePaydays = (updates: Payday[]) => {
    setPaydays(prev => {
      let next = [...prev];
      updates.forEach(updated => {
        const idx = next.findIndex(p => p.id === updated.id || p.date === updated.date);
        if (idx !== -1) {
          next[idx] = { ...next[idx], ...updated, isManual: true };
        } else {
          next.push({ ...updated, isManual: true });
        }
      });
      return next;
    });
  };

  const deletePayday = (id: string) => {
    setPaydays(prev => prev.filter(p => p.id !== id));
  };

  const addExtraExpense = (expenseData: Omit<ExtraExpense, 'id'>) => {
    const newExpense: ExtraExpense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: toISODateString(new Date()),
    };
    setExtraExpenses(prev => [...prev, newExpense]);
  };

  const deleteExtraExpense = (id: string) => {
    setExtraExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addExtraIncome = (incomeData: Omit<ExtraIncome, 'id'>) => {
    const newIncome: ExtraIncome = {
      ...incomeData,
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      dateAdded: incomeData.dateAdded || toISODateString(new Date()),
      timestamp: Date.now(),
    };
    setExtraIncomes(prev => [...prev, newIncome]);
    showToast(`Added $${newIncome.amount.toFixed(2)} cash to this pay period!`);
  };

  const deleteExtraIncome = (id: string) => {
    setExtraIncomes(prev => prev.filter(i => i.id !== id));
    showToast('Removed extra income entry');
  };

  const updateSchedule = (newSchedule: PaydaySchedule) => {
    setSchedule(newSchedule);
  };

  const setVariableOverride = (billId: string, paydayDate: string, amount: number, fullTotalOverride?: number) => {
    const key = `${billId}_${paydayDate}`;
    setVariableOverrides(prev => ({
      ...prev,
      [key]: amount,
    }));
    if (fullTotalOverride !== undefined) {
      setVariableFullTotalOverrides(prev => ({
        ...prev,
        [key]: fullTotalOverride,
      }));
    }
  };

  const markAllBillsPaidInPayday = (paydayDate: string) => {
    const targetSummary = summaries.find(s => s.payday.date === paydayDate);
    if (!targetSummary || targetSummary.assignedBills.length === 0) return;

    setPaidStatuses(prev => {
      const updated = { ...prev };
      targetSummary.assignedBills.forEach(ab => {
        const key = `${ab.bill.id}_${paydayDate}`;
        updated[key] = true;
      });

      try {
        const historyList: Array<{ billId: string; paydayDate: string; paidAt: string }> = [];
        Object.entries(updated).forEach(([k, isPaid]) => {
          if (isPaid) {
            const parts = k.split('_');
            const bId = parts[0];
            const pDate = parts.slice(1).join('_');
            if (bId && pDate) {
              historyList.push({
                billId: bId,
                paydayDate: pDate,
                paidAt: new Date().toISOString(),
              });
            }
          }
        });
        localStorage.setItem('midnightledger_paid_history', JSON.stringify(historyList));
      } catch (err) {
        console.error('Error syncing midnightledger_paid_history:', err);
      }

      setTimeout(() => {
        triggerConfetti();
        showToast(`🎉 Paycheck cleared! All bills marked paid 💜`);
      }, 50);

      return updated;
    });
  };

  const unmarkAllBillsPaidInPayday = (paydayDate: string) => {
    const targetSummary = summaries.find(s => s.payday.date === paydayDate);
    if (!targetSummary || targetSummary.assignedBills.length === 0) return;

    setPaidStatuses(prev => {
      const updated = { ...prev };
      targetSummary.assignedBills.forEach(ab => {
        const key = `${ab.bill.id}_${paydayDate}`;
        updated[key] = false;
      });

      try {
        const historyList: Array<{ billId: string; paydayDate: string; paidAt: string }> = [];
        Object.entries(updated).forEach(([k, isPaid]) => {
          if (isPaid) {
            const parts = k.split('_');
            const bId = parts[0];
            const pDate = parts.slice(1).join('_');
            if (bId && pDate) {
              historyList.push({
                billId: bId,
                paydayDate: pDate,
                paidAt: new Date().toISOString(),
              });
            }
          }
        });
        localStorage.setItem('midnightledger_paid_history', JSON.stringify(historyList));
      } catch (err) {
        console.error('Error syncing midnightledger_paid_history:', err);
      }

      showToast(`↩️ All bills unmarked`);

      return updated;
    });
  };

  const toggleBillPaid = (billId: string, paydayDate?: string) => {
    let targetPaydayDate = paydayDate;
    if (!targetPaydayDate) {
      const summaryWithBill = summaries.find(s => 
        s.assignedBills.some(ab => {
          const b = ab.bill as any;
          return b.id === billId || b.originalBillId === billId || b.billId === billId;
        })
      );
      targetPaydayDate = summaryWithBill ? summaryWithBill.payday.date : (nextPaydaySummary?.payday.date || '');
    }

    if (!targetPaydayDate) return;

    const targetSummary = summaries.find(s => s.payday.date === targetPaydayDate);
    const assignedItem = targetSummary?.assignedBills.find(ab => {
      const b = ab.bill as any;
      return b.id === billId || b.originalBillId === billId || b.billId === billId;
    });

    const canonicalBillId = assignedItem ? assignedItem.bill.id : billId;
    const billObj = bills.find(b => {
      const item = b as any;
      return item.id === canonicalBillId || item.id === billId || item.originalBillId === billId || item.billId === billId;
    });
    const billName = assignedItem?.bill.name || billObj?.name || 'Bill';

    const key = `${canonicalBillId}_${targetPaydayDate}`;
    const altKey = `${billId}_${targetPaydayDate}`;

    const currentPaid = !!(paidStatuses[key] ?? paidStatuses[altKey] ?? assignedItem?.isPaid);
    const nextStatus = !currentPaid;

    // Synchronize isPaid flag on bills list template
    setBills(prev => {
      const updatedBills = prev.map(b => {
        if (b.id === billId || b.id === canonicalBillId) {
          return { ...b, isPaid: nextStatus };
        }
        return b;
      });
      try {
        localStorage.setItem('midnightledger_bills', JSON.stringify(updatedBills));
      } catch (_) {}
      return updatedBills;
    });

    setPaidStatuses(prev => {
      const updated = {
        ...prev,
        [key]: nextStatus,
        [altKey]: nextStatus,
      };

      try {
        const historyList: Array<{ billId: string; paydayDate: string; paidAt: string }> = [];
        Object.entries(updated).forEach(([k, isPaid]) => {
          if (isPaid) {
            const parts = k.split('_');
            const bId = parts[0];
            const pDate = parts.slice(1).join('_');
            if (bId && pDate) {
              historyList.push({
                billId: bId,
                paydayDate: pDate,
                paidAt: new Date().toISOString(),
              });
            }
          }
        });
        localStorage.setItem('midnightledger_paid_history', JSON.stringify(historyList));
      } catch (err) {
        console.error('Error syncing midnightledger_paid_history:', err);
      }

      if (nextStatus) {
        const totalBillsCount = targetSummary ? targetSummary.assignedBills.length : bills.length;
        if (targetSummary && targetSummary.assignedBills.length > 0) {
          const allPaidNow = targetSummary.assignedBills.every(ab => {
            const item = ab.bill as any;
            const isMatch = item.id === billId || item.originalBillId === billId || item.billId === billId || item.id === canonicalBillId;
            if (isMatch) return true;
            const k1 = `${ab.bill.id}_${targetPaydayDate}`;
            const k2 = `${item.originalBillId || ab.bill.id}_${targetPaydayDate}`;
            return !!(updated[k1] || updated[k2]);
          });

          if (allPaidNow) {
            setTimeout(() => {
              triggerConfetti();
            }, 100);
            showToast(`🎉 All bills paid! ${totalBillsCount} cleared 💜`);
          } else {
            showToast(`💜 ${billName} marked paid`);
          }
        } else {
          showToast(`💜 ${billName} marked paid`);
        }
      } else {
        showToast(`↩️ ${billName} unmarked`);
      }

      return updated;
    });
  };

  const clearAllData = () => {
    setBills([]);
    setPaydays([]);
    setExtraExpenses([]);
    setExtraIncomes([]);
    setVariableOverrides({});
    setVariableFullTotalOverrides({});
    setPaidStatuses({});
    setExcludedOccurrences({});
    setSchedule({ frequency: 'manual', anchorDate: '' });

    try {
      // Remove all keys starting with midnightledger_
      const keysToRemove = Object.keys(localStorage).filter(
        k => k.startsWith('midnightledger') || k === 'STORAGE_KEY' || k.includes('midnightledger')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Specific keys mentioned in requirements
      const specificKeys = [
        'midnightledger_data',
        'midnightledger_bills',
        'midnightledger_paydays',
        'midnightledger_expenses',
        'midnightledger_extra_expenses',
        'midnightledger_paid_history',
        'midnightledger_skipped_bills',
        'midnightledger_extra_income',
        'midnightledger_payday_assignments',
        'midnightledger_settings',
        'midnightledger_onboarding_complete',
        'midnightledger_deletedBillIds',
        'midnightledger_payday_schedule_rule',
        'midnightledger_custom_paydays',
        'midnightledger_projected_paydays',
        'midnightledger_paycheck_amount',
        'midnightledger_payday_history',
        'midnightledger_past_allocations',
        'midnightledger_default_check_amount',
        'midnightledger_schedule_config',
      ];
      specificKeys.forEach(k => localStorage.removeItem(k));

      // Save explicit clean empty state into STORAGE_KEY so reloads remain clean at 0
      const wipedState = {
        schedule: { frequency: 'manual', anchorDate: '' },
        paydays: [],
        bills: [],
        extraExpenses: [],
        extraIncomes: [],
        variableOverrides: {},
        variableFullTotalOverrides: {},
        paidStatuses: {},
        excludedOccurrences: {},
        isWiped: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wipedState));
      localStorage.setItem('midnightledger_bills', JSON.stringify([]));
      localStorage.setItem('midnightledger_paydays', JSON.stringify([]));
      localStorage.setItem('midnightledger_expenses', JSON.stringify([]));
      localStorage.setItem('midnightledger_extra_expenses', JSON.stringify([]));
      localStorage.setItem('midnightledger_extra_income', JSON.stringify([]));
      localStorage.setItem('midnightledger_skipped_bills', JSON.stringify([]));
      localStorage.setItem('midnightledger_paid_history', JSON.stringify([]));
      localStorage.setItem('midnightledger_payday_assignments', JSON.stringify([]));
      localStorage.setItem('midnightledger_settings', JSON.stringify({}));
      localStorage.setItem('midnightledger_deletedBillIds', JSON.stringify([]));
      localStorage.setItem('midnightledger_payday_schedule_rule', JSON.stringify(null));
      localStorage.setItem('midnightledger_custom_paydays', JSON.stringify([]));
      localStorage.setItem('midnightledger_projected_paydays', JSON.stringify([]));
      localStorage.setItem('midnightledger_paycheck_amount', JSON.stringify(0));
      localStorage.setItem('midnightledger_payday_history', JSON.stringify([]));
      localStorage.setItem('midnightledger_past_allocations', JSON.stringify([]));
      localStorage.setItem('midnightledger_default_check_amount', JSON.stringify(0));
      localStorage.setItem('midnightledger_schedule_config', JSON.stringify(null));
    } catch (err) {
      console.error('Error in clearAllData:', err);
    }

    showToast('App wiped clean - ready to share!');
  };



  const exportData = () => {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schedule,
      paydays,
      bills,
      extraExpenses,
      extraIncomes,
      variableOverrides,
      variableFullTotalOverrides,
      paidStatuses,
    }, null, 2);
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.schedule) setSchedule(parsed.schedule);
      if (Array.isArray(parsed.paydays)) setPaydays(parsed.paydays);
      if (Array.isArray(parsed.bills)) setBills(parsed.bills);
      if (Array.isArray(parsed.extraExpenses)) setExtraExpenses(parsed.extraExpenses);
      if (Array.isArray(parsed.extraIncomes)) setExtraIncomes(parsed.extraIncomes);
      if (parsed.variableOverrides) setVariableOverrides(parsed.variableOverrides);
      if (parsed.variableFullTotalOverrides) setVariableFullTotalOverrides(parsed.variableFullTotalOverrides);
      if (parsed.paidStatuses) setPaidStatuses(parsed.paidStatuses);
      return true;
    } catch (e) {
      console.error('Invalid import JSON', e);
      return false;
    }
  };

  return (
    <PaydayContext.Provider
      value={{
        schedule,
        paydays,
        bills,
        extraExpenses,
        extraIncomes,
        variableOverrides,
        variableFullTotalOverrides,
        paidStatuses,
        excludedOccurrences,
        toastMessage,
        lastSaved,
        viewMode,
        setViewMode,
        summaries,
        nextPaydaySummary,
        addBill,
        updateBill,
        deleteBill,
        deleteBillOccurrence,
        showToast,
        addPayday,
        updatePayday,
        updatePaydays,
        deletePayday,
        addExtraExpense,
        deleteExtraExpense,
        addExtraIncome,
        deleteExtraIncome,
        updateSchedule,
        setVariableOverride,
        toggleBillPaid,
        markAllBillsPaidInPayday,
        unmarkAllBillsPaidInPayday,
        clearAllData,
        exportData,
        importData,
      }}
    >
      {children}
    </PaydayContext.Provider>
  );
};

export const usePayday = () => {
  const context = useContext(PaydayContext);
  if (!context) {
    throw new Error('usePayday must be used within a PaydayProvider');
  }
  return context;
};
