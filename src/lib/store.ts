// Cache "stale-while-revalidate": mostra o último dado salvo na hora e atualiza em segundo plano.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { onSessionChange, session } from './api';

type Entry<T = unknown> = { value?: T; updatedAt?: number; error?: Error; pending?: Promise<void> };

const MIN = 60_000;
const mem = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();
const anySubs = new Set<() => void>();
const fetchers = new Map<string, { fn: () => Promise<unknown>; ttl: number }>();

const storageKey = (key: string) => `supaco:c:${session.user}:${key}`;

function read(key: string): Entry {
  let e = mem.get(key);
  if (!e) {
    e = {};
    try {
      const raw = localStorage.getItem(storageKey(key));
      if (raw) { const { t, v } = JSON.parse(raw); e.value = v; e.updatedAt = t; }
    } catch { /* cache corrompido: ignora */ }
    mem.set(key, e);
  }
  return e;
}

function write(key: string, patch: Partial<Entry>) {
  const next = { ...read(key), ...patch };
  mem.set(key, next);
  if ('value' in patch) {
    try { localStorage.setItem(storageKey(key), JSON.stringify({ t: next.updatedAt, v: next.value })); } catch { /* quota */ }
  }
  subs.get(key)?.forEach((fn) => fn());
  anySubs.forEach((fn) => fn());
}

function run(key: string) {
  const f = fetchers.get(key);
  const e = read(key);
  if (!f || e.pending) return e.pending;
  const pending = f.fn()
    .then((value) => write(key, { value, updatedAt: Date.now(), error: undefined, pending: undefined }))
    .catch((error: Error) => write(key, { error, pending: undefined }));
  write(key, { pending });
  return pending;
}

const isStale = (key: string) => {
  const e = read(key);
  const ttl = fetchers.get(key)?.ttl ?? 30 * MIN;
  return !e.updatedAt || Date.now() - e.updatedAt > ttl;
};

/** Revalida tudo que está registrado (botão "atualizar" / pull-to-refresh). */
export function refreshAll(force = true) {
  return Promise.all([...fetchers.keys()].filter((k) => force || isStale(k)).map(run));
}

export function clearCache() {
  mem.clear();
  Object.keys(localStorage).filter((k) => k.startsWith('supaco:c:')).forEach((k) => localStorage.removeItem(k));
}

export function useIsRefreshing() {
  const subscribe = useCallback((cb: () => void) => { anySubs.add(cb); return () => { anySubs.delete(cb); }; }, []);
  return useSyncExternalStore(subscribe, () => [...mem.values()].some((e) => !!e.pending));
}

// Trocar de conta não pode reaproveitar dados em memória da anterior
onSessionChange(() => mem.clear());

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => { refreshAll(false); });
  window.addEventListener('online', () => { refreshAll(false); });
}

export type Resource<T> = {
  data: T | undefined;
  error: Error | undefined;
  /** Sem dado nenhum ainda (primeira carga) */
  loading: boolean;
  refreshing: boolean;
  updatedAt: number | undefined;
  refresh: () => void;
};

/**
 * `key` nulo desativa a busca (ex.: dependência ainda não carregou).
 * `ttlMin` é o tempo em minutos antes de revalidar automaticamente.
 */
export function useResource<T>(key: string | null, fn: () => Promise<T>, ttlMin = 30): Resource<T> {
  if (key) fetchers.set(key, { fn, ttl: ttlMin * MIN });

  const subscribe = useCallback((cb: () => void) => {
    if (!key) return () => {};
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(cb);
    return () => { subs.get(key)?.delete(cb); };
  }, [key]);

  const entry = useSyncExternalStore(subscribe, () => (key ? read(key) : EMPTY)) as Entry<T>;

  useEffect(() => {
    if (key && isStale(key)) run(key);
  }, [key]);

  return {
    data: entry.value,
    error: entry.error,
    loading: !!key && entry.value === undefined && !entry.error,
    refreshing: !!entry.pending,
    updatedAt: entry.updatedAt,
    refresh: () => { if (key) run(key); },
  };
}

const EMPTY: Entry = {};

/** Valor em cache agora, sem assinar nem disparar busca. */
export const peek = <T>(key: string) => read(key).value as T | undefined;

/** Atualização otimista local (ex.: marcar mensagem como lida). */
export function mutate<T>(key: string, fn: (v: T | undefined) => T) {
  const e = read(key);
  write(key, { value: fn(e.value as T | undefined), updatedAt: e.updatedAt ?? Date.now() });
}
