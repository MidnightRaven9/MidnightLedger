import { useCallback } from 'react';
import { Payday } from '../types';
import { calcNet, calcTaxAmount } from '../utils/calculations';

/**
 * Custom hook to encapsulate payday estimates and tax calculations
 */
export function usePaydays(paydays: Payday[], setPaydays?: (paydays: Payday[]) => void) {
  const addPayday = useCallback((paydayData: Omit<Payday, 'id'>) => {
    if (!setPaydays) return;
    const newPayday: Payday = {
      ...paydayData,
      id: `payday_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isManual: true,
    };
    const filtered = paydays.filter(p => p.date !== paydayData.date);
    setPaydays([...filtered, newPayday].sort((a, b) => a.date.localeCompare(b.date)));
  }, [paydays, setPaydays]);

  const updatePayday = useCallback((updated: Payday) => {
    if (!setPaydays) return;
    const exists = paydays.some(p => p.id === updated.id || p.date === updated.date);
    if (exists) {
      setPaydays(paydays.map(p => (p.id === updated.id || p.date === updated.date ? { ...p, ...updated, isManual: true } : p)));
    } else {
      setPaydays([...paydays, { ...updated, isManual: true }]);
    }
  }, [paydays, setPaydays]);

  return {
    addPayday,
    updatePayday,
    calcNet,
    calcTaxAmount,
  };
}
