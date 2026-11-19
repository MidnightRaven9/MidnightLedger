import React, { useEffect, useState } from 'react';
import { Check, Palette, RotateCcw, X, Sparkles } from 'lucide-react';
import {
  applyAccentColor,
  DEFAULT_ACCENT,
  getAccentColor,
  isValidHex,
  normalizeHex,
  PRESET_COLORS,
  withAlpha,
} from '../utils/accentColor';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Appearance settings — the accent colour is used across the whole UI and by
 * the celebration confetti. Stored locally; no account or network involved.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [selected, setSelected] = useState<string>(DEFAULT_ACCENT);
  const [hexInput, setHexInput] = useState<string>(DEFAULT_ACCENT);
  const [hexError, setHexError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const current = getAccentColor();
    setSelected(current);
    setHexInput(current);
    setHexError(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const chooseColor = (value: string) => {
    const hex = normalizeHex(value);
    if (!hex) return;
    applyAccentColor(hex);
    setSelected(hex);
    setHexInput(hex);
    setHexError(false);
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    const hex = normalizeHex(value);
    if (hex) {
      setHexError(false);
      applyAccentColor(hex);
      setSelected(hex);
    } else {
      setHexError(value.trim().length > 0);
    }
  };

  const handleHexBlur = () => {
    if (!isValidHex(hexInput)) {
      setHexInput(selected);
      setHexError(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--surface)] rounded-[22px] border border-[var(--border-strong)] shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Appearance settings"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
            >
              <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold tracking-tight truncate">Appearance</h2>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Make it yours — saved on this device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Live preview strip */}
          <div className="space-y-2.5">
            <p className="label">Live preview</p>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text)]">Your accent colour</p>
                  <p className="text-[11px] text-[var(--muted)]">Used for buttons, highlights & confetti</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full w-2/3 rounded-full" style={{ background: 'var(--accent)' }} />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-3">
            <p className="label">Quick colours</p>
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_COLORS.map((preset) => {
                const active = selected === preset.hex;
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => chooseColor(preset.hex)}
                    title={preset.name}
                    aria-label={`${preset.name} accent colour`}
                    className="group flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                      style={{
                        background: preset.hex,
                        boxShadow: active ? `0 0 0 2px var(--bg), 0 0 0 4px ${preset.hex}` : 'none',
                        border: active ? 'none' : '1px solid var(--border-strong)',
                      }}
                    >
                      {active && <Check className="w-5 h-5" style={{ color: preset.hex === '#c8a24b' ? '#1a1407' : '#ffffff' }} strokeWidth={2.5} />}
                    </span>
                    <span className={`text-[10px] font-medium ${active ? 'text-[var(--text)]' : 'text-[var(--faint)]'}`}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom colour — hex + native colour wheel */}
          <div className="space-y-3">
            <p className="label">Custom colour</p>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Native colour wheel / picker */}
              <label
                className="relative w-full sm:w-14 h-12 rounded-xl cursor-pointer overflow-hidden shrink-0"
                style={{ background: selected, border: '1px solid var(--border-strong)' }}
                title="Open colour wheel"
              >
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider pointer-events-none mix-blend-difference text-white">
                  Wheel
                </span>
                <input
                  type="color"
                  value={selected}
                  onChange={(e) => chooseColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Pick a custom colour"
                />
              </label>

              <div className="flex-1 min-w-0">
                <div
                  className={`flex items-center gap-2 rounded-xl px-3 h-12 bg-[var(--surface-2)] border transition-colors ${
                    hexError ? 'border-[var(--danger)]' : 'border-[var(--border-strong)] focus-within:border-[var(--accent)]'
                  }`}
                >
                  <span className="text-[var(--faint)] text-sm font-semibold">#</span>
                  <input
                    type="text"
                    value={hexInput.replace(/^#/, '')}
                    onChange={(e) => handleHexChange(e.target.value)}
                    onBlur={handleHexBlur}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="a855f7"
                    aria-label="Hex colour code"
                    className="w-full min-w-0 bg-transparent outline-none text-[13px] font-mono font-semibold text-[var(--text)] placeholder:text-[var(--faint)] uppercase"
                  />
                  {isValidHex(hexInput) && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <p className={`text-[10px] mt-1.5 ${hexError ? 'text-[var(--danger)]' : 'text-[var(--faint)]'}`}>
                  {hexError ? 'Enter a valid 3 or 6 digit hex colour' : 'Paste a hex code or tap the wheel'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => chooseColor(DEFAULT_ACCENT)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to purple
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary h-9 px-5"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
