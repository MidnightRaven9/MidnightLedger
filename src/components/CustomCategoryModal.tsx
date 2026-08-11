import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';

interface CustomCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string) => void;
}

export const CustomCategoryModal: React.FC<CustomCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🪶');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalEmoji = emoji.trim() || '🪶';
    onSave(name.trim(), finalEmoji);
    setName('');
    setEmoji('🪶');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-zinc-800 rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white tracking-tight">Create Custom Category</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          <div className="flex gap-4">
            <div className="w-16 h-16 shrink-0">
              <label className="block text-xs font-semibold text-white/80 mb-1.5 text-center">
                Icon
              </label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="w-full h-12 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-center text-2xl text-white focus:outline-none focus:border-[#7C3AED]"
                style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kids, Pets, Side Hustle"
                className="w-full h-12 px-3 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-[#121212] flex items-center gap-3">
            <div className="text-2xl">{emoji || '🪶'}</div>
            <div className="text-white font-medium">{name || 'My Category'}</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-white/70 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
