import React from 'react';
import { AlertTriangle, Download, FileJson, Upload, X } from 'lucide-react';
import type { ImportInspection } from '../utils/backup';
import { useEscapeToClose } from '../utils/useEscapeToClose';
import { useModalFocus } from '../utils/useModalFocus';

interface ImportPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  inspection: ImportInspection | null;
  onClose: () => void;
  onConfirm: () => void;
  onExportCurrent: () => void;
  /** Hidden during recovery, where "current data" is an empty placeholder ledger. */
  showExportCurrent?: boolean;
}

const ROWS: Array<{ key: 'bills' | 'paydays' | 'expenses' | 'incomes' | 'excludedOccurrences'; label: string }> = [
  { key: 'bills', label: 'Bills' },
  { key: 'paydays', label: 'Paychecks / paydays' },
  { key: 'expenses', label: 'Extra expenses' },
  { key: 'incomes', label: 'Extra income' },
  { key: 'excludedOccurrences', label: 'Skipped occurrences' },
];

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  fileName,
  inspection,
  onClose,
  onConfirm,
  onExportCurrent,
  showExportCurrent = true,
}) => {
  useEscapeToClose(isOpen, onClose);
  const panelRef = React.useRef<HTMLDivElement>(null);
  useModalFocus(panelRef, isOpen);

  if (!isOpen || !inspection) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
        aria-describedby="import-preview-description"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-3xl border border-[var(--border-strong)] shadow-2xl text-white"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
            >
              <FileJson className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="import-preview-title" className="text-lg font-extrabold truncate">
                Review backup before importing
              </h2>
              <p className="text-[11px] text-[var(--muted)] truncate" title={fileName}>
                {fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import preview"
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {inspection.ok === false ? (
            <div role="alert" className="rounded-2xl border border-rose-800/70 bg-rose-950/30 p-4 text-xs text-rose-200">
              <p className="font-bold mb-1">This backup could not be imported.</p>
              <p>{inspection.error}</p>
              <p className="mt-2 text-rose-300/80">Your current data was not changed.</p>
            </div>
          ) : (
            <>
              <p id="import-preview-description" className="text-xs leading-relaxed text-[var(--muted)]">
                Importing will <strong className="text-[var(--text)]">replace all current data</strong> on this device — bills, paychecks, expenses, income, payment status and settings. This cannot be undone.
              </p>

              <dl className="grid grid-cols-2 gap-2" aria-label="Records found in backup">
                {ROWS.map(row => (
                  <div
                    key={row.key}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <dt className="text-[11px] text-[var(--muted)]">{row.label}</dt>
                    <dd className="text-sm font-bold tabular-nums text-[var(--text)]">{inspection.summary[row.key]}</dd>
                  </div>
                ))}
              </dl>

              {inspection.summary.excludedOccurrences > 0 && (
                <p className="text-[11px] text-[var(--muted)]">
                  Skipped bill occurrences are included in the backup and will be preserved.
                </p>
              )}

              {inspection.summary.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-600/50 bg-amber-950/20 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    Validation warnings
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-200/90">
                    {inspection.summary.warnings.map(message => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 pt-0 flex flex-col gap-2.5">
          {showExportCurrent && (
            <button
              type="button"
              onClick={onExportCurrent}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              Download my current data first
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={inspection.ok === false}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-rose-900/80 hover:bg-rose-900 text-rose-100 border border-rose-600 text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Replace my data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
