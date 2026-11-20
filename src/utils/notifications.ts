/**
 * Local-first bill reminders.
 *
 * Everything is computed on-device from the same payday data the app already
 * has. On Android the Capacitor local-notifications plugin schedules real OS
 * notifications; in a browser/PWA we gracefully fall back to the Notification
 * API. No server, no push token, no account.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PaydaySummary } from '../types';
import { formatCurrency, formatDate, isValidISODateString, parseISODate } from './dateUtils';
import { logSafeWarning } from './safeLog';

export type AlertKind = 'overdue' | 'today' | 'soon';

export interface BillAlert {
  id: string;
  billName: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  kind: AlertKind;
  paydayDate: string;
}

export interface NotificationSettings {
  /** In-app reminder bell + OS notifications. */
  enabled: boolean;
  /** How many days ahead an unpaid bill is considered "due soon". */
  daysAhead: number;
  /** Schedule real Android notifications (opt-in, needs permission). */
  system: boolean;
}

const SETTINGS_KEY = 'midnightledger_notification_settings';
const LAST_PROMPT_KEY = 'midnightledger_last_notification_prompt';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  daysAhead: 3,
  system: false,
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      daysAhead: [1, 3, 5, 7, 14].includes(parsed.daysAhead) ? parsed.daysAhead : 3,
      system: typeof parsed.system === 'boolean' ? parsed.system : false,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export const NOTIFICATION_SETTINGS_CHANGED = 'midnightledger:notification-settings-changed';

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings still apply for this session */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_CHANGED));
  }
}

/** Stable positive 31-bit id for a bill+payday pair. */
function notificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 2000000000) + 1;
}

/** Build the alert list from unpaid bills across the current payday summaries. */
export function getBillAlerts(
  summaries: PaydaySummary[],
  paidStatuses: Record<string, boolean | string>,
  daysAhead: number,
): BillAlert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: BillAlert[] = [];
  const seen = new Set<string>();

  for (const summary of summaries) {
    for (const assigned of summary.assignedBills) {
      if (assigned.isPaid) continue;
      const paidKey = `${assigned.bill.id}::${summary.payday.date}`;
      if (paidStatuses[paidKey]) continue;

      if (!isValidISODateString(assigned.dueFullDate)) continue;
      const due = parseISODate(assigned.dueFullDate);
      if (Number.isNaN(due.getTime())) continue;
      due.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((due.getTime() - today.getTime()) / 86400000);
      if (daysUntil > daysAhead) continue;

      const id = `${assigned.bill.id}::${summary.payday.date}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const amount = assigned.effectiveAmount ?? assigned.bill.amount ?? 0;
      alerts.push({
        id,
        billName: assigned.bill.name,
        amount,
        dueDate: assigned.dueFullDate,
        daysUntil,
        kind: daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : 'soon',
        paydayDate: summary.payday.date,
      });
    }
  }

  alerts.sort((a, b) => a.daysUntil - b.daysUntil || a.billName.localeCompare(b.billName));
  return alerts;
}

export function describeAlert(alert: BillAlert): string {
  if (alert.kind === 'overdue') return `Overdue by ${Math.abs(alert.daysUntil)} day${Math.abs(alert.daysUntil) === 1 ? '' : 's'}`;
  if (alert.kind === 'today') return 'Due today';
  return `Due in ${alert.daysUntil} day${alert.daysUntil === 1 ? '' : 's'}`;
}

/** Ask for notification permission. Safe to call anywhere. */
export async function requestSystemPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification === 'undefined') return false;
    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  try {
    const result = await LocalNotifications.checkPermissions();
    if (result.display === 'granted') return true;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * (Re)schedule OS notifications for unpaid bills. Called whenever bills,
 * paid state, or settings change — always replaces the previous set.
 *
 * Each notification is timed for the moment a bill ENTERS the reminder window
 * (due date minus the chosen days-ahead), so the user is warned before it is
 * due. If that moment has already passed, it falls back to 9am tomorrow as a
 * daily catch-up nudge while the bill remains unpaid.
 */
export async function syncSystemNotifications(
  summaries: PaydaySummary[],
  paidStatuses: Record<string, boolean | string>,
  settings: NotificationSettings,
): Promise<void> {
  const active = settings.enabled && settings.system;

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancelAll();
      if (!active) return;

      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return;

      const notifications: Array<{
        id: number;
        title: string;
        body: string;
        schedule: { at: Date; allowWhileIdle: boolean };
      }> = [];
      const seen = new Set<string>();

      for (const summary of summaries) {
        for (const assigned of summary.assignedBills) {
          if (assigned.isPaid) continue;
          const paidKey = `${assigned.bill.id}::${summary.payday.date}`;
          if (paidStatuses[paidKey]) continue;

          if (!isValidISODateString(assigned.dueFullDate)) continue;
          const due = parseISODate(assigned.dueFullDate);
          if (Number.isNaN(due.getTime())) continue;
          const key = `${assigned.bill.id}::${summary.payday.date}`;
          if (seen.has(key)) continue;
          seen.add(key);

          let notifyAt = new Date(due);
          notifyAt.setDate(notifyAt.getDate() - settings.daysAhead);
          notifyAt.setHours(9, 0, 0, 0);
          if (notifyAt.getTime() <= Date.now()) {
            // Already inside the window — nudge again tomorrow morning.
            notifyAt = new Date();
            notifyAt.setDate(notifyAt.getDate() + 1);
            notifyAt.setHours(9, 0, 0, 0);
          }

          const amount = assigned.effectiveAmount ?? assigned.bill.amount ?? 0;
          notifications.push({
            id: notificationId(key),
            title: `Bill due soon: ${assigned.bill.name}`,
            body: `Due ${formatDate(assigned.dueFullDate, 'medium')} · ${formatCurrency(amount)}. Open MidnightLedger to mark it paid.`,
            schedule: { at: notifyAt, allowWhileIdle: true },
          });
        }
      }

      if (notifications.length) {
        await LocalNotifications.schedule({ notifications });
      }
    } catch (error) {
      logSafeWarning('Could not schedule local notifications');
    }
    return;
  }

  // Browser / PWA: a single nudge on open, at most once per day.
  try {
    if (!active) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const alerts = getBillAlerts(summaries, paidStatuses, settings.daysAhead);
    if (!alerts.length) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_PROMPT_KEY) === today) return;
    localStorage.setItem(LAST_PROMPT_KEY, today);
    new Notification(
      alerts.length === 1 ? `Bill reminder: ${alerts[0].billName}` : `${alerts.length} bills need attention`,
      {
        body: alerts.length === 1
          ? `${describeAlert(alerts[0])} · ${formatCurrency(alerts[0].amount)}`
          : alerts.slice(0, 3).map((a) => `${a.billName} (${describeAlert(a)})`).join('\n'),
        tag: 'midnightledger-reminder',
      },
    );
  } catch (error) {
    logSafeWarning('Could not show browser notification');
  }
}
