import React, { useState, useEffect } from 'react';
import { PaydayProvider } from './context/PaydayContext';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { BillsView } from './views/BillsView';
import { PaydaysView } from './views/PaydaysView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { HistoryView } from './views/HistoryView';

import { BillModal } from './components/BillModal';
import { ExpenseModal } from './components/ExpenseModal';
import { PaydayModal } from './components/PaydayModal';
import { ScheduleModal } from './components/ScheduleModal';
import { AddExtraIncomeModal } from './components/AddExtraIncomeModal';
import { AIAdvisorModal, RavenFAB } from './components/AIAdvisorModal';
import { Toast } from './components/Toast';
import { Bill } from './types';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Dark mode state - default to OLED Material Black theme
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('payday_theme') !== 'light';
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('payday_theme', 'dark');
  }, [isDarkMode]);

  // Modal states
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [defaultExpensePayday, setDefaultExpensePayday] = useState<string | undefined>(undefined);

  const [isExtraIncomeModalOpen, setIsExtraIncomeModalOpen] = useState(false);
  const [defaultIncomePayday, setDefaultIncomePayday] = useState<string | undefined>(undefined);

  const [isPaydayModalOpen, setIsPaydayModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Modal helpers
  const handleOpenBillModal = (bill?: Bill | null) => {
    setBillToEdit(bill || null);
    setIsBillModalOpen(true);
  };

  const handleOpenExpenseModal = (paydayDate?: string) => {
    setDefaultExpensePayday(paydayDate);
    setIsExpenseModalOpen(true);
  };

  const handleOpenIncomeModal = (paydayDate?: string) => {
    setDefaultIncomePayday(paydayDate);
    setIsExtraIncomeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white/90 transition-colors duration-200 selection:bg-violet-600/30 selection:text-violet-200">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(prev => !prev)}
        onOpenBillModal={() => handleOpenBillModal(null)}
        onOpenExpenseModal={() => handleOpenExpenseModal()}
        onOpenAIModal={() => setIsAIModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenBillModal={handleOpenBillModal}
            onOpenExpenseModal={handleOpenExpenseModal}
            onOpenIncomeModal={handleOpenIncomeModal}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onOpenPaydayModal={() => setIsPaydayModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView onOpenBillModal={handleOpenBillModal} />
        )}

        {activeTab === 'paydays' && (
          <PaydaysView
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onOpenPaydayModal={() => setIsPaydayModalOpen(true)}
            onOpenIncomeModal={handleOpenIncomeModal}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView onOpenExpenseModal={() => handleOpenExpenseModal()} />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}

        {activeTab === 'history' && <HistoryView />}
      </main>

      {/* Modals */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        billToEdit={billToEdit}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        defaultPaydayDate={defaultExpensePayday}
      />

      <AddExtraIncomeModal
        isOpen={isExtraIncomeModalOpen}
        onClose={() => setIsExtraIncomeModalOpen(false)}
        initialPaydayDate={defaultIncomePayday}
      />

      <PaydayModal
        isOpen={isPaydayModalOpen}
        onClose={() => setIsPaydayModalOpen(false)}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      <AIAdvisorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />

      {/* Floating Action Button for Raven AI Advisor */}
      <RavenFAB onClick={() => setIsAIModalOpen(true)} />

      {/* Global Toast Notification */}
      <Toast />

    </div>
  );
}

export default function App() {
  return (
    <PaydayProvider>
      <MainApp />
    </PaydayProvider>
  );
}
