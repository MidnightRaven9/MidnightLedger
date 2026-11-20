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
  Moon,
  Settings
} from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import type { ImportInspection } from '../utils/backup';
import { downloadBackup } from '../utils/downloadBackup';
import { ClearDataModal } from './ClearDataModal';
import { SettingsModal } from './SettingsModal';
import { ImportPreviewModal } from './ImportPreviewModal';
import { NotificationCenter } from './NotificationCenter';

export type TabType = 'dashboard' | 'bills' | 'paydays' | 'expenses' | 'reports' | 'history';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { exportData, inspectImport, applyImport } = usePayday();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [importInspection, setImportInspection] = useState<ImportInspection | null>(null);
  const [importFileName, setImportFileName] = useState('');

  const handleExport = () => {
    downloadBackup(exportData());
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportFileName(file.name);
        setImportInspection(inspectImport(content));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const closeImportPreview = () => {
    setImportInspection(null);
    setImportFileName('');
  };

  const confirmImport = () => {
    if (importInspection?.ok === true) {
      applyImport(importInspection.state);
    }
    closeImportPreview();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[rgba(16,16,18,0.92)] backdrop-blur-md transition-colors">
        <div className="w-full px-[clamp(10px,3.2vw,32px)]">
          <div className="flex items-center justify-between h-[54px]">
          
          <button
            type="button"
            aria-label="Go to dashboard"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface-2)] flex items-center justify-center">
              <Moon className="w-4 h-4 text-[var(--accent)]" strokeWidth={2.2} fill="currentColor" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              MidnightLedger
            </span>
          </button>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 bg-[var(--surface)] p-1 rounded-[10px] border border-[var(--border)]">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')} aria-current={activeTab === 'dashboard' ? 'page' : undefined}
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
              onClick={() => setActiveTab('bills')} aria-current={activeTab === 'bills' ? 'page' : undefined}
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
              onClick={() => setActiveTab('paydays')} aria-current={activeTab === 'paydays' ? 'page' : undefined}
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
              onClick={() => setActiveTab('expenses')} aria-current={activeTab === 'expenses' ? 'page' : undefined}
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
              onClick={() => setActiveTab('reports')} aria-current={activeTab === 'reports' ? 'page' : undefined}
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
              onClick={() => setActiveTab('history')} aria-current={activeTab === 'history' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </nav>

          <div className="flex items-center gap-2">

            {/* Bill reminders + Appearance settings — on every screen size */}
            <NotificationCenter
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onGoToBills={() => setActiveTab('bills')}
            />
            <button
              id="open-settings"
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn-quiet h-8 w-8 !p-0"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="hidden lg:flex items-center gap-1 border-l border-[var(--border)] pl-2">
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium transition-colors"
                title="Export Budget Backup (JSON)"
                aria-label="Export budget backup (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <label
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)]"
                title="Import Budget Backup"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">Import budget backup</span>
                <input type="file" accept=".json" aria-label="Import budget backup JSON file" onChange={handleImport} className="sr-only" />
              </label>

              <button
                onClick={() => setIsClearModalOpen(true)}
                className="btn-quiet h-8 w-8 !p-0 text-[var(--faint)] hover:text-[var(--danger)] hover:bg-transparent"
                title="Wipe all data (factory reset)"
                aria-label="Wipe all data (factory reset)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>
      </header>

      {/* Modals live outside the blurred header — backdrop-filter would otherwise
          trap their fixed positioning and render them off-screen. */}

            <ClearDataModal
              isOpen={isClearModalOpen}
              onClose={() => setIsClearModalOpen(false)}
              onConfirmSuccess={() => setActiveTab('bills')}
            />

            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
            />

            <ImportPreviewModal
              isOpen={importInspection !== null}
              fileName={importFileName}
              inspection={importInspection}
              onClose={closeImportPreview}
              onConfirm={confirmImport}
              onExportCurrent={() => downloadBackup(exportData())}
            />

      {/* Mobile Bottom Navigation Bar - sibling of header (fixed positioning must not live inside a backdrop-filter container) */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-[var(--bg)]/95 border-t border-zinc-800/80 backdrop-blur-xl px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)] flex justify-between items-center min-h-[56px]">
        <div className="grid grid-cols-6 text-center w-full gap-0.5">
          <button
            id="mobile-tab-dashboard"
            onClick={() => setActiveTab('dashboard')} aria-current={activeTab === 'dashboard' ? 'page' : undefined}
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
            onClick={() => setActiveTab('bills')} aria-current={activeTab === 'bills' ? 'page' : undefined}
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
            onClick={() => setActiveTab('paydays')} aria-current={activeTab === 'paydays' ? 'page' : undefined}
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
            onClick={() => setActiveTab('expenses')} aria-current={activeTab === 'expenses' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'expenses' 
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' 
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tracking-wide">Expense</span>
          </button>

          <button
            id="mobile-tab-reports"
            onClick={() => setActiveTab('reports')} aria-current={activeTab === 'reports' ? 'page' : undefined}
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
            onClick={() => setActiveTab('history')} aria-current={activeTab === 'history' ? 'page' : undefined}
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
