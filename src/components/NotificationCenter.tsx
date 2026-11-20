import React, { useEffect, useMemo, useState } from 'react';
import { Bell, AlertCircle, Clock3, Check, X, Settings2, Inbox } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import {
  BillAlert,
  describeAlert,
  getBillAlerts,
  getNotificationSettings,
  NOTIFICATION_SETTINGS_CHANGED,
  NotificationSettings,
  syncSystemNotifications,
} from '../utils/notifications';

interface NotificationCenterProps {
  onOpenSettings: () => void;
  onGoToBills: () => void;
}

/** Bell in the header + an offline reminder panel built from unpaid bills. */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onOpenSettings,
  onGoToBills,
}) => {
  const { summaries, paidStatuses, toggleBillPaid } = usePayday();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());

  // Settings are edited in a separate modal, so refresh when it saves as well
  // as when the panel is opened.
  useEffect(() => {
    const refresh = () => setSettings(getNotificationSettings());
    if (open) refresh();
    window.addEventListener(NOTIFICATION_SETTINGS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATION_SETTINGS_CHANGED, refresh);
  }, [open]);

  const alerts = useMemo<BillAlert[]>(() => {
    if (!settings.enabled) return [];
    return getBillAlerts(summaries, paidStatuses, settings.daysAhead);
  }, [summaries, paidStatuses, settings.enabled, settings.daysAhead]);

  // Keep the device's scheduled notifications in sync with unpaid bills.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncSystemNotifications(summaries, paidStatuses, settings);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [summaries, paidStatuses, settings]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleMarkPaid = (alert: BillAlert) => {
    toggleBillPaid(alert.id.split('::')[0], alert.paydayDate);
  };

  return (
    <>
      <button
        id="open-notifications"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Reminders${alerts.length ? `, ${alerts.length} unpaid bills due soon` : ''}`}
        title="Bill reminders"
        className="btn-quiet relative h-8 w-8 !p-0"
      >
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold leading-none"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Bill reminders"
            className="fixed z-50 top-[58px] right-2 sm:right-4 w-[calc(100vw-16px)] sm:w-[360px] max-w-[360px] max-h-[min(520px,calc(100vh-72px))] flex flex-col rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                <h2 className="text-[13px] font-bold text-[var(--text)]">Reminders</h2>
                {alerts.length > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--muted)]">
                    {alerts.length} due
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close reminders"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5">
              {!settings.enabled ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <Bell className="w-6 h-6 mx-auto text-[var(--faint)]" />
                  <p className="text-[12px] font-semibold text-[var(--text)]">Reminders are off</p>
                  <p className="text-[11px] text-[var(--muted)]">Turn them on in Settings → Notifications.</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-[var(--accent-soft)] border border-[var(--accent)]">
                    <Inbox className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-[12px] font-semibold text-[var(--text)]">All clear</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    No unpaid bills due in the next {settings.daysAhead} days.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const tone = alert.kind === 'overdue' ? 'var(--danger)' : 'var(--warn)';
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--surface)', border: `1px solid ${tone}` }}
                      >
                        {alert.kind === 'overdue'
                          ? <AlertCircle className="w-4 h-4" style={{ color: tone }} />
                          : <Clock3 className="w-4 h-4" style={{ color: tone }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[var(--text)] leading-snug break-words">
                          {alert.billName}
                        </p>
                        <p className="text-[10px] text-[var(--muted)] leading-snug mt-0.5">
                          {describeAlert(alert)} · {formatDate(alert.dueDate, 'short')}
                        </p>
                        <p className="text-[11px] font-bold mt-0.5" style={{ color: tone }}>
                          {formatCurrency(alert.amount)} unpaid
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkPaid(alert)}
                        title="Mark as paid"
                        aria-label={`Mark ${alert.billName} as paid`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[var(--accent-soft)]"
                        style={{ border: '1px solid var(--border-strong)', color: 'var(--accent)' }}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-[var(--border)] shrink-0">
              <button
                onClick={() => { setOpen(false); onOpenSettings(); }}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" /> Reminder settings
              </button>
              <button
                onClick={() => { setOpen(false); onGoToBills(); }}
                className="text-[11px] font-semibold cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                View bills →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
