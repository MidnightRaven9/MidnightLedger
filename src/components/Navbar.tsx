import React, { useState } from 'react';
import { 
  Wallet, 
  LayoutDashboard, 
  Receipt, 
  CalendarDays, 
  ShoppingBag, 
  History, 
  RotateCcw,
  Download,
  Upload,
  BarChart3
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { ClearDataModal } from './ClearDataModal';

export type TabType = 'dashboard' | 'bills' | 'paydays' | 'expenses' | 'reports' | 'history';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenBillModal: () => void;
  onOpenExpenseModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenBillModal,
  onOpenExpenseModal,
}) => {
  const { exportData, importData } = usePayday();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `midnight_ledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) {
          alert('Data imported successfully!');
        } else {
          alert('Failed to import data. Please check the JSON format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2A2A2A] bg-[#000000]/95 backdrop-blur-xl transition-colors">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[56px]">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6D28D9] via-[#7C3AED] to-[#C084FC] flex items-center justify-center text-white shadow-md shadow-violet-900/30">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                MidnightLedger
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1E1B2E] text-[#A78BFA] border border-[#3B236E]">
                  Bill Optimizer
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121212] p-1 rounded-xl border border-[#2A2A2A]">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dash
            </button>

            <button
              id="tab-bills"
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'bills'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Bills
            </button>

            <button
              id="tab-paydays"
              onClick={() => setActiveTab('paydays')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'paydays'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Paydays
            </button>

            <button
              id="tab-expenses"
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Expenses
            </button>

            <button
              id="tab-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Reports
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </nav>

          {/* Quick Actions & Dark Mode Toggle Switch */}
          <div className="flex items-center gap-2">
            
            {/* Export & Import */}
            <div className="hidden lg:flex items-center gap-1 border-l border-[#2A2A2A] pl-2">
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-[#1E1E1E] text-xs font-medium transition-colors"
                title="Export Budget Backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <label
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-[#1E1E1E] text-xs font-medium cursor-pointer transition-colors"
                title="Import Budget Backup"
              >
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={() => setIsClearModalOpen(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Clear Example Data / Start Fresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <ClearDataModal
              isOpen={isClearModalOpen}
              onClose={() => setIsClearModalOpen(false)}
              onConfirmSuccess={() => setActiveTab('bills')}
            />

          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0A0A0A]/95 border-t border-zinc-800/80 backdrop-blur-xl px-1 py-1 flex justify-between items-center h-[56px]">
        <div className="grid grid-cols-6 text-center w-full gap-0.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">Dash</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'bills' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <Receipt className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('paydays')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'paydays' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">Paydays</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'expenses' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'reports' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'history' 
                ? 'bg-[#1a1033] text-[#C084FC] font-bold' 
                : 'text-white/60 hover:text-white opacity-70 hover:opacity-100'
            }`}
          >
            <History className="w-4 h-4 text-purple-400" />
            <span className="tracking-wide">History</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
