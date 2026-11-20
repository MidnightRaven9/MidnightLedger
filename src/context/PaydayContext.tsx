import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Bill, 
  Payday, 
  PaydaySchedule, 
  ExtraExpense, 
  ExtraIncome,
  PaydaySummary 
} from '../types';
import { toISODateString } from '../utils/dateUtils';
import { generatePaydaysFromSchedule, calculatePaydaySummaries } from '../utils/paydayLogic';
import { triggerConfetti } from '../utils/emojis';
import { createBackup, inspectBackup, normalizePersistedState, parseBackup, type ImportInspection, type PersistedState } from '../utils/backup';
import { downloadBackup } from '../utils/downloadBackup';

const STORAGE_KEY = 'midnightledger_v1';

// UUID v4 contains no :: so split is safe
const SPLIT_SEP = '::';
const makeKey = (billId: string, paydayDate: string) => `${billId}${SPLIT_SEP}${paydayDate}`;
const parseKey = (k: string) => {
  const idx = k.lastIndexOf(SPLIT_SEP);
  if (idx === -1) {
    const parts = k.split('_');
    return [parts[0] || '', parts.slice(1).join('_')] as const;
  }
  return [k.slice(0, idx), k.slice(idx + SPLIT_SEP.length)] as const;
};

function safeSave(key: string, value: string): boolean {
  try {
    const testKey = '__quota_test__' + Date.now();
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    // Safe to save
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (err instanceof DOMException && (err.code === 22 || err.name === 'QuotaExceededError')) {
      console.error('localStorage quota exceeded - data too large');
      // Try to clear old versions or trim
      try {
        localStorage.removeItem('midnightledger_v0');
        localStorage.removeItem('midnightledger_old');
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error('Unable to persist ledger after freeing legacy keys', e);
        return false;
      }
    }
    console.error('localStorage save failed', err);
    return false;
  }
}

// Sample seed data is anchored to today's date so a fresh install always
// looks current, regardless of when the app is first opened.
const buildSeed = () => {
  const today = new Date();
  const next = new Date(today);
  next.setDate(today.getDate() + 14);
  const recent = new Date(today);
  recent.setDate(today.getDate() - 2);
  const toISO = (d: Date) => toISODateString(d);
  return {
    schedule: { frequency: 'biweekly', anchorDate: toISO(today) } as PaydaySchedule,
    paydays: [
      { id: 'sample_payday_1', date: toISO(today), estimatedAmount: 1450, isManual: true, notes: 'Current check' },
      { id: 'sample_payday_2', date: toISO(next), estimatedAmount: 1450, isManual: true, notes: 'Next check' },
    ] as Payday[],
    expenses: [
      {
        id: 'sample_expense_1',
        description: 'Groceries & Household Supplies',
        amount: 80,
        paydayDate: toISO(today),
        category: 'Food & Household',
        createdAt: toISO(recent),
      },
    ] as ExtraExpense[],
  };
};

const SEED = buildSeed();
const DEFAULT_SCHEDULE: PaydaySchedule = SEED.schedule;

const DEFAULT_PAYDAYS: Payday[] = SEED.paydays;

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

const DEFAULT_EXPENSES: ExtraExpense[] = SEED.expenses;

interface StoredLoad {
  state: PersistedState | null;
  firstRun: boolean;
  corrupt: boolean;
}

const EMPTY_STATE: PersistedState = {
  schedule: { frequency: 'manual', anchorDate: '' },
  paydays: [],
  bills: [],
  extraExpenses: [],
  extraIncomes: [],
  variableOverrides: {},
  variableFullTotalOverrides: {},
  paidStatuses: {},
  excludedOccurrences: {},
  lastSaved: null,
};

const createSampleState = (): PersistedState => ({
  ...EMPTY_STATE,
  schedule: DEFAULT_SCHEDULE,
  paydays: DEFAULT_PAYDAYS.map(p => ({ ...p, isDemo: true })),
  bills: DEFAULT_BILLS.map(b => ({ ...b, isDemo: true })),
  extraExpenses: DEFAULT_EXPENSES.map(e => ({ ...e, isDemo: true })),
});

/**
 * Reads localStorage once. A missing key means first run (samples may be
 * shown); an unreadable key means corrupted data, which is preserved on disk
 * and replaced in memory with an empty ledger rather than silently reseeded.
 */
function loadStoredState(): StoredLoad {
  try {
    let raw = localStorage.getItem('midnightledger_v1');
    if (raw === null) {
      raw = localStorage.getItem('payday_planner_data_v1');
      if (raw === null) return { state: null, firstRun: true, corrupt: false };
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { state: null, firstRun: false, corrupt: true };
    }
    if ((parsed as { isWiped?: boolean }).isWiped === true) {
      return { state: EMPTY_STATE, firstRun: false, corrupt: false };
    }
    return { state: normalizePersistedState(parsed), firstRun: false, corrupt: false };
  } catch (err) {
    console.error('Stored ledger could not be read; leaving it untouched on disk', err);
    return { state: null, firstRun: false, corrupt: true };
  }
}

/** Raw persisted bytes, kept only so a corrupt value can be downloaded before recovery. */
function readRawLedger(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('payday_planner_data_v1');
  } catch (_) {
    return null;
  }
}

export interface CustomCategory {
  name: string;
  emoji: string;
}

interface PaydayContextType {
  customExpenseCategories: CustomCategory[];
  addCustomExpenseCategory: (cat: CustomCategory) => void;
  deleteCustomExpenseCategory: (name: string) => void;
  customBillCategories: CustomCategory[];
  addCustomBillCategory: (cat: CustomCategory) => void;
  deleteCustomBillCategory: (name: string) => void;
  schedule: PaydaySchedule;
  paydays: Payday[];
  bills: Bill[];
  extraExpenses: ExtraExpense[];
  extraIncomes: ExtraIncome[];
  variableOverrides: Record<string, number>;
  variableFullTotalOverrides: Record<string, number>;
  paidStatuses: Record<string, boolean | string>;
  excludedOccurrences: Record<string, boolean>;
  toastMessage: string | null;
  storageWarning: string | null;
  dismissStorageWarning: () => void;
  /** True while a corrupt stored value is awaiting an explicit recovery choice. */
  recoveryLocked: boolean;
  /** Explicitly replace the unreadable value with an empty ledger and resume saving. */
  startFresh: () => void;
  /** Download the original unreadable bytes without changing any data. */
  downloadCorruptedData: () => void;
  lastSaved: string | null;
  viewMode: 'myShare' | 'fullTotal';
  setViewMode: (mode: 'myShare' | 'fullTotal') => void;
  
  summaries: PaydaySummary[];
  nextPaydaySummary: PaydaySummary | null;
  
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
  updateExtraExpense: (expense: ExtraExpense) => void;
  deleteExtraExpense: (id: string) => void;

  addExtraIncome: (income: Omit<ExtraIncome, 'id'>) => void;
  deleteExtraIncome: (id: string) => void;
  
  updateSchedule: (schedule: PaydaySchedule) => void;
  setVariableOverride: (billId: string, paydayDate: string, amount: number, fullTotalOverride?: number) => void;
  toggleBillPaid: (billId: string, paydayDate?: string) => void;
  markAllBillsPaidInPayday: (paydayDate: string) => void;
  unmarkAllBillsPaidInPayday: (paydayDate: string) => void;
  
  clearAllData: () => void;
  removeDemoData: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  inspectImport: (jsonStr: string) => ImportInspection;
  applyImport: (state: PersistedState) => void;
}

const PaydayContext = createContext<PaydayContextType | undefined>(undefined);

export const PaydayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialLoad] = useState(loadStoredState);
  const initial = initialLoad.state ?? (initialLoad.firstRun ? createSampleState() : EMPTY_STATE);
  // A corrupt stored value is preserved verbatim on disk until the user makes
  // an explicit recovery choice. Until then, automatic persistence is locked.
  const [recoveryLocked, setRecoveryLocked] = useState(initialLoad.corrupt);
  const [corruptedRaw] = useState<string | null>(() => initialLoad.corrupt ? readRawLedger() : null);

  const [schedule, setSchedule] = useState<PaydaySchedule>(initial.schedule);
  const [paydays, setPaydays] = useState<Payday[]>(initial.paydays);
  const [bills, setBills] = useState<Bill[]>(initial.bills);
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>(initial.extraExpenses);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>(initial.extraIncomes);
  const [variableOverrides, setVariableOverrides] = useState<Record<string, number>>(initial.variableOverrides);
  const [variableFullTotalOverrides, setVariableFullTotalOverrides] = useState<Record<string, number>>(initial.variableFullTotalOverrides);
  const [paidStatuses, setPaidStatuses] = useState<Record<string, boolean | string>>(initial.paidStatuses);
  const [excludedOccurrences, setExcludedOccurrences] = useState<Record<string, boolean>>(initial.excludedOccurrences);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(initial.lastSaved);
  const [storageWarning, setStorageWarning] = useState<string | null>(initialLoad.corrupt
    ? 'Saved ledger data could not be read. Your original data is still on this device and has not been changed. Choose a recovery option to continue.'
    : null);

  const [viewMode, setViewModeState] = useState<'myShare' | 'fullTotal'>(() => {
    try {
      const saved = localStorage.getItem('midnightledger_viewMode');
      if (saved === 'myShare' || saved === 'fullTotal') {
        return saved;
      }
    } catch (_) {}
    return 'myShare';
  });

  const [customExpenseCategories, setCustomExpenseCategories] = useState<CustomCategory[]>(() => {
    try {
      const savedCats = localStorage.getItem('midnightledger_customExpenseCategories');
      if (savedCats) return JSON.parse(savedCats);
      
      const oldCats = localStorage.getItem('midnightledger_customCategories');
      if (oldCats) {
         const parsed = JSON.parse(oldCats);
         if (parsed.length > 0) {
            localStorage.setItem('midnightledger_customExpenseCategories', JSON.stringify(parsed));
            localStorage.removeItem('midnightledger_customCategories');
            return parsed;
         }
      }
    } catch (_) {}
    return [];
  });

  const [customBillCategories, setCustomBillCategories] = useState<CustomCategory[]>(() => {
    try {
      const savedCats = localStorage.getItem('customBillCategories') || localStorage.getItem('midnightledger_customBillCategories');
      if (savedCats) return JSON.parse(savedCats);
    } catch (_) {}
    return [];
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
    }, 5000);
  };

  useEffect(() => {
    // Never write over an unreadable stored value. The original bytes stay on
    // disk until the user explicitly restores a backup or starts fresh.
    if (recoveryLocked) return;
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
      const saved = safeSave('midnightledger_v1', JSON.stringify(stateToSave));
      setStorageWarning(saved ? null : 'Could not save changes. Export a backup now to avoid losing them.');
      setLastSaved(savedTime);
    } catch (err) {
      console.error('Failed to save to local storage', err);
    }
  }, [schedule, paydays, bills, extraExpenses, extraIncomes, variableOverrides, variableFullTotalOverrides, paidStatuses, excludedOccurrences, recoveryLocked]);

  const activePaydays = useMemo(() => {
    return generatePaydaysFromSchedule(schedule, paydays, 10);
  }, [schedule, paydays]);

  const summaries = useMemo(() => {
    return calculatePaydaySummaries(
      activePaydays,
      bills,
      extraExpenses,
      schedule,
      variableOverrides,
      paidStatuses,
      variableFullTotalOverrides,
      excludedOccurrences,
      extraIncomes
    );
  }, [activePaydays, bills, extraExpenses, schedule, variableOverrides, paidStatuses, variableFullTotalOverrides, excludedOccurrences, extraIncomes]);

  const nextPaydaySummary = useMemo(() => {
    if (!summaries.length) return null;
    const todayStr = toISODateString(new Date());
    for (let i = summaries.length - 1; i >= 0; i--) {
      if (summaries[i].payday.date <= todayStr) {
        return summaries[i];
      }
    }
    return summaries[0];
  }, [summaries]);

  const addBill = (billData: Omit<Bill, 'id'>) => {
    const newBill: Bill = {
      ...billData,
      isRecurringTemplate: billData.isRecurringTemplate ?? true,
      id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setBills(prev => [...prev, newBill]);
  };

  const updateBill = (updated: Bill) => {
    setBills(prev => {
      const updatedBills = prev.map(b => {
        const bAny = b as any;
        const uAny = updated as any;
        const matches = 
          String(b.id) === String(updated.id) ||
          (bAny._id && String(bAny._id) === String(updated.id)) ||
          (uAny._id && String(b.id) === String(uAny._id)) ||
          false;
        if (matches) {
          return {
            ...b,
            ...updated,
            amount: updated.amount,
            myShare: updated.amount,
            fullTotal: updated.fullTotal ?? updated.amount,
          };
        }
        return b;
      });
      try {
        localStorage.setItem('bills', JSON.stringify(updatedBills));
        localStorage.setItem('myBills', JSON.stringify(updatedBills));
        localStorage.setItem('midnightledger_bills', JSON.stringify(updatedBills));
      } catch (_) {}
      return updatedBills;
    });

    setVariableOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (
          k.startsWith(`${updated.id}_`) || 
          k.startsWith(`${updated.id}::`) || 
          (updated.name && (k.startsWith(`${updated.name}_`) || k.startsWith(`${updated.name}::`)))
        ) {
          delete next[k];
        }
      });
      return next;
    });

    setVariableFullTotalOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (
          k.startsWith(`${updated.id}_`) || 
          k.startsWith(`${updated.id}::`) || 
          (updated.name && (k.startsWith(`${updated.name}_`) || k.startsWith(`${updated.name}::`)))
        ) {
          delete next[k];
        }
      });
      return next;
    });
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
    const key = makeKey(billId, paydayDate);
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

  const updateExtraExpense = (updated: ExtraExpense) => {
    setExtraExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
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
    const key = makeKey(billId, paydayDate);
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
        const key = makeKey(ab.bill.id, paydayDate);
        updated[key] = true;
      });

      try {
        const historyList: Array<{ billId: string; paydayDate: string; paidAt: string }> = [];
        Object.entries(updated).forEach(([k, isPaid]) => {
          if (isPaid) {
            const [bId, pDate] = parseKey(k);
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



      return updated;
    });
  };

  const unmarkAllBillsPaidInPayday = (paydayDate: string) => {
    const targetSummary = summaries.find(s => s.payday.date === paydayDate);
    if (!targetSummary || targetSummary.assignedBills.length === 0) return;

    setPaidStatuses(prev => {
      const updated = { ...prev };
      targetSummary.assignedBills.forEach(ab => {
        const key = makeKey(ab.bill.id, paydayDate);
        updated[key] = false;
      });

      try {
        const historyList: Array<{ billId: string; paydayDate: string; paidAt: string }> = [];
        Object.entries(updated).forEach(([k, isPaid]) => {
          if (isPaid) {
            const [bId, pDate] = parseKey(k);
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

      showToast(`All bills unmarked`);

      return updated;
    });
  };

  const toggleBillPaid = (billId: string, paydayDate?: string) => {
    let targetPaydayDate = paydayDate;
    if (!targetPaydayDate) {
      const summaryWithBill = summaries.find(s => 
        s.assignedBills.some(ab => {
          const b = ab.bill as any;
          return String(b.id) === String(billId) || String(b._id) === String(billId) || b.originalBillId === billId || b.billId === billId;
        })
      );
      targetPaydayDate = summaryWithBill ? summaryWithBill.payday.date : (nextPaydaySummary?.payday.date || '');
    }

    const targetSummary = summaries.find(s => s.payday.date === targetPaydayDate) || summaries[0];
    const effectivePaydayDate = targetPaydayDate || (targetSummary ? targetSummary.payday.date : '');

    const assignedItem = targetSummary?.assignedBills.find(ab => {
      const b = ab.bill as any;
      return String(b.id) === String(billId) || String(b._id) === String(billId) || b.originalBillId === billId || b.billId === billId;
    });

    const canonicalBillId = assignedItem ? assignedItem.bill.id : billId;

    const billObj = bills.find(b => {
      const bAny = b as any;
      return String(b.id) === String(billId) ||
        String(bAny._id) === String(billId) ||
        String(b.id) === String(canonicalBillId) ||
        
        false;
    });

    const billIdentifiers = Array.from(new Set([
      canonicalBillId,
      billId,
      billObj?.id,
      
      (billObj as any)?._id,
      assignedItem?.bill?.id,
      
    ].filter(Boolean) as string[]));
    
    const key = makeKey(canonicalBillId, effectivePaydayDate);
    const altKey = makeKey(billId, effectivePaydayDate);
    const uKey1 = `${canonicalBillId}_${effectivePaydayDate}`;
    const uKey2 = `${billId}_${effectivePaydayDate}`;
    
    const currentPaid = !!(
      paidStatuses[key] ||
      paidStatuses[altKey] ||
      paidStatuses[uKey1] ||
      paidStatuses[uKey2] ||
      paidStatuses[canonicalBillId] ||
      paidStatuses[billId] ||
      false ||
      false ||
      false ||
      assignedItem?.isPaid ||
      billObj?.paid ||
      (billObj as any)?.isPaid ||
      (assignedItem?.bill as any)?.paid ||
      (assignedItem?.bill as any)?.isPaid
    );
    
    if (currentPaid) {
      (window as any).prevBillsAllPaid = false;

      setPaidStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          const matches = billIdentifiers.some(id => 
            k === id || 
            k.startsWith(`${id}::`) || 
            k.startsWith(`${id}_`) || 
            k.endsWith(`::${id}`) || 
            k.endsWith(`_${id}`) ||
            k === `${id}::${effectivePaydayDate}` ||
            k === `${id}_${effectivePaydayDate}`
          );
          if (matches) {
            updated[k] = false;
          }
        });
        updated[key] = false;
        updated[altKey] = false;
        updated[uKey1] = false;
        updated[uKey2] = false;
        updated[canonicalBillId] = false;
        updated[billId] = false;
        try {
          localStorage.setItem('midnightledger_paid_history', JSON.stringify(updated));
          localStorage.setItem('midnightledger_paidStatuses', JSON.stringify(updated));

          let savedPaid: string[] = [];
          try {
            const raw = localStorage.getItem('paidBills');
            if (raw) savedPaid = JSON.parse(raw);
          } catch (_) {}
          const filtered = savedPaid.filter(id => !billIdentifiers.some(bid => String(bid).toLowerCase() === String(id).toLowerCase()));
          localStorage.setItem('paidBills', JSON.stringify(filtered));
        } catch (err) {
          console.error('Error syncing paidStatuses:', err);
        }
        
        return updated;
      });

      setBills(prev => {
        const updatedBills = prev.map(b => {
          const bAny = b as any;
          const matches = billIdentifiers.some(id => 
            String(b.id) === String(id) || 
            String(bAny._id) === String(id) || 
            false
          );
          if (matches) {
            return { ...b, paid: false, isPaid: false, paidAt: null };
          }
          return b;
        });
        try {
          localStorage.setItem('bills', JSON.stringify(updatedBills));
          localStorage.setItem('myBills', JSON.stringify(updatedBills));
        } catch (_) {}
        return updatedBills;
      });
    } else {
      const currentActiveDate = nextPaydaySummary?.payday.date || effectivePaydayDate;
      const isFuture = effectivePaydayDate > currentActiveDate;
      const valToSet = isFuture ? currentActiveDate : true;

      setPaidStatuses(prev => {
        const updated = { ...prev };
        updated[key] = valToSet;
        updated[altKey] = valToSet;
        updated[uKey1] = valToSet;
        updated[uKey2] = valToSet;
        if (billObj?.name) {
          updated[`${billObj.name}::${effectivePaydayDate}`] = valToSet;
          updated[`${billObj.name}_${effectivePaydayDate}`] = valToSet;
        }
        
        try {
          localStorage.setItem('midnightledger_paid_history', JSON.stringify(updated));
          localStorage.setItem('midnightledger_paidStatuses', JSON.stringify(updated));
        } catch (err) {
          console.error('Error syncing paidStatuses:', err);
        }

        if (targetSummary) {
          const remainingUnpaid = targetSummary.assignedBills.filter(ab => {
            const abId = ab.bill.id;
            if (abId === canonicalBillId || abId === billId) return false;
            const abKey = makeKey(abId, effectivePaydayDate);
            const abAlt = makeKey(abId, effectivePaydayDate);
            return !updated[abKey] && !updated[abAlt] && !ab.isPaid;
          });
          if (remainingUnpaid.length === 0) {
            triggerConfetti();
          }
        }

        return updated;
      });

      setBills(prev => {
        const updatedBills = prev.map(b => {
          const bAny = b as any;
          const matches = billIdentifiers.some(id => 
            String(b.id) === String(id) || 
            String(bAny._id) === String(id) || 
            false
          );
          if (matches) {
            return { ...b, paid: true, isPaid: true, paidAt: new Date().toISOString() };
          }
          return b;
        });
        try {
          localStorage.setItem('bills', JSON.stringify(updatedBills));
          localStorage.setItem('myBills', JSON.stringify(updatedBills));
        } catch (_) {}
        return updatedBills;
      });
    }
  };

  const addCustomExpenseCategory = (cat: CustomCategory) => {
    setCustomExpenseCategories(prev => {
      const next = [...prev, cat];
      localStorage.setItem('midnightledger_customExpenseCategories', JSON.stringify(next));
      return next;
    });
  };

  const deleteCustomExpenseCategory = (name: string) => {
    setCustomExpenseCategories(prev => {
      const next = prev.filter(c => c.name !== name);
      localStorage.setItem('midnightledger_customExpenseCategories', JSON.stringify(next));
      return next;
    });
    setExtraExpenses(prev => prev.map(e => e.category === name ? { ...e, category: 'Other' } : e));
  };

  const addCustomBillCategory = (cat: CustomCategory) => {
    setCustomBillCategories(prev => {
      const next = [...prev, cat];
      localStorage.setItem('customBillCategories', JSON.stringify(next));
      localStorage.setItem('midnightledger_customBillCategories', JSON.stringify(next));
      return next;
    });
  };

  const deleteCustomBillCategory = (name: string) => {
    setCustomBillCategories(prev => {
      const next = prev.filter(c => c.name !== name);
      localStorage.setItem('customBillCategories', JSON.stringify(next));
      localStorage.setItem('midnightledger_customBillCategories', JSON.stringify(next));
      return next;
    });
    setBills(prev => prev.map(b => b.category === name ? { ...b, category: 'Other' } : b));
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
      const keysToRemove = Object.keys(localStorage).filter(
        k => k.startsWith('midnightledger') || k === 'STORAGE_KEY' || k.includes('midnightledger')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));

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



  const exportData = (): string => JSON.stringify(createBackup({
    schedule,
    paydays,
    bills,
    extraExpenses,
    extraIncomes,
    variableOverrides,
    variableFullTotalOverrides,
    paidStatuses,
    excludedOccurrences,
    lastSaved,
  }), null, 2);

  // Apply an already-inspected, validated state exactly as previewed. This is
  // the only path that replaces ledger data and is called after explicit
  // confirmation in the import preview dialog.
  const applyImport = (state: PersistedState): void => {
    setSchedule(state.schedule);
    setPaydays(state.paydays);
    setBills(state.bills);
    setExtraExpenses(state.extraExpenses);
    setExtraIncomes(state.extraIncomes);
    setVariableOverrides(state.variableOverrides);
    setVariableFullTotalOverrides(state.variableFullTotalOverrides);
    setPaidStatuses(state.paidStatuses);
    setExcludedOccurrences(state.excludedOccurrences);
    setLastSaved(state.lastSaved);
    setStorageWarning(null);
    // Restoring a backup is an explicit recovery choice: the imported data now
    // replaces the original stored value on the next persistence pass.
    setRecoveryLocked(false);
    showToast('Backup imported successfully.');
  };

  // Explicit recovery choices. These are the only paths that unlock automatic
  // persistence after a corrupt load; nothing else can overwrite the original.
  const startFresh = (): void => {
    setSchedule(EMPTY_STATE.schedule);
    setPaydays(EMPTY_STATE.paydays);
    setBills(EMPTY_STATE.bills);
    setExtraExpenses(EMPTY_STATE.extraExpenses);
    setExtraIncomes(EMPTY_STATE.extraIncomes);
    setVariableOverrides(EMPTY_STATE.variableOverrides);
    setVariableFullTotalOverrides(EMPTY_STATE.variableFullTotalOverrides);
    setPaidStatuses(EMPTY_STATE.paidStatuses);
    setExcludedOccurrences(EMPTY_STATE.excludedOccurrences);
    setLastSaved(null);
    setStorageWarning(null);
    setRecoveryLocked(false);
    showToast('Started fresh. The unreadable value was replaced with an empty ledger.');
  };

  const downloadCorruptedData = (): void => {
    if (corruptedRaw !== null) {
      downloadBackup(corruptedRaw, 'midnightledger-unreadable-data.txt', 'text/plain');
    }
  };

  // Pure inspection used to populate the preview dialog; never mutates state.
  const inspectImport = (jsonStr: string): ImportInspection => inspectBackup(jsonStr);

  const importData = (jsonStr: string): boolean => {
    const parsed = parseBackup(jsonStr);
    if (parsed.ok === false) {
      console.error('Import failed:', parsed.error);
      showToast(parsed.error);
      return false;
    }
    applyImport(parsed.state);
    return true;
  };

  const removeDemoData = () => {
    setBills(prev => prev.filter(b => b.isDemo !== true));
    setPaydays(prev => prev.filter(p => p.isDemo !== true));
    setExtraExpenses(prev => prev.filter(e => e.isDemo !== true));
    setExtraIncomes(prev => prev.filter(i => i.isDemo !== true));
    showToast('Example records removed. Your own records were kept.');
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
        storageWarning,
        dismissStorageWarning: () => setStorageWarning(null),
        recoveryLocked,
        startFresh,
        downloadCorruptedData,
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
        updateExtraExpense,
        deleteExtraExpense,
        addExtraIncome,
        deleteExtraIncome,
        updateSchedule,
        setVariableOverride,
        toggleBillPaid,
        markAllBillsPaidInPayday,
        unmarkAllBillsPaidInPayday,
        customExpenseCategories,
        addCustomExpenseCategory,
        deleteCustomExpenseCategory,
        customBillCategories,
        addCustomBillCategory,
        deleteCustomBillCategory,
        clearAllData,
        removeDemoData,
        exportData,
        importData,
        inspectImport,
        applyImport,
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
