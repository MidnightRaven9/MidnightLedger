import React from 'react';
import { Trash2, X, CalendarX } from 'lucide-react';
import { Bill } from '../types';
import { usePayday } from '../context/PaydayContext';
import { 
  formatCurrency, 
  getOrdinalSuffix, 
  formatMonthYear, 
  formatMonthName, 
  toISODateString 
} from '../utils/dateUtils';

interface DeleteBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  paydayDate?: string;
}

export const DeleteBillModal: React.FC<DeleteBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  paydayDate,
}) => {
  const { deleteBill, deleteBillOccurrence, nextPaydaySummary, showToast } = usePayday();

  if (!isOpen || !bill) return null;

  // Determine effective date for single-month deletion
  const effectiveDate = paydayDate || nextPaydaySummary?.payday.date || toISODateString(new Date());
  const monthYearLabel = formatMonthYear(effectiveDate) || 'this month';
  const monthLongName = formatMonthName(effectiveDate) || 'August';

  const handleDeleteThisMonth = () => {
    deleteBillOccurrence(bill.id, effectiveDate);
    showToast(`Skipped for ${monthLongName} only`);
    onClose();
  };

  const handleDeleteAllFuture = () => {
    deleteBill(bill.id);
    showToast('Bill deleted permanently');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden p-6 text-white space-y-5">
        
        {/* Header Icon & Close Button */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)] flex items-center justify-center font-bold shrink-0">
            <Trash2 className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Title & Body */}
        <div>
          <h3 className="text-xl font-extrabold text-white mb-1">
            Delete {bill.name}?
          </h3>
          <p className="text-xs font-semibold text-[var(--accent)] mb-2">
            {formatCurrency(bill.amount)} {bill.isSplit ? '(My Share)' : ''} &bull; Due on the {getOrdinalSuffix(bill.dueDate)} of every month
          </p>
        </div>

        {/* 3 Action Options */}
        <div className="space-y-3 pt-1">
          
          {/* Option 1: Delete Just This Month */}
          <button
            onClick={handleDeleteThisMonth}
            className="w-full p-4 rounded-2xl bg-[var(--accent-soft)] hover:bg-[#2A2345] border border-[var(--border-strong)] text-left transition-all cursor-pointer group hover:border-[var(--accent)] shadow-md"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-extrabold text-white group-hover:text-[var(--accent)] transition-colors flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-[var(--accent)]" />
                Delete Just This Month
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--border-strong)] text-[var(--accent)]">
                Temporary
              </span>
            </div>
            <p className="text-xs text-white/60 pl-6">
              Only removes from {monthYearLabel}. Bill will return next month.
            </p>
          </button>

          {/* Option 2: Delete All Future Months */}
          <button
            onClick={handleDeleteAllFuture}
            className="w-full p-4 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-left transition-all cursor-pointer group hover:border-rose-700 shadow-md"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-extrabold text-rose-300 group-hover:text-rose-200 transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Delete All Future Months
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800/50">
                Permanent
              </span>
            </div>
            <p className="text-xs text-white/60 pl-6">
              Removes this recurring bill template completely.
            </p>
          </button>

          {/* Option 3: Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] text-white/80 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
};
