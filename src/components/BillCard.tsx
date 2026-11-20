import React from 'react';
import { Edit2, Trash2, CheckCircle2, EyeOff } from 'lucide-react';
import { Bill } from '../types';
import { formatCurrency, getOrdinalSuffix, formatDate } from '../utils/formatters';
import { getMyShare, getFullTotal } from '../utils/calculations';
import { getCategoryEmoji } from '../utils/emojis';

interface BillCardProps {
  bill: Bill;
  viewMode?: 'myShare' | 'fullTotal';
  isPaid?: boolean;
  effectiveAmount?: number;
  dueFullDate?: string;
  onTogglePaid?: () => void;
  onAdjust?: () => void;
  onSkip?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  interactive?: boolean;
  className?: string;
}

export const BillCard: React.FC<BillCardProps> = React.memo(({
  bill,
  viewMode = 'myShare',
  isPaid = false,
  effectiveAmount,
  dueFullDate,
  onTogglePaid,
  onAdjust,
  onSkip,
  onEdit,
  onDelete,
  interactive = false,
  className = '',
}) => {
  const displayAmt = effectiveAmount !== undefined 
    ? effectiveAmount 
    : (viewMode === 'myShare' ? getMyShare(bill) : getFullTotal(bill));

  const myShareVal = getMyShare(bill);
  const fullTotalVal = getFullTotal(bill);
  const splitWays = bill.splitWays || bill.splitCount || 2;
  const billEmoji = bill.emoji || getCategoryEmoji(bill.category);

  const categoryColors: Record<string, string> = {
    'Housing': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
    'Utilities': 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    'Car': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    'Insurance': 'bg-cyan-950/40 text-cyan-400 border-cyan-900/50',
    'Phone & Internet': 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]',
    'Subscriptions': 'bg-rose-950/40 text-rose-400 border-rose-900/50',
    'Streaming Subscriptions': 'bg-rose-950/40 text-rose-400 border-rose-900/50',
    'Food & Household': 'bg-teal-950/40 text-teal-400 border-teal-900/50',
    'Debt & Credit': 'bg-orange-950/40 text-orange-400 border-orange-900/50',
    'Savings': 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--border-strong)]',
  };

  const catColorClass = categoryColors[bill.category] || 'bg-zinc-950/40 text-zinc-400 border-zinc-900/50';

  if (interactive) {
    return (
      <div 
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          isPaid 
            ? 'bg-[var(--surface)]/50 border-[var(--accent)]' 
            : 'bg-[var(--surface-2)]/80 border-[var(--border)] hover:border-[var(--accent)]/40'
        } ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onTogglePaid && (
            <div className="bill-check-wrapper shrink-0" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePaid();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                className={`check-btn bill-check-btn ${isPaid ? 'checked paid' : ''}`}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isPaid ? 'var(--accent)' : 'var(--surface-2)',
                  border: '2px solid var(--accent)',
                  color: 'white',
                  fontSize: '20px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1
                }}
                aria-label="Toggle paid"
                title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
              >
                {isPaid ? '✓' : <span style={{ opacity: 0 }}>✓</span>}
              </button>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span className={`text-xs font-bold block truncate ${isPaid ? 'line-through text-white/50' : 'text-white'}`}>
              {isPaid ? '' : `${billEmoji} `}{bill.name}
            </span>
            
            {bill.isSplit && (
              <span className="text-[10px] text-[var(--accent)] block mt-0.5 font-semibold">
                Full Bill: {formatCurrency(fullTotalVal)} ÷ {splitWays} = {formatCurrency(myShareVal)} your share
              </span>
            )}

            <span className="text-[10px] text-white/50 block mt-0.5">
              Due {dueFullDate ? formatDate(dueFullDate, 'short') : `on the ${getOrdinalSuffix(bill.dueDay || bill.dueDate)}`} &bull; {billEmoji} {bill.category}
            </span>

            <div className="mt-1 flex items-center gap-1.5">
              {isPaid ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Paid
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/50">
                  Unpaid
                </span>
              )}
            </div>

            {bill.notes && (
              <span className="text-[10px] text-[var(--faint)] italic mt-0.5 block truncate">
                {bill.notes}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className={`text-xs font-extrabold block ${isPaid ? 'line-through text-[var(--faint)]' : 'text-white'}`}>
              {formatCurrency(displayAmt)}
            </span>
            {bill.type === 'variable' && onAdjust && !isPaid && (
              <button
                onClick={onAdjust}
                className="text-[9px] text-[var(--accent)] hover:underline block cursor-pointer ml-auto"
              >
                Adjust
              </button>
            )}
          </div>

          {onSkip && !isPaid && (
            <button
              onClick={onSkip}
              className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
              title="Skip this occurrence"
              aria-label="Skip this occurrence"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`bill-${bill.id}`}
      className={`w-full min-w-0 max-w-full overflow-hidden rounded-[18px] p-4 border shadow-lg space-y-3 relative hover:border-[var(--accent)]/40 transition-all box-border ${
        isPaid 
          ? 'paid-bill bg-[var(--accent-soft)] border-[var(--accent)]' 
          : 'bg-[var(--surface-2)] border-zinc-800'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex items-start gap-2.5 min-w-0 flex-1 overflow-hidden">
          {onTogglePaid && (
            <div className="bill-check-wrapper shrink-0" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePaid();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                className={`check-btn bill-check-btn ${isPaid ? 'checked paid' : ''}`}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isPaid ? 'var(--accent)' : 'var(--surface-2)',
                  border: '2px solid var(--accent)',
                  color: 'white',
                  fontSize: '20px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1
                }}
                aria-label="Toggle paid"
                title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
              >
                {isPaid ? '✓' : <span style={{ opacity: 0 }}>✓</span>}
              </button>
            </div>
          )}

          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={`text-[14px] font-bold leading-snug break-words ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {isPaid ? '' : `${billEmoji} `}{bill.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${catColorClass}`}>
                {(bill.category as string) === 'Streaming Subscriptions' ? 'Subscriptions' : bill.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]">
                {bill.type === 'fixed' || bill.type === 'Fixed' ? 'Fixed' : 'Variable'}
              </span>
              {bill.isDemo === true && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40">
                  Example
                </span>
              )}
              {isPaid && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] inline-flex items-center gap-1">
                  Paid
                </span>
              )}
            </div>
          </div>
        </div>

        <span className={`shrink-0 text-[16px] font-black ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
          {formatCurrency(displayAmt)}
        </span>
      </div>

      <div className="mt-2.5 ml-7 min-w-0 overflow-hidden">
        {!bill.isSplit ? (
          <div>
            <p className={`text-[18px] font-black ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {formatCurrency(displayAmt)}
            </p>
            <p className="text-[12px] text-[var(--faint)] mt-0.5 truncate">
              Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} of every month
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'myShare' ? (
                <>
                  <span className={`text-[14px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
                    {formatCurrency(myShareVal)} <span className="text-[var(--faint)] font-normal text-[11px]">My Share</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold border border-[var(--accent)]">
                    Full: {formatCurrency(fullTotalVal)}
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-[14px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-[#F59E0B]'}`}>
                    {formatCurrency(fullTotalVal)} <span className="text-[var(--faint)] font-normal text-[11px]">Full Total</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold border border-[var(--accent)]">
                    My Share: {formatCurrency(myShareVal)}
                  </span>
                </>
              )}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                Split {splitWays} ways
              </span>
            </div>
            <p className="text-[11px] text-[var(--faint)] truncate">
              Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} • Full total {formatCurrency(fullTotalVal)} split
            </p>
          </div>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
            bill.isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {bill.isActive ? 'Active' : 'Paused'}
          </span>

          <div className="flex items-center gap-2 text-zinc-400">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
                title="Edit bill"
                aria-label="Edit bill"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Delete bill"
                aria-label="Delete bill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

BillCard.displayName = 'BillCard';
export default BillCard;
