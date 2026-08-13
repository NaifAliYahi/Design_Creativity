const API = '/api';
const TOKEN_KEY = 'cs-api-token';

let serverOk: boolean | null = null;
let checkPromise: Promise<boolean> | null = null;

export function getApiToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setApiToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function isServerAvailable(): Promise<boolean> {
  if (serverOk !== null) return serverOk;
  if (checkPromise) return checkPromise;
  checkPromise = (async () => {
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2500) });
      serverOk = r.ok;
    } catch {
      serverOk = false;
    }
    checkPromise = null;
    return serverOk;
  })();
  return checkPromise;
}

export function resetServerCheck(): void {
  serverOk = null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(`${API}${path}`, { ...init, headers });
  if (r.status === 401) throw new Error('API 401: unauthorized');
  if (!r.ok) throw new Error(`API ${r.status}: ${path}`);
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; session: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }).catch(() => ({ ok: true })),

  getData: () => request<unknown | null>('/data'),
  putData: (data: unknown) => request<{ ok: boolean }>('/data', { method: 'PUT', body: JSON.stringify(data) }),
  deleteData: () => request<{ ok: boolean }>('/data', { method: 'DELETE' }),

  getUsers: () => request<unknown[]>('/users'),
  putUsers: (users: unknown[]) => request<{ ok: boolean }>('/users', { method: 'PUT', body: JSON.stringify(users) }),

  getNetcardTemplates: () => request<Record<string, unknown>>('/netcard/templates'),
  putNetcardTemplate: (id: string, entry: unknown) =>
    request<{ ok: boolean }>(`/netcard/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    }),
  deleteNetcardTemplate: (id: string) =>
    request<{ ok: boolean }>(`/netcard/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getNetcardCustom: () => request<unknown[]>('/netcard/custom'),
  putNetcardCustom: (entry: unknown) =>
    request<{ ok: boolean }>('/netcard/custom', { method: 'PUT', body: JSON.stringify(entry) }),
  deleteNetcardCustom: (id: string) =>
    request<{ ok: boolean }>(`/netcard/custom/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
