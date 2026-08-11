import React from 'react';

interface SplitBadgeProps {
  ways?: number;
  className?: string;
}

export const SplitBadge: React.FC<SplitBadgeProps> = React.memo(({ ways = 2, className = '' }) => {
  return (
    <span 
      className={`px-2.5 py-0.5 rounded-full border border-[#F59E0B] text-[#F59E0B] bg-[#431407] text-[11px] font-semibold inline-flex items-center gap-1 ${className}`}
    >
      Split {ways} ways
    </span>
  );
});

SplitBadge.displayName = 'SplitBadge';
