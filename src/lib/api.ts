// Cliente HTTP do SUAP: login, sessão que se renova sozinha e paginação.
import { vault } from './vault';

export const SUAP = 'https://suap.ifrn.edu.br';

const K = {
  access: 'supaco:access',
  refresh: 'supaco:refresh',
  user: 'supaco:user',
  keep: 'supaco:keep',
  last: 'supaco:lastuser',
};

export class AuthError extends Error {}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Listener = () => void;
const listeners = new Set<Listener>();
export const onSessionChange = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => listeners.forEach((fn) => fn());

// Entrar ou sair em outra aba (ou na janela do app instalado) vale para esta também
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === K.user || e.key === K.keep || e.key === null) emit(); });
}

const forget = (...keys: string[]) => {
  keys.forEach((k) => localStorage.removeItem(k));
  void vault.clear();
  emit();
};

export const session = {
  get user() { return localStorage.getItem(K.user); },
  get isLoggedIn() { return !!localStorage.getItem(K.refresh) && !!localStorage.getItem(K.user); },
  /** A senha está guardada neste aparelho para o app entrar de novo sozinho quando o SUAP encerrar a sessão. */
  get keepsLogin() { return localStorage.getItem(K.keep) === '1'; },
  /** Última matrícula usada, para o login já vir preenchido se a sessão cair. */
  get lastUser() { return localStorage.getItem(K.last) ?? ''; },
  /** Sai da conta e esquece tudo, inclusive a senha guardada. */
  clear() { forget(...Object.values(K)); },
  /** Desliga o "manter conectado" sem sair da conta. */
  forgetPassword() { forget(K.keep); },
};

type Tokens = { access: string; refresh?: string; username?: string };

function saveTokens(data: Tokens) {
  localStorage.setItem(K.access, data.access);
  if (data.refresh) localStorage.setItem(K.refresh, data.refresh);
  return data.access;
}

const requestPair = (username: string, password: string) => fetch(`${SUAP}/api/token/pair`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});

const rejected = (res: Response) => res.status === 401 || res.status === 400;

/** `keep` guarda a senha (cifrada, só neste aparelho) para a sessão nunca cair sozinha. */
export async function login(username: string, password: string, keep = true) {
  const typed = username.trim();
  const res = await requestPair(typed, password).catch(() => { throw new Error('Sem conexão com o SUAP. Verifique sua internet.'); });

  if (rejected(res)) throw new AuthError('Matrícula ou senha incorretas.');
  if (!res.ok) throw new Error(`O SUAP respondeu com erro (${res.status}). Tente de novo em instantes.`);

  const data: Tokens = await res.json();
  const user = data.username || typed;
  saveTokens(data);
  localStorage.setItem(K.user, user);
  localStorage.setItem(K.last, user);
  // Sem contexto seguro (http na rede local) o navegador não cifra nada: entra normalmente, sem guardar a senha
  const kept = keep && await vault.save(user, JSON.stringify({ username: typed, password })).then(() => true, () => false);
  if (kept) localStorage.setItem(K.keep, '1');
  else { localStorage.removeItem(K.keep); void vault.clear(); }
  emit();
}

const tokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Date.now() > exp * 1000 - 30_000;
  } catch { return true; }
};

/** A sessão acabou de vez: volta para o login. A matrícula e os dados em cache ficam, para a volta ser rápida. */
function expire(): never {
  forget(K.access, K.refresh, K.user, K.keep);
  throw new AuthError('Sessão expirada. Entre novamente.');
}

/** O refresh token venceu: entra de novo com a senha guardada, sem a pessoa perceber. */
async function relogin(): Promise<string> {
  const user = localStorage.getItem(K.user);
  const saved = user && session.keepsLogin ? await vault.load(user) : null;
  if (!saved) return expire();
  const { username, password }: { username: string; password: string } = JSON.parse(saved);
  const res = await requestPair(username, password);
  // A senha foi trocada no SUAP: a guardada não serve mais
  if (rejected(res)) return expire();
  if (!res.ok) throw new ApiError(res.status, 'Não foi possível renovar a sessão.');
  return saveTokens(await res.json());
}

// Uma renovação por vez, nesta aba e entre abas: se o SUAP trocar o refresh token a cada uso,
// duas renovações simultâneas com o mesmo token derrubariam a sessão.
const locked = <T>(fn: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request('supaco:auth', fn) : fn();

let refreshing: Promise<string> | null = null;

/** `stale` é o access token que o SUAP acabou de recusar (se houver), para não devolvê-lo de novo. */
function refreshAccess(stale?: string | null): Promise<string> {
  refreshing ??= locked(async () => {
    // Outra aba pode ter renovado enquanto esta esperava a vez
    const current = localStorage.getItem(K.access);
    if (current !== stale && !tokenExpired(current)) return current!;

    const refresh = localStorage.getItem(K.refresh);
    if (refresh) {
      const res = await fetch(`${SUAP}/api/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (res.ok) return saveTokens(await res.json());
      if (!rejected(res)) throw new ApiError(res.status, 'Não foi possível renovar a sessão.');
    }
    return relogin();
  }).finally(() => { refreshing = null; });
  return refreshing;
}

async function accessToken() {
  const current = localStorage.getItem(K.access);
  return tokenExpired(current) ? refreshAccess(current) : current!;
}

export async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${SUAP}${path}`;
  const call = async (token: string) => fetch(url, {
    ...init,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });

  const token = await accessToken();
  let res = await call(token);
  // Token recusado antes da hora: renova (ou entra de novo) e repete. Se a renovação falhar de vez, ela mesma encerra a sessão;
  // um 401 com token recém-emitido é problema do endpoint, não motivo para deslogar.
  if (res.status === 401) res = await call(await refreshAccess(token));
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
