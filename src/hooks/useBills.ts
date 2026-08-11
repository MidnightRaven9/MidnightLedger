import { useMemo, useCallback } from 'react';
import { Bill } from '../types';
import { getMyShare, getFullTotal, calcTotals } from '../utils/calculations';

/**
 * Custom hook to encapsulate bill calculations and updates
 */
export function useBills(bills: Bill[], setBills?: (bills: Bill[]) => void) {
  const totalMyShare = useMemo(() => {
    return bills.reduce((sum, b) => sum + getMyShare(b), 0);
  }, [bills]);

  const totalFullTotal = useMemo(() => {
    return bills.reduce((sum, b) => sum + getFullTotal(b), 0);
  }, [bills]);

  const addBill = useCallback((billData: Omit<Bill, 'id'>) => {
    if (!setBills) return;
    const newBill: Bill = {
      ...billData,
      id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isRecurringTemplate: billData.isRecurringTemplate ?? true,
      amount: billData.amount ?? billData.myShare ?? 0,
      dueDate: billData.dueDate ?? billData.dueDay ?? 1,
    } as Bill;
    setBills([...bills, newBill]);
  }, [bills, setBills]);

  const updateBill = useCallback((updated: Bill) => {
    if (!setBills) return;
    setBills(bills.map(b => (b.id === updated.id ? updated : b)));
  }, [bills, setBills]);

  const deleteBill = useCallback((id: string) => {
    if (!setBills) return;
    setBills(bills.filter(b => b.id !== id));
  }, [bills, setBills]);

  return {
    totalMyShare,
    totalFullTotal,
    addBill,
    updateBill,
    deleteBill,
    getMyShare,
    getFullTotal,
    calcTotals,
  };
}
