import { BillCategory } from '../types';

export const CATEGORY_COLORS: Record<BillCategory | string, string> = {
  'Housing': '#7C3AED',         // Violet 500
  'Utilities': '#A78BFA',       // Lavender / Light Purple
  'Car': '#C084FC',             // Magenta / Pinkish Purple
  'Insurance': '#6D28D9',       // Deep Purple
  'Phone & Internet': '#E879F9', // Fuchsia
  'Subscriptions': '#DDD6FE',   // Soft Lilac
  'Food & Household': '#818CF8', // Indigo / Soft Blue-Purple
  'Debt & Credit': '#F43F5E',   // Soft Red
  'Savings': '#34D399',         // Mint
  'Other': '#A1A1AA',           // Zinc
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#A78BFA';
}

