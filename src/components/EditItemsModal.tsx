import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { useEscapeToClose } from '../utils/useEscapeToClose';
import { useModalFocus } from '../utils/useModalFocus';

interface EditItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paydayDate: string;
}

export const EditItemsModal: React.FC<EditItemsModalProps> = ({
  isOpen,
  onClose,
  paydayDate
}) => {
  useEscapeToClose(isOpen, onClose);
  const panelRef = React.useRef<HTMLDivElement>(null);
  useModalFocus(panelRef, isOpen);

  const [activeTab, setActiveTab] = useState<'bills' | 'expenses' | 'onetime'>('bills');
  const { summaries, deleteBillOccurrence, deleteExtraExpense } = usePayday();

  if (!isOpen) return null;

  const summary = summaries.find(s => s.payday.date === paydayDate);
  if (!summary) return null;

  const bills = summary.assignedBills;
  const extraItems = summary.extraExpenses;
  
  const expenses = extraItems.filter(e => e.category && e.category !== 'Bills' && e.category !== 'Other' && e.category !== 'Bills / One-Time');
  const oneTime = extraItems.filter(e => !e.category || e.category === 'Bills' || e.category === 'Other' || e.category === 'Bills / One-Time');

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Edit assigned items"
        className="w-full sm:w-[500px] sm:max-w-md bg-[var(--bg)] sm:rounded-[32px] rounded-t-[32px] shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Edit Items</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-4 pt-4 gap-2">
          <button 
            onClick={() => setActiveTab('bills')}
            aria-pressed={activeTab === 'bills'}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'bills' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-zinc-400 hover:text-white'}`}
          >
            Bills ({bills.length})
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            aria-pressed={activeTab === 'expenses'}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'expenses' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-zinc-400 hover:text-white'}`}
          >
            Expenses ({expenses.length})
          </button>
          <button 
            onClick={() => setActiveTab('onetime')}
            aria-pressed={activeTab === 'onetime'}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'onetime' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-zinc-400 hover:text-white'}`}
          >
            One-Time ({oneTime.length})
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'bills' && (
            <div className="space-y-3">
              {bills.length === 0 ? <p className="text-[var(--faint)] text-center py-4">No bills assigned.</p> : null}
              {bills.map(b => (
                <div key={b.bill.id} className="p-3 bg-[var(--surface)] rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{b.bill.name}</p>
                    <p className="text-xs text-[var(--faint)]">${b.effectiveAmount.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => deleteBillOccurrence(b.bill.id, paydayDate)}
                    aria-label={`Remove ${b.bill.name}`}
                    className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {expenses.length === 0 ? <p className="text-[var(--faint)] text-center py-4">No expenses assigned.</p> : null}
              {expenses.map(e => (
                <div key={e.id} className="p-3 bg-[var(--surface)] rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{e.description}</p>
                    <p className="text-xs text-[var(--faint)]">${e.amount.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => { if (window.confirm(`Remove ${e.description}?`)) deleteExtraExpense(e.id); }}
                    aria-label={`Remove ${e.description}`}
                    className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'onetime' && (
            <div className="space-y-3">
              {oneTime.length === 0 ? <p className="text-[var(--faint)] text-center py-4">No one-time items assigned.</p> : null}
              {oneTime.map(e => (
                <div key={e.id} className="p-3 bg-[var(--surface)] rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{e.description}</p>
                    <p className="text-xs text-[var(--faint)]">${e.amount.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => { if (window.confirm(`Remove ${e.description}?`)) deleteExtraExpense(e.id); }}
                    aria-label={`Remove ${e.description}`}
                    className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
