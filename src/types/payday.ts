export interface PaydayEstimate {
  amount: number | null;
  gross?: number;
  taxPercent?: number;
  useTax?: boolean;
  date: string;
}

export interface Payday {
  id: string;
  date: string; // YYYY-MM-DD
  estimatedAmount: number | null;
  isManual?: boolean;
  notes?: string;
  useTax?: boolean;
  gross?: number;
  taxPercent?: number;
}
