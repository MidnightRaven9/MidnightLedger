import React from 'react';

interface TaxBadgeProps {
  percent: number;
  className?: string;
}

export const TaxBadge: React.FC<TaxBadgeProps> = React.memo(({ percent, className = '' }) => {
  return (
    <span 
      className={`px-2 py-0.5 rounded-full border border-rose-500/30 text-rose-300 bg-rose-950/20 text-[10px] font-semibold inline-flex items-center gap-1 ${className}`}
    >
      Tax {percent}%
    </span>
  );
});

TaxBadge.displayName = 'TaxBadge';
