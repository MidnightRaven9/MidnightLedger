import React from 'react';
import { usePayday } from '../context/PaydayContext';
import { Trash2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { customCategories, deleteCustomCategory } = usePayday();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-[13px] font-medium text-white/50">Manage your custom categories.</p>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Custom Categories</h2>
        
        {(!customCategories || customCategories.length === 0) ? (
          <div className="text-sm text-zinc-500 italic">No custom categories created yet.</div>
        ) : (
          <div className="space-y-3">
            {customCategories.map(cat => (
              <div key={cat.name} className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1A1A] border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xl shrink-0">
                    {cat.emoji}
                  </div>
                  <span className="text-white font-medium">{cat.name}</span>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete category "${cat.name}"?`)) {
                      deleteCustomCategory(cat.name);
                    }
                  }}
                  className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors cursor-pointer"
                  title="Delete Category"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
