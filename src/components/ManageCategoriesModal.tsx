import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'expense' | 'bill';
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  type = 'expense',
}) => {
  const { 
    customExpenseCategories, 
    deleteCustomExpenseCategory,
    customBillCategories,
    deleteCustomBillCategory
  } = usePayday();
  
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);

  if (!isOpen) return null;
  
  const categories = type === 'expense' ? customExpenseCategories : customBillCategories;
  const deleteCustomCategory = type === 'expense' ? deleteCustomExpenseCategory : deleteCustomBillCategory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-[#121212] rounded-3xl border border-[#2A2A2A] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-bold text-white">Manage Categories</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1E1E1E] flex items-center justify-center text-white/50 hover:bg-[#2A2A2A] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {categories.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-4">No custom categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-bold text-white">{cat.name}</span>
                  </div>
                  
                  {confirmDeleteName === cat.name ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          deleteCustomCategory(cat.name);
                          setConfirmDeleteName(null);
                        }}
                        className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteName(null)}
                        className="px-2 py-1 rounded bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteName(cat.name)}
                      className="p-2 rounded-lg text-white/40 hover:text-[#FF6B7A] hover:bg-[#2D161B] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
