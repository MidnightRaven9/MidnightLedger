import React from 'react';
import { Trash2, X } from 'lucide-react';
import { ExtraExpense } from '../types';
import { formatDate } from '../utils/dateUtils';
import { getCategoryEmoji } from '../utils/emojis';

interface DeleteExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExtraExpense | null;
  onConfirm: () => void;
}

export const DeleteExpenseModal: React.FC<DeleteExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onConfirm,
}) => {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-[#1a1a1a] rounded-[20px] border border-[#2a2a2a] shadow-2xl overflow-hidden p-6 relative flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-[#2a1f3a] border border-[#7C3AED] flex items-center justify-center text-xl">
            🗑️
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-white/50 hover:bg-[#2A2A2A] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-[28px] font-bold text-white mb-2 leading-tight">
          Delete {expense.description}?
        </h2>
        <p className="text-[#a78bfa] text-[14px] font-medium mb-6">
          {expense.emoji || getCategoryEmoji(expense.category)} {expense.category || 'Other'} • -${expense.amount.toFixed(2)} • Paycheck: {formatDate(expense.paydayDate, 'short')}
        </p>

        <div className="space-y-3 mb-6">
          <button 
            onClick={onConfirm}
            className="w-full bg-[#2a1a1f] border border-[#4a2a2f] rounded-[16px] p-4 text-left hover:bg-[#3a1c22] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#f87171]">🗑️</span>
              <span className="text-[#f87171] font-bold text-[15px]">Delete This Expense</span>
              <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Permanent
              </span>
            </div>
            <p className="text-[12px] text-white/60 leading-relaxed">
              This will permanently remove this expense and restore ${expense.amount.toFixed(2)} to your Paycheck on {formatDate(expense.paydayDate, 'medium')} balance.
            </p>
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-[12px] h-[48px] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
