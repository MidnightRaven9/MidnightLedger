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
  const showSplitDetails = bill.isSplit && (viewMode === 'myShare' || showFull);

  return (
    <div 
      id={`bill-${bill.id}`}
      className={`p-3.5 sm:p-4 rounded-2xl border shadow-lg space-y-3 relative hover:border-[#7C3AED]/40 transition-all ${
        isPaid 
          ? 'paid-bill bg-purple-600/10 border-purple-600/30' 
          : 'bg-[#121212] border-[#2A2A2A]'
      } ${className}`}
    >
      {/* Top Row: Left Checkbox + Name + Tags & Amount (Right) */}
      <div className="flex items-start justify-between gap-3">
        {onTogglePaid && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePaid();
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
              isPaid ? 'bg-purple-600 border-purple-600' : 'border-zinc-600 hover:border-zinc-400'
            }`}
            title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
          >
            {isPaid && <span className="text-white text-xs font-bold">✓</span>}
          </button>
        )}

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`bill-name font-extrabold text-base ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {isPaid ? '💜 ' : `${billEmoji} `}{bill.name}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${catColorClass}`}>
              {bill.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-950/40 text-[#C084FC] border border-violet-900/50">
              {bill.type === 'fixed' || bill.type === 'Fixed' ? 'Fixed' : 'Variable'}
            </span>
            {bill.isSplit && <SplitBadge ways={splitWays} />}
            {isPaid && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1">
                <span className="animate-pulse">💜</span> Paid
              </span>
            )}
          </div>

          {/* Amount and Sub-Pills */}
          {bill.isSplit ? (
            <div className="space-y-2 pt-1">
              {viewMode === 'myShare' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[18px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
                      {formatCurrency(myShareVal)}
                    </span>
                    <span className="text-xs text-white/60 font-semibold">My Share</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FullTotalPill amount={fullTotalVal} />
                    <span className="px-2.5 py-1 rounded-lg border border-[#F59E0B] bg-[#431407] text-[#FCD34D] text-[12px] font-semibold">
                      Split {splitWays} ways
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[18px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-[#F59E0B]'}`}>
                      {formatCurrency(fullTotalVal)}
                    </span>
                    <span className="text-xs text-white/60 font-semibold">Full Total</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg border border-[#7C3AED] bg-[#2A1B4B] text-[#C4B5FD] text-[12px] font-semibold">
                      My Share: {formatCurrency(myShareVal)}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg border border-[#F59E0B] bg-[#431407] text-[#FCD34D] text-[12px] font-semibold">
                      Split {splitWays} ways
                    </span>
                  </div>
                </>
              )}
              <div className="text-xs text-white/50">
                Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} &bull; Full total {formatCurrency(fullTotalVal)} split
              </div>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              <div className={`text-[18px] font-bold ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
                {formatCurrency(displayAmt)}
                {viewMode === 'fullTotal' && (
                  <span className="text-xs text-white/60 font-semibold ml-2">Full Total</span>
                )}
              </div>
              <div className="text-xs text-white/50">
                Due {getOrdinalSuffix(bill.dueDay || bill.dueDate)} of every month
              </div>
            </div>
          )}
        </div>

        {/* Right side simple overview info */}
        <div className="text-right shrink-0">
          <div className="space-y-0.5">
            <span className={`text-base font-black block ${isPaid ? 'line-through text-zinc-400' : 'text-white'}`}>
              {formatCurrency(displayAmt)}
            </span>
            {bill.isSplit && (
              <span className="text-[12px] text-white/50 block">
                of {formatCurrency(fullTotalVal)} total
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active/Paused and Actions */}
      {(onEdit || onDelete) && (
        <div className="pt-2 border-t border-[#2A2A2A] flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
            bill.isActive 
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' 
              : 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
          }`}>
            {bill.isActive ? 'Active' : 'Paused'}
          </span>

          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
                title="Edit bill"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
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
