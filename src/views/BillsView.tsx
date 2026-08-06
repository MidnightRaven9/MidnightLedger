import React, { useState } from 'react';
import { 
  Plus, 
  Receipt, 
  Search, 
  Calendar, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { Bill } from '../types';
import { formatCurrency, getOrdinalSuffix } from '../utils/dateUtils';
import { DeleteBillModal } from '../components/DeleteBillModal';
import { BillCard } from '../components/BillCard';

interface BillsViewProps {
  onOpenBillModal: (billToEdit?: Bill | null) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({ onOpenBillModal }) => {
  const { bills, viewMode, setViewMode } = usePayday();

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
    <div className="space-y-4 pb-32">
      
      {/* 1. Bill Management Hub Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-lg space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E1B2E] border border-[#3B236E] text-[#A78BFA] flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bill Management Hub</h2>
              <p className="text-[11px] text-white/50 mt-0.5 leading-tight">
                Manage your monthly fixed & variable bills. Automatically mapped to upcoming paychecks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A] flex-wrap gap-3">
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold block">
              {viewMode === 'myShare' ? 'Total Base Monthly (My Share)' : 'Total Base Monthly (Full Totals)'}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-2xl font-black transition-colors ${viewMode === 'myShare' ? 'text-white' : 'text-[#F59E0B]'}`}>
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-lg shadow-violet-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Bill
          </button>
        </div>
      </div>

      {/* 2. Monthly Category Allocation Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#A78BFA]" />
            Monthly Category Allocation
          </h3>
          <span className="text-[11px] text-white/50 font-semibold">{bills.length} Total Bills</span>
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

        {/* Legend (2 columns, tight 6px gap) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
          {Object.entries(categoryTotals).map(([cat, amt]) => {
            const colorClass = categoryColors[cat] || 'bg-violet-500';
            return (
              <div key={cat} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorClass} shrink-0`} />
                  <span className="text-white/70 truncate">{cat}:</span>
                </div>
                <span className="font-bold text-white ml-2">{formatCurrency(amt)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Dropdown Filters Card */}
      <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#2A2A2A] shadow-lg space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-white text-xs focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Toggle pill segmented control */}
          <div className="bg-[#1E1E1E] h-9 rounded-full p-1 flex items-center shrink-0 w-fit self-center md:self-auto border border-[#2A2A2A]/40">
            <button
              onClick={() => setViewMode('myShare')}
              className={`px-3 py-1 text-[13px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'myShare'
                  ? 'bg-[#7C3AED] text-white shadow-md'
                  : 'bg-transparent text-[#888] hover:text-white/80'
              }`}
            >
              My Share ({formatCurrency(sumMyShare)})
            </button>
            <button
              onClick={() => setViewMode('fullTotal')}
              className={`px-3 py-1 text-[13px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'fullTotal'
                  ? 'bg-[#7C3AED] text-white shadow-md'
                  : 'bg-transparent text-[#888] hover:text-white/80'
              }`}
            >
              Full Totals ({formatCurrency(sumFullTotal)})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="ALL">All Types</option>
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
          {filteredBills.map(bill => (
            <BillCard
              key={bill.id}
              bill={bill}
              viewMode={viewMode}
              onEdit={() => onOpenBillModal(bill)}
              onDelete={() => setDeletingBill(bill)}
            />
          ))}
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
