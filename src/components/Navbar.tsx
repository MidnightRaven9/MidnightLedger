import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  CalendarDays, 
  ShoppingBag, 
  History,
  RotateCcw,
  Download,
  Upload,
  BarChart3,
  Moon
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { ClearDataModal } from './ClearDataModal';

export type TabType = 'dashboard' | 'bills' | 'paydays' | 'expenses' | 'reports' | 'history' | 'settings';

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
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[rgba(16,16,18,0.92)] backdrop-blur-md transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[54px]">
          
          {/* Wordmark */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-7 h-7 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface-2)] flex items-center justify-center">
              <Moon className="w-4 h-4 text-[var(--accent)]" strokeWidth={2.2} fill="currentColor" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              MidnightLedger
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[var(--surface)] p-1 rounded-[10px] border border-[var(--border)]">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dash
            </button>

            <button
              id="tab-bills"
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'bills'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Bills
            </button>

            <button
              id="tab-paydays"
              onClick={() => setActiveTab('paydays')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'paydays'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Paydays
            </button>

            <button
              id="tab-expenses"
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Expenses
            </button>

            <button
              id="tab-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Reports
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </nav>

          {/* Quick Actions & Dark Mode Toggle Switch */}
          <div className="flex items-center gap-2">
            
            {/* Export & Import */}
            <div className="hidden lg:flex items-center gap-1 border-l border-[var(--border)] pl-2">
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium transition-colors"
                title="Export Budget Backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <label
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium cursor-pointer transition-colors"
                title="Import Budget Backup"
              >
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={() => setIsClearModalOpen(true)}
                className="btn-quiet h-8 w-8 !p-0 text-[var(--faint)] hover:text-[var(--danger)] hover:bg-transparent"
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
      </header>

      {/* Mobile Bottom Navigation Bar - sibling of header (fixed positioning must not live inside a backdrop-filter container) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-[var(--bg)]/95 border-t border-zinc-800/80 backdrop-blur-xl px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)] flex justify-between items-center min-h-[56px]">
        <div className="grid grid-cols-6 text-center w-full gap-0.5">
          <button
            id="mobile-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="tracking-wide">Dash</span>
          </button>

          <button
            id="mobile-tab-bills"
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'bills' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span className="tracking-wide">Bills</span>
          </button>

          <button
            id="mobile-tab-paydays"
            onClick={() => setActiveTab('paydays')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'paydays' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="tracking-wide">Paydays</span>
          </button>

          <button
            id="mobile-tab-expenses"
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'expenses' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tracking-wide">Expenses</span>
          </button>

          <button
            id="mobile-tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'reports' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="tracking-wide">Reports</span>
          </button>

          <button
            id="mobile-tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'history' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="tracking-wide">History</span>
          </button>
        </div>
      </nav>
    </>
  );
};
