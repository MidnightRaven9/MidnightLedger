import React from 'react';
import { Edit2, Trash2, CheckCircle2, Circle, EyeOff, Heart } from 'lucide-react';
import { Bill } from '../types';
import { formatCurrency, getOrdinalSuffix, formatDate } from '../utils/formatters';
import { getMyShare, getFullTotal } from '../utils/calculations';
import { getCategoryEmoji } from '../utils/emojis';
import { SplitBadge } from './SplitBadge';
import { FullTotalPill } from './FullTotalPill';

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
  interactive?: boolean; // Checklist mode
  showFull?: boolean;
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
  showFull = false,
  className = '',
}) => {
  // Determine displayed amount
  const displayAmt = effectiveAmount !== undefined 
    ? effectiveAmount 
    : (viewMode === 'myShare' ? getMyShare(bill) : getFullTotal(bill));

  const myShareVal = getMyShare(bill);
  const fullTotalVal = getFullTotal(bill);
  const splitWays = bill.splitWays || bill.splitCount || 2;
  const billEmoji = bill.emoji || getCategoryEmoji(bill.category);

  // Category badge color mapping
  const categoryColors: Record<string, string> = {
    'Housing': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
    'Utilities': 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    'Car': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    'Insurance': 'bg-cyan-950/40 text-cyan-400 border-cyan-900/50',
    'Phone & Internet': 'bg-purple-950/40 text-purple-400 border-purple-900/50',
    'Subscriptions': 'bg-rose-950/40 text-rose-400 border-rose-900/50',
    'Streaming Subscriptions': 'bg-rose-950/40 text-rose-400 border-rose-900/50',
    'Food & Household': 'bg-teal-950/40 text-teal-400 border-teal-900/50',
    'Debt & Credit': 'bg-orange-950/40 text-orange-400 border-orange-900/50',
    'Savings': 'bg-violet-950/40 text-violet-400 border-violet-900/50',
  };

  const catColorClass = categoryColors[bill.category] || 'bg-zinc-950/40 text-zinc-400 border-zinc-900/50';

  if (interactive) {
    // ----------------------------------------------------
    // CHECKLIST MODE (Dashboard / Payday Card)
    // ----------------------------------------------------
    return (
      <div 
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          isPaid 
            ? 'bg-[#121212]/50 border-purple-900/40' 
            : 'bg-[#1E1E1E]/80 border-[#2A2A2A] hover:border-[#7C3AED]/40'
        } ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onTogglePaid && (
            <button
              onClick={onTogglePaid}
              className="text-[#A78BFA] hover:text-white transition-colors cursor-pointer shrink-0"
              title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
            >
              {isPaid ? (
                <span className="text-lg inline-block animate-pulse">💜</span>
              ) : (
                <Circle className="w-5 h-5 text-white/30 hover:text-purple-400 transition-colors" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <span className={`text-xs font-bold block truncate ${isPaid ? 'line-through text-white/50' : 'text-white'}`}>
              {isPaid ? '💜 ' : `${billEmoji} `}{bill.name}
            </span>
            
            {/* Display correct split math in interactive mode */}
            {bill.isSplit && (
              <span className="text-[10px] text-[#A78BFA] block mt-0.5 font-semibold">
                Full Bill: {formatCurrency(fullTotalVal)} ÷ {splitWays} = {formatCurrency(myShareVal)} your share
              </span>
            )}

            <span className="text-[10px] text-white/50 block mt-0.5">
              Due {dueFullDate ? formatDate(dueFullDate, 'short') : `on the ${getOrdinalSuffix(bill.dueDay || bill.dueDate)}`} &bull; {billEmoji} {bill.category}
            </span>

            <div className="mt-1 flex items-center gap-1.5">
              {isPaid ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
                  <span className="animate-pulse">💜</span> Paid
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/50">
                  Unpaid
                </span>
              )}
            </div>

            {bill.notes && (
              <span className="text-[10px] text-white/40 italic mt-0.5 block truncate">
                {bill.notes}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className={`text-xs font-extrabold block ${isPaid ? 'line-through text-white/40' : 'text-white'}`}>
              {formatCurrency(displayAmt)}
            </span>
            {bill.type === 'variable' && onAdjust && !isPaid && (
              <button
                onClick={onAdjust}
                className="text-[9px] text-[#A78BFA] hover:underline block cursor-pointer ml-auto"
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
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STANDARD VIEW MODE (BillsView / Reports / List)
  // ----------------------------------------------------
  return (
    <div 
      id={`bill-${bill.id}`}
      className={`w-full min-w-0 max-w-full overflow-hidden rounded-[18px] p-4 border shadow-lg space-y-3 relative hover:border-[#7C3AED]/40 transition-all box-border ${
        isPaid 
          ? 'paid-bill bg-purple-600/10 border-purple-600/30' 
          : 'bg-[#111111] border-zinc-800'
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2 w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex items-start gap-2.5 min-w-0 flex-1 overflow-hidden">
          {onTogglePaid && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePaid();
              }}
              className={`w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                isPaid ? 'bg-purple-600 border-purple-600' : 'hover:border-zinc-400'
              }`}
              title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
            >
              {isPaid && <span className="text-white text-[10px] font-bold">✓</span>}
            </button>
          )}

          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={`text-[15px] font-bold truncate max-w-[155px] sm:max-w-[220px] ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {isPaid ? '💜 ' : `${billEmoji} `}{bill.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${catColorClass}`}>
                {(bill.category as string) === 'Streaming Subscriptions' ? 'Subscriptions' : bill.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {bill.type === 'fixed' || bill.type === 'Fixed' ? 'Fixed' : 'Variable'}
              </span>
              {isPaid && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
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

      {/* Amount & Schedule Row */}
      <div className="mt-2.5 ml-7 min-w-0 overflow-hidden">
        {!bill.isSplit ? (
          <div>
            <p className={`text-[18px] font-black ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {formatCurrency(displayAmt)}
            </p>
            <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
              Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} of every month
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'myShare' ? (
                <>
                  <span className={`text-[14px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
                    {formatCurrency(myShareVal)} <span className="text-zinc-500 font-normal text-[11px]">My Share</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7c3aed]/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                    Full: {formatCurrency(fullTotalVal)}
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-[14px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-[#F59E0B]'}`}>
                    {formatCurrency(fullTotalVal)} <span className="text-zinc-500 font-normal text-[11px]">Full Total</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7c3aed]/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
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
            <p className="text-[11px] text-zinc-500 truncate">
              Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} • Full total {formatCurrency(fullTotalVal)} split
            </p>
          </div>
        )}
      </div>

      {/* Bottom Row: Active/Paused and Actions */}
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
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Delete bill"
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
