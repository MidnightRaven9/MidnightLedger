import { Bill, SplitType } from '../types';
import { formatCurrency } from './dateUtils';

export function calculateSplitShare(
  fullTotal: number,
  splitType: SplitType = 'even',
  splitCount: number = 2,
  mySharePercentage: number = 50,
  customMyShare?: number
): number {
  if (isNaN(fullTotal) || fullTotal <= 0) return 0;

  let myShare = fullTotal;
  if (splitType === 'even') {
    const count = Math.max(1, splitCount);
    myShare = fullTotal / count;
  } else if (splitType === 'percentage') {
    const pct = Math.max(0, Math.min(100, mySharePercentage));
    myShare = fullTotal * (pct / 100);
  } else if (splitType === 'custom') {
    if (customMyShare !== undefined && !isNaN(customMyShare) && customMyShare >= 0) {
      myShare = customMyShare;
    }
  }

  return Math.round(myShare * 100) / 100;
}

export function getSplitContextText(bill: Bill, effectiveFullTotal?: number, effectiveMyShare?: number): string {
  if (!bill.isSplit) return '';

  const full = effectiveFullTotal ?? bill.fullTotal ?? bill.amount;

  if (bill.splitType === 'even') {
    const count = bill.splitCount || 2;
    return `of ${formatCurrency(full)} total - Split ${count} ways`;
  } else if (bill.splitType === 'percentage') {
    const pct = bill.mySharePercentage || 50;
    return `of ${formatCurrency(full)} total - Split ${pct}%`;
  } else if (bill.splitType === 'custom') {
    return `of ${formatCurrency(full)} total - Custom split`;
  }

  return `of ${formatCurrency(full)} total`;
}
