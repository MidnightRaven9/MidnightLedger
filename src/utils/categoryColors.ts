import { BillCategory } from '../types';

export const CATEGORY_COLORS: Record<BillCategory | string, string> = {
  'Housing': '#8B5CF6',         // Purple
  'Utilities': '#3B82F6',       // Blue
  'Car': '#EC4899',             // Pink
  'Insurance': '#6366F1',       // Indigo
  'Phone & Internet': '#F43F5E', // Rose
  'Subscriptions': '#06B6D4',   // Cyan
  'Streaming Subscriptions': '#06B6D4', // Cyan
  'Food & Household': '#10B981', // Emerald
  'Debt & Credit': '#EF4444',   // Red
  'Savings': '#34D399',         // Mint
  'Cash App': '#8B5CF6',        // Purple
  'Cigs': '#A78BFA',            // Violet
  'Bills': '#60A5FA',           // Light Blue
  'Medical': '#10B981',         // Green
  'Entertainment': '#F59E0B',   // Amber
  'Personal': '#EAB308',        // Yellow
  'Transportation': '#FB7185',  // Coral
  'Other': '#9CA3AF',           // Zinc/Grey
};

const PALETTE = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#A78BFA', // Violet
  '#F43F5E', // Rose
  '#6366F1', // Indigo
  '#34D399', // Mint
  '#EAB308', // Yellow
  '#FB7185', // Coral
  '#60A5FA', // Light Blue
  '#818CF8', // Soft Indigo
  '#C084FC', // Light Purple
];

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

