/** Download generated data from the browser or Capacitor WebView. */
export function downloadBackup(
  json: string,
  filename?: string,
  mimeType = 'application/json',
): void {
  const blob = new Blob([json], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `midnight_ledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  // Defer revocation so the WebView has a chance to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
