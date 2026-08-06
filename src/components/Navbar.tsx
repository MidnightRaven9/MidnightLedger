import React, { useState } from 'react';
import { 
  Wallet, 
  LayoutDashboard, 
  Receipt, 
  CalendarDays, 
  PlusCircle, 
  History, 
  Sun, 
  Moon, 
  RotateCcw,
  Sparkles,
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
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenBillModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenAIModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  toggleDarkMode,
  onOpenBillModal,
  onOpenExpenseModal,
  onOpenAIModal,
}) => {
  const { exportData, importData } = usePayday();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payday_planner_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
    <header className="sticky top-0 z-40 w-full border-b border-[#2A2A2A] bg-[#000000]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] via-[#7C3AED] to-[#C084FC] flex items-center justify-center text-white shadow-lg shadow-violet-900/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MidnightLedger
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#1E1B2E] text-[#A78BFA] border border-[#3B236E]">
                  Bill Optimizer
                </span>
              </span>
              <p className="text-xs text-white/60 hidden sm:block">
                Paycheck-to-paycheck budget & AI advisor
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121212] p-1.5 rounded-2xl border border-[#2A2A2A]">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              id="tab-bills"
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'bills'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Bills
            </button>

            <button
              id="tab-paydays"
              onClick={() => setActiveTab('paydays')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'paydays'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Paydays
            </button>

            <button
              id="tab-expenses"
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Extra Expenses
            </button>

            <button
              id="tab-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#A78BFA]" />
              Reports
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-violet-900/30'
                  : 'text-white/60 hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </nav>

          {/* Quick Actions & Dark Mode Toggle Switch */}
          <div className="flex items-center gap-3">
            
            {/* AI Advisor Button */}
            <button
              id="btn-ai-advisor"
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#C084FC] text-white shadow-md shadow-violet-900/30 hover:brightness-110 transition-all"
              title="Get Smart Budget Advice with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#DDD6FE]" />
              <span className="hidden sm:inline">Raven Advisor</span>
            </button>

            {/* Dark Mode Theme Badge */}
            <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl border border-[#2A2A2A] bg-[#121212] text-white/80 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse"></span>
              <span className="text-[11px] font-semibold text-[#A78BFA]">OLED Theme</span>
            </div>

            {/* Export & Import */}
            <div className="hidden lg:flex items-center gap-1 border-l border-[#2A2A2A] pl-2">
              <button
                onClick={handleExport}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-[#1E1E1E] text-xs font-medium transition-colors"
                title="Export Budget Backup (JSON)"
              >
                <Download className="w-4 h-4" />
              </button>

              <label
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-[#1E1E1E] text-xs font-medium cursor-pointer transition-colors"
                title="Import Budget Backup"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={() => setIsClearModalOpen(true)}
                className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Clear Example Data / Start Fresh"
              >
                <RotateCcw className="w-4 h-4" />
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/95 border-t border-[#2A2A2A] backdrop-blur-lg px-2 py-2">
        <div className="grid grid-cols-6 text-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'dashboard' ? 'text-[#A78BFA] font-bold' : 'text-white/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dash
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'bills' ? 'text-[#A78BFA] font-bold' : 'text-white/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Bills
          </button>

          <button
            onClick={() => setActiveTab('paydays')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'paydays' ? 'text-[#A78BFA] font-bold' : 'text-white/50'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Paydays
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'expenses' ? 'text-[#A78BFA] font-bold' : 'text-white/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Expenses
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'reports' ? 'text-[#C084FC] font-bold' : 'text-white/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
              activeTab === 'history' ? 'text-[#A78BFA] font-bold' : 'text-white/50'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>
    </header>
  );
};
