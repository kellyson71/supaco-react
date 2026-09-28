// Cliente HTTP do SUAP: login, refresh automático do token e paginação.

export const SUAP = 'https://suap.ifrn.edu.br';

const K = {
  access: 'supaco:access',
  refresh: 'supaco:refresh',
  user: 'supaco:user',
};

export class AuthError extends Error {}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Listener = () => void;
const listeners = new Set<Listener>();
export const onSessionChange = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => listeners.forEach((fn) => fn());

export const session = {
  get user() { return localStorage.getItem(K.user); },
  get isLoggedIn() { return !!localStorage.getItem(K.refresh) && !!localStorage.getItem(K.user); },
  clear() {
    Object.values(K).forEach((k) => localStorage.removeItem(k));
    emit();
  },
};

export async function login(username: string, password: string) {
  const res = await fetch(`${SUAP}/api/token/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  }).catch(() => { throw new Error('Sem conexão com o SUAP. Verifique sua internet.'); });

  if (res.status === 401 || res.status === 400) throw new AuthError('Matrícula ou senha incorretas.');
  if (!res.ok) throw new Error(`O SUAP respondeu com erro (${res.status}). Tente de novo em instantes.`);

  const data: { access: string; refresh: string; username?: string } = await res.json();
  localStorage.setItem(K.access, data.access);
  localStorage.setItem(K.refresh, data.refresh);
  localStorage.setItem(K.user, data.username || username.trim());
  emit();
}

const tokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Date.now() > exp * 1000 - 30_000;
  } catch { return true; }
};

// Garante um único refresh em andamento mesmo com várias requisições paralelas
let refreshing: Promise<string> | null = null;

function refreshAccess(): Promise<string> {
  refreshing ??= (async () => {
    const refresh = localStorage.getItem(K.refresh);
    if (!refresh) throw new AuthError('Sessão expirada.');
    const res = await fetch(`${SUAP}/api/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.status === 401 || res.status === 400) {
      session.clear();
      throw new AuthError('Sessão expirada. Entre novamente.');
    }
    if (!res.ok) throw new ApiError(res.status, 'Não foi possível renovar a sessão.');
    const data: { access: string; refresh?: string } = await res.json();
    localStorage.setItem(K.access, data.access);
    if (data.refresh) localStorage.setItem(K.refresh, data.refresh);
    return data.access;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function accessToken() {
  const current = localStorage.getItem(K.access);
  return tokenExpired(current) ? refreshAccess() : current!;
}

export async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${SUAP}${path}`;
  const call = async (token: string) => fetch(url, {
    ...init,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });

  let res = await call(await accessToken());
  if (res.status === 401) res = await call(await refreshAccess());
  if (res.status === 401) { session.clear(); throw new AuthError('Sessão expirada. Entre novamente.'); }
  if (!res.ok) throw new ApiError(res.status, `SUAP respondeu ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

type Paged<T> = { results: T[]; next: string | null };

/** Segue `next` até o fim e junta todos os resultados. */
export async function getAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  for (let i = 0; next && i < 20; i++) {
    const page: Paged<T> | T[] = await get(next);
    if (Array.isArray(page)) return page;
    out.push(...(page.results ?? []));
    next = page.next?.replace(/^http:\/\//, 'https://') ?? null;
  }
  return out;
}
