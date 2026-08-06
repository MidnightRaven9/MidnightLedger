export type BillCategory = 
  | 'Housing' 
  | 'Utilities' 
  | 'Car' 
  | 'Insurance' 
  | 'Phone & Internet' 
  | 'Subscriptions' 
  | 'Food & Household' 
  | 'Debt & Credit' 
  | 'Savings' 
  | 'Other';

export type BillType = 'fixed' | 'variable';
export type SplitType = 'even' | 'custom' | 'percentage';

export interface Bill {
  id: string;
  name: string;
  myShare?: number; // User's personal share amount
  amount: number; // Backwards compatibility with 'amount'
  fullTotal?: number; // Total full bill amount before split
  splitWays?: number; // Number of split ways
  isSplit?: boolean;
  category: BillCategory;
  dueDay?: number; // Day of month (1 - 31)
  dueDate: number; // Backwards compatibility with 'dueDate'
  type: 'Fixed' | 'Variable' | BillType; // Support both uppercase and lowercase
  notes?: string;
  isActive: boolean;
  isRecurringTemplate?: boolean;
  isDebt?: boolean;
  totalBalance?: number;
  interestRate?: number;
  splitType?: SplitType;
  splitCount?: number;
  mySharePercentage?: number;
  customMyShare?: number;
  emoji?: string;
}
