import React, { useState, useEffect } from 'react';
import { X, Receipt, Save, Users, CreditCard, Smile } from 'lucide-react';
import { Bill, BillCategory, BillType, SplitType } from '../types';
import { usePayday } from '../context/PaydayContext';
import { suggestEmoji, getCategoryEmoji } from '../utils/emojis';
import { formatCurrency } from '../utils/dateUtils';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: Bill | null;
}

const CATEGORIES: BillCategory[] = [
  'Housing',
  'Utilities',
  'Car',
  'Insurance',
  'Phone & Internet',
  'Subscriptions',
  'Food & Household',
  'Debt & Credit',
  'Savings',
  'Other',
];

const QUICK_EMOJIS = ['🏠', '⚡', '🛡️', '📱', '🎬', '🍔', '⛽', '🛒', '🐾', '🎮', '💳', '🏦', '💸', '☕'];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  billToEdit,
}) => {
  const { addBill, updateBill } = usePayday();

  const [name, setName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [dueDate, setDueDate] = useState('1');
  const [type, setType] = useState<BillType>('fixed');
  const [category, setCategory] = useState<BillCategory>('Housing');
  const [notes, setNotes] = useState('');

  // Standard or My Share Amount
  const [amount, setAmount] = useState('');

  // Split Bill State
  const [isSplit, setIsSplit] = useState(false);
  const [fullTotal, setFullTotal] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('even');
  const [splitCount, setSplitCount] = useState('2');
  const [mySharePercentage, setMySharePercentage] = useState('50');
  const [customMyShare, setCustomMyShare] = useState('');

  // Debt State
  const [isDebt, setIsDebt] = useState(false);
  const [totalBalance, setTotalBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setCustomEmoji(billToEdit.emoji || suggestEmoji(billToEdit.name) || getCategoryEmoji(billToEdit.category));
      setDueDate(String(billToEdit.dueDate));
      setType(billToEdit.type);
      setCategory(billToEdit.category);
      setNotes(billToEdit.notes || '');

      setIsDebt(!!billToEdit.isDebt || billToEdit.category === 'Debt & Credit');
      setTotalBalance(billToEdit.totalBalance !== undefined ? String(billToEdit.totalBalance) : '');
      setInterestRate(billToEdit.interestRate !== undefined ? String(billToEdit.interestRate) : '');

      const splitActive = !!billToEdit.isSplit;
      setIsSplit(splitActive);

      if (splitActive) {
        setFullTotal(String(billToEdit.fullTotal || billToEdit.amount));
        setSplitType('even');
        setSplitCount(String(billToEdit.splitWays || billToEdit.splitCount || 2));
        setMySharePercentage('50');
        setCustomMyShare('');
        setAmount(String(billToEdit.amount));
      } else {
        setAmount(String(billToEdit.amount));
        setFullTotal(String(billToEdit.amount));
        setSplitType('even');
        setSplitCount('2');
        setMySharePercentage('50');
        setCustomMyShare('');
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
      setSplitType('even');
      setSplitCount('2');
      setMySharePercentage('50');
      setCustomMyShare('');
    }
  }, [billToEdit, isOpen]);

  if (!isOpen) return null;

  // Derive calculated My Share
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#121212] rounded-3xl shadow-2xl border border-[#2A2A2A] overflow-hidden max-h-[90vh] flex flex-col edit-bill-modal">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A] bg-[#121212] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center font-bold">
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
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 modal-content scrollbar-hide w-full max-w-full overflow-x-hidden box-border">
          
          {/* Bill Name & Custom Emoji */}
          <div className="space-y-2 w-full max-w-full overflow-hidden box-border">
            <label className="block text-xs font-semibold text-white/80">
              Bill Name & Emoji <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3 w-full max-w-full overflow-hidden box-border">
              <input
                type="text"
                value={customEmoji}
                onChange={e => setCustomEmoji(e.target.value)}
                placeholder="🏠"
                className="w-[56px] h-[56px] min-w-[56px] shrink-0 rounded-2xl bg-[#1a1a1a] border border-zinc-800 text-center text-[28px] focus:outline-none focus:border-[#7C3AED] text-white box-border"
                maxLength={2}
                title="Custom Emoji"
              />
              <div className="flex-1 min-w-0 w-full">
                <input
                  type="text"
                  required
                  placeholder="Movie"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full max-w-full min-w-0 h-[56px] rounded-2xl bg-[#1a1a1a] border border-zinc-800 px-4 text-white text-[16px] focus:outline-none focus:border-[#7C3AED] box-border"
                />
              </div>
            </div>
            
            {/* Quick Emoji Pickers */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2 pt-1">
              <span className="text-[10px] text-white/40 shrink-0 font-semibold flex items-center gap-1">
                <Smile className="w-3 h-3 text-[#A78BFA]" /> Pick:
              </span>
              {QUICK_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setCustomEmoji(e)}
                  className={`p-1 rounded-lg text-sm hover:bg-[#2A2A2A] transition-all cursor-pointer ${
                    customEmoji === e ? 'bg-[#7C3AED]/40 ring-1 ring-[#7C3AED]' : 'bg-[#1E1E1E]'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Category Row */}
          <div className="grid grid-cols-2 gap-4 w-full min-w-0">
            
            {/* Due Date */}
            <div className="min-w-0">
              <label className="block text-[13px] font-medium text-white/80 whitespace-nowrap">
                Due Date <span className="text-rose-400">*</span>
              </label>
              <p className="text-[11px] text-zinc-500">Day of month</p>
              <input
                type="number"
                min="1"
                max="31"
                required
                placeholder="1 - 31"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 h-[48px] rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Category */}
            <div className="min-w-0">
              <label className="block text-[13px] font-medium text-white/80">
                Category
              </label>
              <p className="text-[11px] text-transparent select-none">&nbsp;</p>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as BillCategory)}
                className="w-full mt-1.5 px-3.5 py-2.5 h-[48px] rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-[#121212] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Bill Type: Fixed vs Variable */}
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
                    ? 'border-[#7C3AED] bg-[#1E1B2E] text-white'
                    : 'border-[#2A2A2A] bg-[#1E1E1E] text-white/60 hover:border-violet-500/30'
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
                    ? 'border-[#7C3AED] bg-[#1E1B2E] text-white'
                    : 'border-[#2A2A2A] bg-[#1E1E1E] text-white/60 hover:border-violet-500/30'
                }`}
              >
                <span className="text-xs font-bold">Variable</span>
                <span className="text-[11px] text-white/50">Allows quick amount edit per paycheck</span>
              </button>
            </div>
          </div>

          {/* --- SPLIT BILL OPTION TOGGLE --- */}
          <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#A78BFA]" />
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
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]" />
              </label>
            </div>

            {/* Standard Amount Field when NOT split */}
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
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
            ) : (
              /* Expanded Split Options Section */
              <div className="space-y-4 pt-2 border-t border-[#2A2A2A] animate-in fade-in duration-150">
                
                {/* Split ways selection dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Split Ways
                  </label>
                  <select
                    value={splitCount}
                    onChange={e => setSplitCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="2">2 ways</option>
                    <option value="3">3 ways</option>
                    <option value="4">4 ways</option>
                    <option value="5">5 ways</option>
                  </select>
                </div>

                {/* Full Bill Total */}
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
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* Live Auto-Calculated My Share Readout */}
                <div className="p-3.5 rounded-xl bg-[#1E1B2E] border border-[#3B236E] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#A78BFA]">
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

          {/* --- DEBT & LOAN OPTIONS --- */}
          <div className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C084FC]" />
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
                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]" />
              </label>
            </div>

            {(isDebt || category === 'Debt & Credit') && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2A2A2A] animate-in fade-in duration-150">
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
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
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
                      className="w-full pr-7 pl-3 py-2 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                    />
                    <span className="absolute right-3 top-2 text-white/40 text-sm font-semibold">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Account #, Auto-debit on 15th"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-[#1E1E1E] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-lg shadow-violet-900/30 transition-all"
            >
              <Save className="w-4 h-4" />
              {billToEdit ? 'Save Changes' : 'Create Bill'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
