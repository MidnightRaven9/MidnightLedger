export * from './types/bill';
export * from './types/payday';
export * from './types/expense';

export type ScheduleFrequency = 'weekly' | 'biweekly' | 'twice_monthly' | 'monthly' | 'manual';

export interface PaydaySchedule {
  frequency: ScheduleFrequency;
  anchorDate: string; // YYYY-MM-DD
  firstDayOfMonth?: number; // For twice_monthly, e.g. 1
  secondDayOfMonth?: number; // For twice_monthly, e.g. 15
  monthlyDay?: number; // For monthly, e.g. 15
}

export interface AssignedBill {
  bill: import('./types/bill').Bill;
  effectiveAmount: number; // My Share amount
  effectiveFullTotal?: number; // Full bill total
  isOverride: boolean;
  isPaid: boolean;
  dueFullDate: string; // YYYY-MM-DD exact due date in this period
}

export interface PaydaySummary {
  payday: import('./types/payday').Payday;
  nextPaydayDate: string; // End of this pay period
  assignedBills: AssignedBill[];
  extraExpenses: import('./types/expense').ExtraExpense[];
  extraIncomes: import('./types/expense').ExtraIncome[];
  totalBills: number;
  totalExtraExpenses: number;
  totalExtraIncome: number;
  totalOutflow: number;
  estimatedCheck: number | null; // Base paycheck amount
  totalAvailable: number | null; // Base paycheck + totalExtraIncome
  leftOver: number | null; // totalAvailable - totalOutflow
  status: 'positive' | 'negative' | 'neutral';
}
