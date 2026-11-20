import React, { useState } from 'react';
import { AlertTriangle, Download, FileJson, Upload } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import type { ImportInspection } from '../utils/backup';
import { downloadBackup } from '../utils/downloadBackup';
import { useModalFocus } from '../utils/useModalFocus';
import { ImportPreviewModal } from './ImportPreviewModal';

/**
 * Blocks normal use only when a stored ledger could not be read. The original
 * bytes stay on disk until the user explicitly restores a backup or starts
 * fresh; downloading them is a non-destructive recovery aid.
 */
export const RecoveryModal: React.FC = () => {
  const {
    recoveryLocked,
    startFresh,
    downloadCorruptedData,
    inspectImport,
    applyImport,
    exportData,
  } = usePayday();
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isOpen = recoveryLocked && inspection === null;
  useModalFocus(panelRef, isOpen);

  if (!recoveryLocked) return null;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      const content = loadEvent.target?.result;
      if (typeof content === 'string') {
        setFileName(file.name);
        setInspection(inspectImport(content));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const closePreview = () => {
    setInspection(null);
    setFileName('');
  };

  const confirmImport = () => {
    if (inspection?.ok === true) {
      // applyImport is the explicit "restore a backup" choice and unlocks
      // persistence; the recovery modal then unmounts on its own.
      applyImport(inspection.state);
    }
    closePreview();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div
            ref={panelRef}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            aria-describedby="recovery-description"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-3xl border border-amber-600/60 shadow-2xl text-white"
          >
            <div className="p-5 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 border border-amber-500/50">
                  <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="recovery-title" className="text-lg font-extrabold">
                    Recover your saved data
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">Saved ledger could not be read</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p id="recovery-description" className="text-xs leading-relaxed text-[var(--muted)]">
                MidnightLedger found saved data it could not read. The original data is still on this
                device and <strong className="text-[var(--text)]">has not been changed</strong>. Nothing
                will be saved over it until you choose what to do.
              </p>

              <div role="status" className="rounded-2xl border border-emerald-700/60 bg-emerald-950/25 p-3 text-[11px] text-emerald-200">
                Your financial data has not been silently overwritten. Pick an option below to continue.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json,.txt,text/plain"
                aria-label="Choose a backup file for recovery"
                onChange={handleFile}
                hidden
              />

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-extrabold transition-opacity cursor-pointer"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  Restore a backup
                </button>
                <button
                  type="button"
                  onClick={downloadCorruptedData}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                  Download the unreadable data
                </button>
                <button
                  type="button"
                  onClick={startFresh}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-rose-700 bg-rose-950/30 hover:bg-rose-900/40 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileJson className="w-4 h-4" aria-hidden="true" />
                  Start fresh with an empty ledger
                </button>
              </div>

              <p className="text-[11px] text-[var(--faint)]">
                Restoring a backup or starting fresh replaces the unreadable value and cannot be undone.
                Downloading keeps a copy without changing anything.
              </p>
            </div>
          </div>
        </div>
      )}

      {inspection && (
        <ImportPreviewModal
          isOpen
          fileName={fileName}
          inspection={inspection}
          onClose={closePreview}
          onConfirm={confirmImport}
          onExportCurrent={() => downloadBackup(exportData())}
          showExportCurrent={false}
        />
      )}
    </>
  );
};
