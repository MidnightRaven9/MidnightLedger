import React, { useState, useEffect } from 'react';
import { X, Receipt, Save, Users, CreditCard } from 'lucide-react';
import { Bill, BillCategory, BillType } from '../types';
import { usePayday } from '../context/PaydayContext';
import { suggestEmoji, getCategoryEmoji } from '../utils/emojis';
import { formatCurrency } from '../utils/dateUtils';
import { CustomCategoryModal } from './CustomCategoryModal';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { useEscapeToClose } from '../utils/useEscapeToClose';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: Bill | null;
}

const defaultBillCategories = [
  { name: 'Housing', emoji: '🏠' },
  { name: 'Phone & Internet', emoji: '📱' },
  { name: 'Bills', emoji: '🧾' },
  { name: 'Utilities', emoji: '⚡' },
  { name: 'Car', emoji: '⛽' },
  { name: 'Insurance', emoji: '🛡️' },
  { name: 'Subscriptions', emoji: '🎬' },
  { name: 'Food & Household', emoji: '🍔' },
  { name: 'Debt & Credit', emoji: '💳' },
  { name: 'Savings', emoji: '🏦' },
  { name: 'Other', emoji: '📦' },
];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  billToEdit,
}) => {
  useEscapeToClose(isOpen, onClose);

  const { addBill, updateBill, customBillCategories, addCustomBillCategory } = usePayday();

  const [name, setName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [dueDate, setDueDate] = useState('1');
  const [type, setType] = useState<BillType>('fixed');
  const [category, setCategory] = useState<BillCategory>('Housing');
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const [amount, setAmount] = useState('');

  const [isSplit, setIsSplit] = useState(false);
  const [fullTotal, setFullTotal] = useState('');
  const [splitCount, setSplitCount] = useState('2');

  const [isDebt, setIsDebt] = useState(false);
  const [totalBalance, setTotalBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setCustomEmoji(billToEdit.emoji || suggestEmoji(billToEdit.name) || getCategoryEmoji(billToEdit.category));
      setDueDate(String(billToEdit.dueDate));
      setType(String(billToEdit.type).toLowerCase() as BillType);
      setCategory(billToEdit.category);
      setNotes(billToEdit.notes || '');

      setIsDebt(!!billToEdit.isDebt || billToEdit.category === 'Debt & Credit');
      setTotalBalance(billToEdit.totalBalance !== undefined ? String(billToEdit.totalBalance) : '');
      setInterestRate(billToEdit.interestRate !== undefined ? String(billToEdit.interestRate) : '');

      const splitActive = !!billToEdit.isSplit;
      setIsSplit(splitActive);

      if (splitActive) {
        setFullTotal(String(billToEdit.fullTotal || billToEdit.amount));
        setSplitCount(String(billToEdit.splitWays || billToEdit.splitCount || 2));
        setAmount(String(billToEdit.amount));
      } else {
        setAmount(String(billToEdit.amount));
        setFullTotal(String(billToEdit.amount));
        setSplitCount('2');
      }
    } else {
      setName('');
      setCustomEmoji('');
      setDueDate('1');
      setType('fixed');
      setCategory('Housing');
      setNotes('');

      setIsDebt(false);
      setTotalBalance('');
      setInterestRate('');

      setIsSplit(false);
      setAmount('');
      setFullTotal('');
      setSplitCount('2');
    }
  }, [billToEdit, isOpen]);

  if (!isOpen) return null;

  const fullTotalNum = parseFloat(fullTotal) || 0;
  const splitCountNum = parseInt(splitCount, 10) || 2;

  const calculatedMyShare = isSplit
    ? Math.round((fullTotalNum / splitCountNum) * 100) / 100
    : parseFloat(amount) || 0;

  const handleNameChange = (val: string) => {
    setName(val);
    const suggested = suggestEmoji(val);
    if (suggested) {
      setCustomEmoji(suggested);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numDueDate = parseInt(dueDate, 10);

    if (!name.trim() || isNaN(numDueDate)) {
      alert('Please fill out a valid name and due date.');
      return;
    }

    let finalMyShare = 0;
    let finalFullTotal = 0;
    let finalSplitWays = 1;

    if (isSplit) {
      if (isNaN(fullTotalNum) || fullTotalNum <= 0) {
        alert('Please enter a valid Full Bill Total amount.');
        return;
      }
      finalFullTotal = fullTotalNum;
      finalSplitWays = splitCountNum;
      finalMyShare = calculatedMyShare;
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        alert('Please enter a valid bill amount.');
        return;
      }
      finalMyShare = numAmount;
      finalFullTotal = numAmount;
      finalSplitWays = 1;
    }

    const isDebtActive = isDebt || category === 'Debt & Credit';
    const parsedTotalBalance = totalBalance ? parseFloat(totalBalance) : undefined;
    const parsedInterestRate = interestRate ? parseFloat(interestRate) : undefined;
    const finalEmoji = customEmoji.trim() || suggestEmoji(name) || getCategoryEmoji(category);

    if (billToEdit) {
      updateBill({
        ...billToEdit,
        name: name.trim(),
        emoji: finalEmoji,
        amount: finalMyShare,
        dueDate: Math.min(31, Math.max(1, numDueDate)),
        type,
        category,
        notes: notes.trim(),
        isSplit,
        fullTotal: finalFullTotal,
        splitType: 'even',
        splitCount: finalSplitWays,
        myShare: finalMyShare,
        splitWays: finalSplitWays,
        isDebt: isDebtActive,
        totalBalance: isDebtActive ? parsedTotalBalance : undefined,
        interestRate: isDebtActive ? parsedInterestRate : undefined,
      });
    } else {
      addBill({
        name: name.trim(),
        emoji: finalEmoji,
        amount: finalMyShare,
        dueDate: Math.min(31, Math.max(1, numDueDate)),
        type,
        category,
        notes: notes.trim(),
        isActive: true,
        isSplit,
        fullTotal: finalFullTotal,
        splitType: 'even',
        splitCount: finalSplitWays,
        myShare: finalMyShare,
        splitWays: finalSplitWays,
        isDebt: isDebtActive,
        totalBalance: isDebtActive ? parsedTotalBalance : undefined,
        interestRate: isDebtActive ? parsedInterestRate : undefined,
      });
    }

    onClose();
  };

  const allBillCategories = Array.from(
    new Map(
      [...defaultBillCategories, ...(customBillCategories || []).map(c => ({ name: c.name, emoji: c.emoji }))]
        .map(item => [item.name, item])
    ).values()
  );

  return (
    <div className="fixed inset-0 z-[9999] edit-modal-overlay flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden max-h-[90vh] flex flex-col edit-bill-modal edit-modal-content z-[10000] relative">
        
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-[var(--accent)] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {billToEdit ? 'Edit Bill' : 'Add New Bill'}
              </h3>
              <p className="text-xs text-white/60">
                Update bill details & due date
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 modal-content scrollbar-hide w-full max-w-full overflow-x-hidden box-border">
          
          <div className="w-full min-w-0 max-w-full space-y-2 box-border">
            <label className="block text-[12px] font-bold text-white/80">
              Bill Name & Emoji <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2 w-full min-w-0 mt-2">
              {/* Selected emoji box - FIXED SIZE */}
              <input
                type="text"
                value={customEmoji || suggestEmoji(name) || getCategoryEmoji(category)}
                onChange={e => setCustomEmoji(e.target.value)}
                maxLength={2}
                title="Bill Emoji"
                className="w-[56px] h-[56px] min-w-[56px] shrink-0 rounded-2xl bg-[#1f1f1f] border border-zinc-700 text-center text-[28px] leading-none text-white focus:outline-none focus:border-[var(--accent)] overflow-hidden box-border"
                style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
              />
              <input
                type="text"
                required
                placeholder="Movie"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                className="flex-1 min-w-0 h-[56px] rounded-2xl bg-[#1f1f1f] border border-zinc-700 px-4 text-[16px] text-white truncate focus:outline-none focus:border-[var(--accent)] box-border"
              />
            </div>

          </div>

          <div className="w-full min-w-0 max-w-full overflow-hidden border-y border-zinc-800/50 py-2.5 px-4 flex items-center gap-2 bg-[var(--surface-2)] -mx-5 px-5" style={{ width: 'calc(100% + 40px)' }}>
            <span className="shrink-0 text-[11px] font-bold tracking-widest text-zinc-500">CATEGORIES:</span>
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide categories-slider" style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-2 w-max pr-4 pointer-events-auto">
                {allBillCategories.map((cat, idx) => (
                  <button
                    key={cat.name + '-' + idx}
                    type="button"
                    onClick={() => {
                      setCategory(cat.name as BillCategory);
                      setCustomEmoji(cat.emoji);
                    }}
                    className={`cat-pill shrink-0 h-8 px-3.5 rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                      category === cat.name 
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] selected' 
                        : 'bg-[var(--border)] border-zinc-800 text-[13px] text-white hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryModalOpen(true)}
                  className="shrink-0 h-8 px-3 rounded-full border border-dashed border-[var(--accent)]/50 bg-transparent text-[var(--accent)] text-[13px] hover:bg-[var(--accent)]/10 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 font-semibold"
                >
                  Custom...
                </button>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0">
            <label className="block text-[13px] font-medium text-white/80 whitespace-nowrap">
              Due Date <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-zinc-500">Day of month (1-31)</p>
            <input
              type="number"
              min="1"
              max="31"
              required
              placeholder="1"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 h-[48px] rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            />

          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Bill Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('fixed')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  type === 'fixed'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="text-xs font-bold">Fixed</span>
                <span className="text-[11px] text-white/50">Repeats exact same amount monthly</span>
              </button>

              <button
                type="button"
                onClick={() => setType('variable')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  type === 'variable'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-white/60 hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="text-xs font-bold">Variable</span>
                <span className="text-[11px] text-white/50">Allows quick amount edit per paycheck</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold text-white">
                  Split this bill?
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSplit}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsSplit(checked);
                    if (checked && !fullTotal) {
                      setFullTotal(amount || '191.00');
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
              </label>
            </div>

            {!isSplit ? (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Monthly Bill Amount ($) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-white/40 font-medium text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required={!isSplit}
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            ) : (
              /* Expanded Split Options Section */
              <div className="space-y-4 pt-2 border-t border-[var(--border)] animate-in fade-in duration-150">
                
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Split Ways
                  </label>
                  <select
                    value={splitCount}
                    onChange={e => setSplitCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="2">2 ways</option>
                    <option value="3">3 ways</option>
                    <option value="4">4 ways</option>
                    <option value="5">5 ways</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Full Bill Total ($) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-white/40 font-medium text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required={isSplit}
                      placeholder="e.g. 191.00"
                      value={fullTotal}
                      onChange={e => setFullTotal(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-strong)] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--accent)]">
                    <span>Full Bill Total: {formatCurrency(fullTotalNum)}</span>
                    <span className="text-sm text-emerald-400 font-extrabold">
                      My Share: {formatCurrency(calculatedMyShare)} (calculated)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    You pay {formatCurrency(calculatedMyShare)} of {formatCurrency(fullTotalNum)} total.
                  </p>
                </div>

              </div>
            )}

          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--accent)]" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Mark as Debt / Loan?
                  </span>
                  <span className="text-[10px] text-white/50">
                    Enables Debt Snowball & Avalanche payoff advisor strategy
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDebt || category === 'Debt & Credit'}
                  onChange={e => setIsDebt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
              </label>
            </div>

            {(isDebt || category === 'Debt & Credit') && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Total Balance Owed ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1500.00"
                      value={totalBalance}
                      onChange={e => setTotalBalance(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Interest Rate (APR %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 19.9"
                      value={interestRate}
                      onChange={e => setInterestRate(e.target.value)}
                      className="w-full pr-7 pl-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                    <span className="absolute right-3 top-2 text-white/40 text-sm font-semibold">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Account #, Auto-debit on 15th"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-press)] text-white font-semibold text-xs shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              {billToEdit ? 'Save Changes' : 'Create Bill'}
            </button>
          </div>

        </form>

      </div>

      {isCustomCategoryModalOpen && (
        <CustomCategoryModal
          isOpen={isCustomCategoryModalOpen}
          onClose={() => setIsCustomCategoryModalOpen(false)}
          onSave={(name, emoji) => {
            addCustomBillCategory({ name, emoji });
            setCategory(name as BillCategory);
          }}
        />
      )}

      {isManageCategoriesModalOpen && (
        <ManageCategoriesModal
          type="bill"
          isOpen={isManageCategoriesModalOpen}
          onClose={() => setIsManageCategoriesModalOpen(false)}
        />
      )}
    </div>
  );
};
