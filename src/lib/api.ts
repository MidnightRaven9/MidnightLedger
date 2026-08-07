import { Bill, Payday } from '../types';

const STORAGE_KEY = 'midnightledger_v1';

const getUserId = (): string => {
  if (typeof window === 'undefined') return 'default_user_ssr';
  let id = localStorage.getItem('midnightledger_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('midnightledger_uid', id);
  }
  return id;
};

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId(),
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[apiFetch] API call to ${endpoint} failed, falling back to local state`, err);
    return null;
  }
}

export async function fetchBillsFromApi(): Promise<Bill[] | null> {
  return apiFetch<Bill[]>('/api/bills');
}

export async function saveBillToApi(bill: Partial<Bill>): Promise<boolean> {
  const result = await apiFetch<{ ok: boolean }>('/api/bills', {
    method: 'POST',
    body: JSON.stringify(bill),
  });
  return !!result?.ok;
}

export async function deleteBillFromApi(id: string): Promise<boolean> {
  const result = await apiFetch<{ ok: boolean }>(`/api/bills/${id}`, {
    method: 'DELETE',
  });
  return !!result?.ok;
}

export async function fetchPaychecksFromApi(): Promise<Payday[] | null> {
  return apiFetch<Payday[]>('/api/paychecks');
}

export async function savePaycheckToApi(paycheck: Partial<Payday>): Promise<boolean> {
  const result = await apiFetch<{ ok: boolean }>('/api/paychecks', {
    method: 'POST',
    body: JSON.stringify(paycheck),
  });
  return !!result?.ok;
}

export async function deletePaycheckFromApi(id: string): Promise<boolean> {
  const result = await apiFetch<{ ok: boolean }>(`/api/paychecks/${id}`, {
    method: 'DELETE',
  });
  return !!result?.ok;
}
