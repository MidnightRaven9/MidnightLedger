import type { Bill, ExtraExpense, ExtraIncome, Payday, PaydaySchedule } from '../types';
import { roundCents } from './calculations';
import { isValidISODateString } from './dateUtils';

export const BACKUP_VERSION = '1.0';

export interface PersistedState {
  schedule: PaydaySchedule;
  paydays: Payday[];
  bills: Bill[];
  extraExpenses: ExtraExpense[];
  extraIncomes: ExtraIncome[];
  variableOverrides: Record<string, number>;
  variableFullTotalOverrides: Record<string, number>;
  paidStatuses: Record<string, boolean | string>;
  excludedOccurrences: Record<string, boolean>;
  lastSaved: string | null;
}

export interface ImportSummary {
  bills: number;
  paydays: number;
  expenses: number;
  incomes: number;
  excludedOccurrences: number;
  warnings: string[];
}

export type ImportInspection =
  | { ok: true; state: PersistedState; summary: ImportSummary }
  | { ok: false; error: string };

export type ParseResult =
  | { ok: true; state: PersistedState; warnings: string[] }
  | { ok: false; error: string };

const LIMITS = {
  bills: 500,
  paydays: 500,
  expenses: 2000,
  incomes: 2000,
  mapEntries: 5000,
} as const;

const MAX_AMOUNT = 1_000_000;
const MAX_KEY_LENGTH = 120;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

interface NormalizeContext {
  warnings: string[];
}

function warn(ctx: NormalizeContext, message: string): void {
  if (!ctx.warnings.includes(message)) ctx.warnings.push(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\u0000-\u001f]/g, '').slice(0, maxLength);
}

function safeAmount(value: unknown, ctx: NormalizeContext): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    warn(ctx, 'Some amounts were invalid and were changed to 0.');
    return 0;
  }
  const clamped = Math.min(MAX_AMOUNT, Math.max(0, numeric));
  if (clamped !== numeric) warn(ctx, 'Some amounts were outside the supported range and were clamped.');
  return roundCents(clamped);
}

function safeId(value: unknown, ctx: NormalizeContext): string {
  const text = safeText(value, MAX_KEY_LENGTH);
  if (/^[A-Za-z0-9_.:-]+$/.test(text)) return text;
  if (text) warn(ctx, 'Some record IDs were invalid and were regenerated.');
  return `imported_${Math.random().toString(36).slice(2, 10)}`;
}

function safeDate(value: unknown, ctx: NormalizeContext): string {
  const text = safeText(value, 10);
  if (!text) return '';
  if (!isValidISODateString(text)) {
    warn(ctx, 'Some dates were invalid and were skipped.');
    return '';
  }
  return text;
}

function safeDay(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  return Number.isFinite(parsed) ? Math.min(31, Math.max(1, parsed)) : 1;
}

function safeMap<T>(
  value: unknown,
  limit: number,
  convert: (entry: unknown) => T | null,
  ctx: NormalizeContext,
): Record<string, T> {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  let count = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (count >= limit) {
      warn(ctx, `Only the first ${limit} entries were kept in some lookup tables.`);
      break;
    }
    if (UNSAFE_KEYS.has(key) || !key || key.length > MAX_KEY_LENGTH) {
      warn(ctx, 'Some unsupported lookup entries were removed.');
      continue;
    }
    const converted = convert(entry);
    if (converted === null) {
      warn(ctx, 'Some invalid lookup entries were removed.');
      continue;
    }
    result[key] = converted;
    count++;
  }
  return result;
}

function finiteNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) <= MAX_AMOUNT ? roundCents(numeric) : null;
}

function normalizeSchedule(value: unknown, ctx: NormalizeContext): PaydaySchedule {
  if (!isRecord(value)) return { frequency: 'manual', anchorDate: '' };
  const frequency = value.frequency;
  const valid = frequency === 'weekly' || frequency === 'biweekly' || frequency === 'twice_monthly' || frequency === 'monthly' || frequency === 'manual';
  if (!valid && frequency !== undefined) warn(ctx, 'An unsupported pay schedule was changed to manual.');
  const schedule: PaydaySchedule = {
    frequency: valid ? frequency : 'manual',
    anchorDate: safeDate(value.anchorDate, ctx),
  };
  if (typeof value.firstDayOfMonth === 'number') schedule.firstDayOfMonth = safeDay(value.firstDayOfMonth);
  if (typeof value.secondDayOfMonth === 'number') schedule.secondDayOfMonth = safeDay(value.secondDayOfMonth);
  if (typeof value.monthlyDay === 'number') schedule.monthlyDay = safeDay(value.monthlyDay);
  return schedule;
}

function normalizeBills(value: unknown, limit: number, ctx: NormalizeContext): Bill[] {
  if (!Array.isArray(value)) return [];
  if (value.length > limit) warn(ctx, `Only the first ${limit} bills were kept; ${value.length - limit} were removed.`);
  const records = value.slice(0, limit).filter(isRecord);
  if (records.length !== value.slice(0, limit).length) warn(ctx, 'Some malformed bill records were skipped.');
  return records.map((b): Bill => {
    const amount = safeAmount(b.amount ?? b.myShare, ctx);
    const dueDate = safeDay(b.dueDate ?? b.due_day ?? b.dueDay);
    const rawType = typeof b.type === 'string' ? b.type.toLowerCase() : 'fixed';
    const bill: Bill = {
      id: safeId(b.id, ctx),
      name: safeText(b.name, 100, 'Untitled bill') || 'Untitled bill',
      amount,
      dueDate,
      category: safeText(b.category, 50, 'Other') || 'Other',
      type: rawType === 'variable' ? 'variable' : 'fixed',
      isActive: typeof b.isActive === 'boolean' ? b.isActive : true,
    };
    if (b.myShare !== undefined) bill.myShare = safeAmount(b.myShare, ctx);
    if (b.fullTotal !== undefined) bill.fullTotal = safeAmount(b.fullTotal, ctx);
    if (b.isSplit === true) bill.isSplit = true;
    if (b.splitWays !== undefined) bill.splitWays = safeDay(b.splitWays);
    if (b.splitCount !== undefined) bill.splitCount = safeDay(b.splitCount);
    if (b.notes !== undefined) bill.notes = safeText(b.notes, 500);
    if (b.emoji !== undefined) bill.emoji = safeText(b.emoji, 16);
    if (b.isRecurringTemplate !== undefined) bill.isRecurringTemplate = b.isRecurringTemplate === true;
    if (b.isDebt !== undefined) bill.isDebt = b.isDebt === true;
    if (b.totalBalance !== undefined) bill.totalBalance = safeAmount(b.totalBalance, ctx);
    if (b.interestRate !== undefined) bill.interestRate = safeAmount(b.interestRate, ctx);
    if (b.isDemo === true) bill.isDemo = true;
    return bill;
  });
}

function normalizePaydays(value: unknown, limit: number, ctx: NormalizeContext): Payday[] {
  if (!Array.isArray(value)) return [];
  if (value.length > limit) warn(ctx, `Only the first ${limit} paydays were kept; ${value.length - limit} were removed.`);
  const records = value.slice(0, limit).filter(isRecord);
  if (records.length !== value.slice(0, limit).length) warn(ctx, 'Some malformed payday records were skipped.');
  return records.map((p): Payday => {
    const rawEstimate = p.estimatedAmount !== undefined && p.estimatedAmount !== null
      ? p.estimatedAmount
      : p.amount;
    const estimate = rawEstimate === undefined || rawEstimate === null ? null : safeAmount(rawEstimate, ctx);
    const payday: Payday = {
      id: safeId(p.id, ctx),
      date: safeDate(p.date ?? p.dateStr, ctx),
      estimatedAmount: estimate,
    };
    if (p.isManual !== undefined) payday.isManual = p.isManual === true;
    if (p.notes !== undefined) payday.notes = safeText(p.notes, 200);
    if (p.useTax !== undefined) payday.useTax = p.useTax === true;
    if (p.gross !== undefined) payday.gross = safeAmount(p.gross, ctx);
    if (p.taxPercent !== undefined) payday.taxPercent = safeAmount(p.taxPercent, ctx);
    if (p.isDemo === true) payday.isDemo = true;
    return payday;
  }).filter(p => p.date !== '');
}

function normalizeExpenses(value: unknown, limit: number, ctx: NormalizeContext): ExtraExpense[] {
  if (!Array.isArray(value)) return [];
  if (value.length > limit) warn(ctx, `Only the first ${limit} expenses were kept; ${value.length - limit} were removed.`);
  const records = value.slice(0, limit).filter(isRecord);
  if (records.length !== value.slice(0, limit).length) warn(ctx, 'Some malformed expense records were skipped.');
  return records.map((e): ExtraExpense => {
    const expense: ExtraExpense = {
      id: safeId(e.id, ctx),
      description: safeText(e.description, 200, 'Expense') || 'Expense',
      amount: safeAmount(e.amount, ctx),
      paydayDate: safeDate(e.paydayDate, ctx),
    };
    if (e.category !== undefined) expense.category = safeText(e.category, 50);
    if (e.createdAt !== undefined) expense.createdAt = safeText(e.createdAt, 24);
    if (e.date !== undefined) expense.date = safeDate(e.date, ctx);
    if (e.paymentMethod !== undefined) expense.paymentMethod = safeText(e.paymentMethod, 50);
    if (e.emoji !== undefined) expense.emoji = safeText(e.emoji, 16);
    if (e.isDemo === true) expense.isDemo = true;
    return expense;
  });
}

function normalizeIncomes(value: unknown, limit: number, ctx: NormalizeContext): ExtraIncome[] {
  if (!Array.isArray(value)) return [];
  if (value.length > limit) warn(ctx, `Only the first ${limit} income records were kept; ${value.length - limit} were removed.`);
  const records = value.slice(0, limit).filter(isRecord);
  if (records.length !== value.slice(0, limit).length) warn(ctx, 'Some malformed income records were skipped.');
  return records.map((i): ExtraIncome => ({
    id: safeId(i.id, ctx),
    amount: safeAmount(i.amount, ctx),
    source: safeText(i.source, 100, 'Extra income') || 'Extra income',
    dateAdded: safeDate(i.dateAdded, ctx),
    paydayDate: safeDate(i.paydayDate, ctx),
  }));
}

/** Normalize loosely typed stored/imported data without discarding valid fields. */
export function normalizePersistedState(value: unknown, warnings: string[] = []): PersistedState {
  const ctx: NormalizeContext = { warnings };
  const raw = isRecord(value) ? value : {};
  const paydays = Array.isArray(raw.paydays) ? raw.paydays : (Array.isArray(raw.paychecks) ? raw.paychecks : []);
  const expenses = Array.isArray(raw.extraExpenses) ? raw.extraExpenses : (Array.isArray(raw.expenses) ? raw.expenses : []);
  const incomes = Array.isArray(raw.extraIncomes) ? raw.extraIncomes : (Array.isArray(raw.extraCash) ? raw.extraCash : []);
  return {
    schedule: normalizeSchedule(raw.schedule, ctx),
    paydays: normalizePaydays(paydays, LIMITS.paydays, ctx),
    bills: normalizeBills(raw.bills, LIMITS.bills, ctx),
    extraExpenses: normalizeExpenses(expenses, LIMITS.expenses, ctx),
    extraIncomes: normalizeIncomes(incomes, LIMITS.incomes, ctx),
    variableOverrides: safeMap(raw.variableOverrides, LIMITS.mapEntries, finiteNumber, ctx),
    variableFullTotalOverrides: safeMap(raw.variableFullTotalOverrides, LIMITS.mapEntries, finiteNumber, ctx),
    paidStatuses: safeMap(raw.paidStatuses, LIMITS.mapEntries, entry =>
      typeof entry === 'boolean' ? entry : (typeof entry === 'string' ? safeText(entry, 100) : null), ctx),
    excludedOccurrences: safeMap(raw.excludedOccurrences, LIMITS.mapEntries, entry => entry === true ? true : null, ctx),
    lastSaved: typeof raw.lastSaved === 'string' ? safeText(raw.lastSaved, 30) : null,
  };
}

/** Build the export payload. Excluded bill occurrences are part of the backup. */
export function createBackup(state: PersistedState): Record<string, unknown> {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schedule: state.schedule,
    paydays: state.paydays,
    paychecks: state.paydays,
    bills: state.bills,
    extraExpenses: state.extraExpenses,
    extraIncomes: state.extraIncomes,
    variableOverrides: { ...state.variableOverrides },
    variableFullTotalOverrides: { ...state.variableFullTotalOverrides },
    paidStatuses: { ...state.paidStatuses },
    excludedOccurrences: { ...state.excludedOccurrences },
  };
}

/** Parse and validate a JSON backup. Older version-1.0 backups remain accepted. */
export function parseBackup(jsonStr: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { ok: false, error: 'Invalid JSON backup file.' };
  }
  if (!isRecord(parsed) || parsed.version !== BACKUP_VERSION) {
    return { ok: false, error: 'Unsupported backup version.' };
  }
  if (!Array.isArray(parsed.bills) && !Array.isArray(parsed.paydays) && !Array.isArray(parsed.paychecks)) {
    return { ok: false, error: 'Backup does not contain any ledger records.' };
  }
  const warnings: string[] = [];
  const state = normalizePersistedState(parsed, warnings);
  return { ok: true, state, warnings };
}

/** Inspect a backup without changing state, for the import preview dialog. */
export function inspectBackup(jsonStr: string): ImportInspection {
  const result = parseBackup(jsonStr);
  if (result.ok === false) return { ok: false, error: result.error };
  return {
    ok: true,
    state: result.state,
    summary: {
      bills: result.state.bills.length,
      paydays: result.state.paydays.length,
      expenses: result.state.extraExpenses.length,
      incomes: result.state.extraIncomes.length,
      excludedOccurrences: Object.keys(result.state.excludedOccurrences).length,
      warnings: result.warnings,
    },
  };
}
