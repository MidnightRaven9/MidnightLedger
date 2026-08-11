import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface FullTotalPillProps {
  amount: number;
  label?: string;
  className?: string;
}

export const FullTotalPill: React.FC<FullTotalPillProps> = React.memo(({ amount, label = 'Full:', className = '' }) => {
  return (
    <span 
      className={`px-2.5 py-1 rounded-lg border border-[#7C3AED] bg-[#2A1B4B] text-[#C4B5FD] text-[12px] font-semibold inline-flex items-center gap-1 ${className}`}
    >
      {label} {formatCurrency(amount)}
    </span>
  );
});

FullTotalPill.displayName = 'FullTotalPill';
export default FullTotalPill;
