import React, { useState } from 'react';
import { 
  Plus, 
  Receipt, 
  Search, 
  PieChart
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { Bill } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { getCategoryEmoji } from '../utils/emojis';
import { DeleteBillModal } from '../components/DeleteBillModal';
import { BillCard } from '../components/BillCard';

interface BillsViewProps {
  onOpenBillModal: (billToEdit?: Bill | null) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({ onOpenBillModal }) => {
  const { bills, viewMode, setViewMode, summaries, nextPaydaySummary, toggleBillPaid } = usePayday();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bill.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || bill.category === selectedCategory;
    const matchesType = selectedType === 'ALL' || bill.type === selectedType;
    return matchesSearch && matchesCat && matchesType;
  });

  const sumMyShare = bills.reduce((sum, b) => sum + b.amount, 0);
  const sumFullTotal = bills.reduce((sum, b) => sum + (b.isSplit ? (b.fullTotal || b.amount) : b.amount), 0);

  const totalBaseMonthly = viewMode === 'myShare' ? sumMyShare : sumFullTotal;

  // Category breakdown for the category bar
  const categoryTotals: Record<string, number> = {};
  bills.forEach(b => {
    const amt = viewMode === 'myShare' ? b.amount : (b.isSplit ? (b.fullTotal || b.amount) : b.amount);
    categoryTotals[b.category] = (categoryTotals[b.category] || 0) + amt;
  });

  const categoryColors: Record<string, string> = {
    'Housing': 'bg-emerald-500',
    'Utilities': 'bg-amber-400',
    'Insurance': 'bg-blue-400',
    'Phone & Internet': 'bg-purple-400',
    'Subscriptions': 'bg-rose-400',
    'Food & Household': 'bg-cyan-400',
    'Debt & Credit': 'bg-orange-400',
    'Savings': 'bg-teal-400',
    'General': 'bg-violet-400',
  };

  const categories = Array.from(new Set(bills.map(b => b.category)));

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#0A0A0A] text-white p-3 sm:p-6 pb-28 space-y-5">
      
      {/* 1. Bill Management Hub Hero Card */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800/50 bg-[#121212] p-6 sm:p-7 space-y-5">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <Receipt className="w-7 h-7 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-[28px] sm:text-[30px] font-black leading-tight tracking-tight text-white">
              Bill<br/>Management Hub
            </h1>
            <p className="text-[14px] leading-snug text-zinc-400 mt-2 max-w-[280px]">
              Manage fixed & variable bills. Mapped to paychecks.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/50">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold block">
            {viewMode === 'myShare' ? 'Total Base Monthly (My Share)' : 'Total Base Monthly (Full Totals)'}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap mt-1">
            <span className="text-3xl font-black text-white">
              {formatCurrency(totalBaseMonthly)}
            </span>
            {viewMode === 'fullTotal' && (
              <span className="text-[11px] text-[#A78BFA] font-semibold">
                • Calculations always use your share
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenBillModal(null)}
          className="w-full h-[56px] flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[16px] mt-2 shadow-[0_8px_20px_rgba(124,58,237,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add New Bill
        </button>
      </div>

      {/* 2. Monthly Category Allocation Card */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#A78BFA]" />
            Monthly Category Allocation
          </h3>
          <span className="text-xs text-white/50 font-semibold">{bills.length} Total Bills</span>
        </div>

        {/* Multi-color Allocation Bar (12px tall) */}
        {totalBaseMonthly > 0 && (
          <div className="w-full h-3 rounded-full bg-[#1A1A1A] overflow-hidden flex border border-[#2A2A2A]">
            {Object.entries(categoryTotals).map(([cat, amt]) => {
              const pct = (amt / totalBaseMonthly) * 100;
              const colorClass = categoryColors[cat] || 'bg-violet-500';
              return (
                <div 
                  key={cat}
                  style={{ width: `${pct}%` }}
                  className={`${colorClass} h-full transition-all`}
                  title={`${cat}: ${formatCurrency(amt)} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
        )}

        {/* Legend (grid-cols-1 sm:grid-cols-2 gap-3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {Object.entries(categoryTotals).map(([cat, amt]) => {
            const colorClass = categoryColors[cat] || 'bg-violet-500';
            const emoji = getCategoryEmoji(cat);
            return (
              <div 
                key={cat} 
                title={cat}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${colorClass}`} />
                  <span className="text-sm text-zinc-300 whitespace-normal break-words">{emoji} {cat}:</span>
                </div>
                <span className="font-bold text-white ml-2 shrink-0">{formatCurrency(amt)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Dropdown Filters Card */}
      <div className="rounded-[24px] border border-zinc-800/50 bg-[#121212] p-4 sm:p-6 space-y-3.5 w-full min-w-0 max-w-full overflow-hidden box-border">
        {/* Search */}
        <div className="relative w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-2xl bg-[#1a1a1a] border border-zinc-800 pl-10 pr-4 text-[14px] text-white placeholder-zinc-500 focus:outline-none focus:border-purple-600 box-border"
          />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          <button
            onClick={() => setViewMode('myShare')}
            className={`h-10 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 truncate transition-all cursor-pointer box-border px-2 ${
              viewMode === 'myShare'
                ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-600/20'
                : 'bg-[#1f1f1f] border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            👋 My Share
          </button>
          <button
            onClick={() => setViewMode('fullTotal')}
            className={`h-10 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 truncate transition-all cursor-pointer box-border px-2 ${
              viewMode === 'fullTotal'
                ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-600/20'
                : 'bg-[#1f1f1f] border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            👥 Full Totals
          </button>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full min-w-0 h-10 rounded-full bg-[#1f1f1f] border border-zinc-800 px-3 text-[13px] text-white focus:outline-none focus:border-purple-600 truncate cursor-pointer box-border"
          >
            <option value="ALL">🏷️ All Categories</option>
            {(categories as string[]).map(c => (
              <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full min-w-0 h-10 rounded-full bg-[#1f1f1f] border border-zinc-800 px-3 text-[13px] text-white focus:outline-none focus:border-purple-600 truncate cursor-pointer box-border"
          >
            <option value="ALL">💳 All Types</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </div>
      </div>

      {/* 4. Bill Cards List */}
      {filteredBills.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#121212] border border-[#2A2A2A] text-white/50">
          <p className="text-sm">No bills found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map(bill => {
            const assignedSummary = summaries.find(s => s.assignedBills.some(ab => ab.bill.id === bill.id)) || nextPaydaySummary;
            const paydayDate = assignedSummary ? assignedSummary.payday.date : '';
            const assignedItem = assignedSummary?.assignedBills.find(ab => ab.bill.id === bill.id);
            const isPaid = assignedItem ? assignedItem.isPaid : false;

            return (
              <BillCard
                key={bill.id}
                bill={bill}
                viewMode={viewMode}
                isPaid={isPaid}
                onTogglePaid={() => toggleBillPaid(bill.id, paydayDate)}
                onEdit={() => onOpenBillModal(bill)}
                onDelete={() => setDeletingBill(bill)}
              />
            );
          })}
        </div>
      )}

      <DeleteBillModal
        isOpen={!!deletingBill}
        onClose={() => setDeletingBill(null)}
        bill={deletingBill}
      />

    </div>
  );
};
