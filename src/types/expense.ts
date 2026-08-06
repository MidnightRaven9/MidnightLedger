export interface Expense {
  id: string;
  description: string;
  amount: number;
  paydayDate: string; // Target payday date YYYY-MM-DD
  category?: string;
  createdAt?: string;
  date?: string; // Transaction date YYYY-MM-DD
  paymentMethod?: string;
}

export interface ExtraExpense {
  id: string;
  description: string;
  amount: number;
  paydayDate: string; // Target payday date YYYY-MM-DD
  category?: string;
  createdAt?: string;
  date?: string; // Transaction date YYYY-MM-DD
  paymentMethod?: string;
}

export interface ExtraIncome {
  id: string;
  amount: number;
  source: string;
  dateAdded: string; // YYYY-MM-DD
  paydayDate: string; // Target payday date YYYY-MM-DD
  timestamp?: number;
}
