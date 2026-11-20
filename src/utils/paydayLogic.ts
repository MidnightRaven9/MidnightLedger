import { 
  Bill, 
  Payday, 
  PaydaySchedule, 
  ScheduleFrequency,
  ExtraExpense, 
  ExtraIncome,
  AssignedBill, 
  PaydaySummary 
} from '../types';
import { 
  addDays, 
  parseISODate, 
  toISODateString, 
  getDaysInMonth, 
  compareDates 
} from './dateUtils';
import { getMyShare } from './calculations';

/**
 * Generate a sequence of projected paydays based on schedule parameters
 */
export function generatePaydaysFromSchedule(
  schedule: PaydaySchedule, 
  existingPaydays: Payday[],
  count: number = 12
): Payday[] {
  const manualPaydays = existingPaydays.filter(p => p.isManual);
  const existingAmountsMap = new Map<string, number | null>();
  existingPaydays.forEach(p => {
    if (p.estimatedAmount !== null && p.estimatedAmount !== undefined) {
      existingAmountsMap.set(p.date, p.estimatedAmount);
    }
  });

  // Find if there is any user-entered amount in existing paydays to suggest for the very first upcoming pay period
  let firstValidUserAmount: number | null = null;
  for (const p of existingPaydays) {
    if (p.estimatedAmount !== null && p.estimatedAmount !== undefined && p.estimatedAmount > 0) {
      firstValidUserAmount = p.estimatedAmount;
      break;
    }
  }

  if (schedule.frequency === 'manual') {
    if (!schedule.anchorDate || schedule.anchorDate === '') {
      return manualPaydays.sort((a, b) => compareDates(a.date, b.date));
    }
    return existingPaydays.sort((a, b) => compareDates(a.date, b.date));
  }

  const projected: Payday[] = [];
  const anchor = parseISODate(schedule.anchorDate || toISODateString(new Date()));
  
  if (schedule.frequency === 'weekly') {
    let curr = new Date(anchor);
    for (let i = 0; i < count; i++) {
      const dateStr = toISODateString(curr);
      const userStored = existingAmountsMap.get(dateStr);
      // Only first pay period gets firstValidUserAmount if no stored amount for date, all others null
      const assignedAmount = userStored !== undefined 
        ? userStored 
        : (i === 0 ? (firstValidUserAmount !== null ? firstValidUserAmount : null) : null);

      projected.push({
        id: `auto_${dateStr}`,
        date: dateStr,
        estimatedAmount: assignedAmount,
        isManual: false,
      });
      curr.setDate(curr.getDate() + 7);
    }
  } else if (schedule.frequency === 'biweekly') {
    let curr = new Date(anchor);
    for (let i = 0; i < count; i++) {
      const dateStr = toISODateString(curr);
      const userStored = existingAmountsMap.get(dateStr);
      const assignedAmount = userStored !== undefined 
        ? userStored 
        : (i === 0 ? (firstValidUserAmount !== null ? firstValidUserAmount : null) : null);

      projected.push({
        id: `auto_${dateStr}`,
        date: dateStr,
        estimatedAmount: assignedAmount,
        isManual: false,
      });
      curr.setDate(curr.getDate() + 14);
    }
  } else if (schedule.frequency === 'twice_monthly') {
    const day1 = schedule.firstDayOfMonth || 1;
    const day2 = schedule.secondDayOfMonth || 15;
    
    let year = anchor.getFullYear();
    let month = anchor.getMonth();
    let index = 0;

    for (let i = 0; i < Math.ceil(count / 2); i++) {
      const maxDays = getDaysInMonth(year, month);
      
      const d1 = Math.min(day1, maxDays);
      const date1Str = toISODateString(new Date(year, month, d1));
      
      const d2 = Math.min(day2, maxDays);
      const date2Str = toISODateString(new Date(year, month, d2));

      if (date1Str >= schedule.anchorDate) {
        const userStored = existingAmountsMap.get(date1Str);
        const assignedAmount = userStored !== undefined 
          ? userStored 
          : (index === 0 ? (firstValidUserAmount !== null ? firstValidUserAmount : null) : null);

        projected.push({
          id: `auto_${date1Str}`,
          date: date1Str,
          estimatedAmount: assignedAmount,
          isManual: false,
        });
        index++;
      }
      
      if (date2Str >= schedule.anchorDate && date2Str !== date1Str) {
        const userStored = existingAmountsMap.get(date2Str);
        const assignedAmount = userStored !== undefined 
          ? userStored 
          : (index === 0 ? (firstValidUserAmount !== null ? firstValidUserAmount : null) : null);

        projected.push({
          id: `auto_${date2Str}`,
          date: date2Str,
          estimatedAmount: assignedAmount,
          isManual: false,
        });
        index++;
      }

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  } else if (schedule.frequency === 'monthly') {
    const mDay = schedule.monthlyDay || 15;
    let year = anchor.getFullYear();
    let month = anchor.getMonth();

    for (let i = 0; i < count; i++) {
      const maxDays = getDaysInMonth(year, month);
      const actualDay = Math.min(mDay, maxDays);
      const dateStr = toISODateString(new Date(year, month, actualDay));

      const userStored = existingAmountsMap.get(dateStr);
      const assignedAmount = userStored !== undefined 
        ? userStored 
        : (i === 0 ? (firstValidUserAmount !== null ? firstValidUserAmount : null) : null);

      projected.push({
        id: `auto_${dateStr}`,
        date: dateStr,
        estimatedAmount: assignedAmount,
        isManual: false,
      });

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  }

  // Combine generated with manual paydays, avoiding exact date duplicates
  const combinedMap = new Map<string, Payday>();
  
  projected.forEach(p => combinedMap.set(p.date, p));
  manualPaydays.forEach(p => combinedMap.set(p.date, p)); // Manual overrides auto if same date

  const result = Array.from(combinedMap.values()).sort((a, b) => compareDates(a.date, b.date));
  return result;
}

/**
 * Predict the next payday after the current one. Weekly/biweekly schedules are
 * a fixed offset; monthly schedules must follow their configured day(s) or the
 * pay period ends on the wrong date.
 */
export function getProjectedNextPaydayDate(
  lastPaydayDateStr: string,
  schedule?: PaydaySchedule | ScheduleFrequency,
): string {
  const frequency: ScheduleFrequency = typeof schedule === 'string' ? schedule : (schedule?.frequency ?? 'manual');
  if (frequency === 'weekly') return addDays(lastPaydayDateStr, 7);
  if (frequency === 'biweekly') return addDays(lastPaydayDateStr, 14);

  const config = typeof schedule === 'object' && schedule !== null ? schedule : undefined;
  const last = parseISODate(lastPaydayDateStr);
  if (Number.isNaN(last.getTime())) return addDays(lastPaydayDateStr, 14);

  const dayToDate = (year: number, month: number, day: number): string =>
    toISODateString(new Date(year, month, Math.min(day, getDaysInMonth(year, month))));

  const monthCandidates: string[] = [];
  const pushMonth = (year: number, month: number) => {
    if (frequency === 'monthly') {
      monthCandidates.push(dayToDate(year, month, config?.monthlyDay || 15));
    } else if (frequency === 'twice_monthly') {
      monthCandidates.push(dayToDate(year, month, config?.firstDayOfMonth || 1));
      monthCandidates.push(dayToDate(year, month, config?.secondDayOfMonth || 15));
    }
  };

  pushMonth(last.getFullYear(), last.getMonth());
  const nextMonth = new Date(last.getFullYear(), last.getMonth() + 1, 1);
  pushMonth(nextMonth.getFullYear(), nextMonth.getMonth());

  const upcoming = monthCandidates
    .filter(date => date > lastPaydayDateStr)
    .sort(compareDates);
  return upcoming.length ? upcoming[0] : addDays(lastPaydayDateStr, 14);
}

/**
 * Main engine: Compute summary for all paydays, assigning bills to pay periods
 */
export function calculatePaydaySummaries(
  paydays: Payday[],
  bills: Bill[],
  extraExpenses: ExtraExpense[],
  schedule: PaydaySchedule,
  variableOverrides: Record<string, number>, // `${billId}_${paydayDate}` -> override myShare amount
  paidStatuses: Record<string, boolean>, // `${billId}_${paydayDate}` -> boolean
  variableFullTotalOverrides?: Record<string, number>, // `${billId}_${paydayDate}` -> override full total amount
  excludedOccurrences?: Record<string, boolean>, // `${billId}_${paydayDate}` or `${billId}_${dueDate}` -> boolean
  extraIncomes: ExtraIncome[] = []
): PaydaySummary[] {
  if (!paydays.length) return [];

  // Deduplicate paydays by date
  const uniquePaydaysMap = new Map<string, Payday>();
  paydays.forEach(p => {
    const existing = uniquePaydaysMap.get(p.date);
    if (!existing) {
      uniquePaydaysMap.set(p.date, p);
    } else {
      if (p.isManual || ((p.estimatedAmount ?? 0) > 0 && !(existing.estimatedAmount && existing.estimatedAmount > 0))) {
        uniquePaydaysMap.set(p.date, p);
      }
    }
  });

  const sortedPaydays = Array.from(uniquePaydaysMap.values()).sort((a, b) => compareDates(a.date, b.date));
  const activeBills = bills.filter(b => b.isActive);

  const startDateStr = sortedPaydays[0].date;
  const lastPaydayDate = sortedPaydays[sortedPaydays.length - 1].date;
  const endDateStr = getProjectedNextPaydayDate(lastPaydayDate, schedule);

  interface BillOccurrence {
    bill: Bill;
    dueDateStr: string;
  }

  const occurrences: BillOccurrence[] = [];
  
  const startYear = parseISODate(startDateStr).getFullYear();
  const endYear = parseISODate(endDateStr).getFullYear();

  for (let y = startYear - 1; y <= endYear + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const monthFirst = toISODateString(new Date(y, m, 1));
      const monthLast = toISODateString(new Date(y, m + 1, 0));

      if (monthLast < addDays(startDateStr, -31) || monthFirst > addDays(endDateStr, 31)) {
        continue;
      }

      const daysInM = getDaysInMonth(y, m);

      for (const bill of activeBills) {
        const actualDay = Math.min(bill.dueDate, daysInM);
        const dueFullDate = toISODateString(new Date(y, m, actualDay));
        occurrences.push({
          bill,
          dueDateStr: dueFullDate,
        });
      }
    }
  }

  return sortedPaydays.map((payday, idx) => {
    const nextPaydayDate = (idx < sortedPaydays.length - 1)
      ? sortedPaydays[idx + 1].date
      : getProjectedNextPaydayDate(payday.date, schedule);

    // Bills assigned to this payday: due >= payday.date AND due < nextPaydayDate
    const assignedForThisPayday: AssignedBill[] = occurrences
      .filter(occ => {
        if (occ.dueDateStr < payday.date || occ.dueDateStr >= nextPaydayDate) return false;
        if (excludedOccurrences) {
          const keyByPayday = `${occ.bill.id}_${payday.date}`;
          const keyByPaydayMonth = `${occ.bill.id}_${payday.date.slice(0, 7)}`;
          const keyByDueDate = `${occ.bill.id}_${occ.dueDateStr}`;
          const keyByDueMonth = `${occ.bill.id}_${occ.dueDateStr.slice(0, 7)}`;
          if (
            excludedOccurrences[keyByPayday] || 
            excludedOccurrences[keyByPaydayMonth] || 
            excludedOccurrences[keyByDueDate] || 
            excludedOccurrences[keyByDueMonth]
          ) {
            return false;
          }
        }
        return true;
      })
      .map(occ => {
        const key = `${occ.bill.id}::${payday.date}`;
        const altKey = `${occ.bill.id}_${payday.date}`;
        const override = variableOverrides[key] ?? variableOverrides[altKey];
        const isOverride = override !== undefined;
        const effectiveAmount = isOverride ? override : getMyShare(occ.bill);

        const fullOverride = (variableFullTotalOverrides?.[key] ?? variableFullTotalOverrides?.[altKey]);
        const effectiveFullTotal = fullOverride !== undefined
          ? fullOverride
          : (occ.bill.isSplit ? (occ.bill.fullTotal ?? occ.bill.amount) : occ.bill.amount);

                const nameKey = `${occ.bill.name}::${payday.date}`;
        const nameAltKey = `${occ.bill.name}_${payday.date}`;
        const dueKey = `${occ.bill.id}::${occ.dueDateStr}`;
        const dueAltKey = `${occ.bill.id}_${occ.dueDateStr}`;
        const nameDueKey = `${occ.bill.name}::${occ.dueDateStr}`;
        const nameDueAltKey = `${occ.bill.name}_${occ.dueDateStr}`;

        const possibleKeys = [
          key, altKey, nameKey, nameAltKey, dueKey, dueAltKey, nameDueKey, nameDueAltKey,
          occ.bill.id, occ.bill.name, String((occ.bill as any)._id || '')
        ].filter(Boolean);

        let paidStatus: boolean | string | undefined = undefined;
        for (const k of possibleKeys) {
          if (k in paidStatuses && paidStatuses[k] !== undefined) {
            paidStatus = paidStatuses[k];
            break;
          }
        }

        if (paidStatus === undefined) {
          paidStatus = (occ.bill as any).isPaid ?? (occ.bill as any).paid ?? false;
        }

        const isPaid = !!paidStatus;
        const paidWithPaydayId = typeof paidStatus === 'string' ? paidStatus : (isPaid ? payday.date : undefined);
        const paidEarly = typeof paidStatus === 'string' && paidStatus !== payday.date;

        return {
          bill: occ.bill,
          effectiveAmount,
          effectiveFullTotal,
          isOverride,
          isPaid,
          dueFullDate: occ.dueDateStr,
          originalAssignedPayday: payday.date,
          paidWithPaydayId,
          paidEarly
        };
      });

    // Now we need to also grab bills from OTHER paydays that were paid with THIS payday.
    const earlyPaidItems: AssignedBill[] = [];
    Object.keys(paidStatuses).forEach(k => {
      const pStatus = paidStatuses[k];
      if (typeof pStatus === 'string' && pStatus === payday.date) {
        const parts = k.split('::');
        const billId = parts[0];
        const origPaydayDate = parts[1];
        
        if (origPaydayDate && origPaydayDate !== payday.date) {
          const billObj = bills.find(b => {
             const bAny = b as any;
             return bAny.id === billId || bAny.originalBillId === billId || bAny.billId === billId;
          });
          if (billObj) {
            const occ = occurrences.find(o => {
               const oAny = o.bill as any;
               return (oAny.id === billId || oAny.originalBillId === billId || oAny.billId === billId) && 
                      o.dueDateStr >= origPaydayDate;
            });
            
            const override = variableOverrides[k];
            const effectiveAmount = override !== undefined ? override : getMyShare(billObj);
            const fullOverride = variableFullTotalOverrides?.[k];
            const effectiveFullTotal = fullOverride !== undefined ? fullOverride : (billObj.isSplit ? (billObj.fullTotal ?? billObj.amount) : billObj.amount);

            earlyPaidItems.push({
              bill: billObj,
              effectiveAmount,
              effectiveFullTotal,
              isOverride: override !== undefined,
              isPaid: true,
              dueFullDate: occ ? occ.dueDateStr : origPaydayDate,
              originalAssignedPayday: origPaydayDate,
              paidWithPaydayId: payday.date,
              paidEarly: true,
              isPaidEarly: true 
            });
          }
        }
      }
    });

    const combinedAssigned = [...assignedForThisPayday, ...earlyPaidItems].sort((a, b) => compareDates(a.dueFullDate, b.dueFullDate));

    const assignedExpenses = extraExpenses.filter(e => e.paydayDate === payday.date);

    const assignedIncomes = extraIncomes.filter(i => i.paydayDate === payday.date);

    const totalBills = combinedAssigned.reduce((sum, item) => {
      // If the bill was paid with ANOTHER paycheck, it shouldn't deduct from THIS paycheck's available money.
      const isPaidWithOther = item.paidWithPaydayId && item.paidWithPaydayId !== payday.date;
      return sum + (isPaidWithOther ? 0 : item.effectiveAmount);
    }, 0);
    const totalExtraExpenses = assignedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalExtraIncome = assignedIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflow = totalBills + totalExtraExpenses;

    const estimatedCheck = payday.estimatedAmount;
    const hasBaseCheck = estimatedCheck !== null && !isNaN(estimatedCheck) && estimatedCheck > 0;
    const totalAvailable = hasBaseCheck
      ? estimatedCheck + totalExtraIncome
      : (totalExtraIncome > 0 ? totalExtraIncome : null);

    const hasValidAvailable = hasBaseCheck || totalExtraIncome > 0;

    let leftOver: number | null = null;
    let status: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (hasValidAvailable && totalAvailable !== null) {
      leftOver = totalAvailable - totalOutflow;
      if (leftOver >= 0) {
        status = 'positive';
      } else {
        status = 'negative';
      }
    }

    return {
      payday,
      nextPaydayDate,
      assignedBills: combinedAssigned,
      extraExpenses: assignedExpenses,
      extraIncomes: assignedIncomes,
      totalBills,
      totalExtraExpenses,
      totalExtraIncome,
      totalOutflow,
      estimatedCheck,
      totalAvailable,
      leftOver,
      status,
    };
  });
}

/**
 * Determine which payday a transaction date belongs to automatically
 */
export function getPaydayForDate(dateStr: string, summaries: PaydaySummary[]): string {
  if (!summaries || !summaries.length) return '';
  const found = summaries.find(s => dateStr >= s.payday.date && dateStr < s.nextPaydayDate);
  if (found) return found.payday.date;
  if (dateStr < summaries[0].payday.date) return summaries[0].payday.date;
  return summaries[summaries.length - 1].payday.date;
}

