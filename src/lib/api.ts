import { getUserId } from './userId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<{ data: T | null, error: string | null }> {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
      ...(options.headers || {})
    };

    const res = await fetch(endpoint, { ...options, headers });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Don't silently fall back - return error
      if (retries > 0 && res.status >= 500) {
        await new Promise(r => setTimeout(r, 500));
        return apiFetch<T>(endpoint, options, retries - 1);
      }
      return { data: null, error: `API error ${res.status}: ${text.slice(0,200)}` };
    }

    const data = await res.json() as T;
    return { data, error: null };
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500));
      return apiFetch<T>(endpoint, options, retries - 1);
    }
    return { data: null, error: String(err) };
  }
}

// Wrap existing getBills etc to use it and show toast on error
export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, body: any) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  del: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' })
};
