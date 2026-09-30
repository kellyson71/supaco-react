// Confere no SUAP, depois que uma aula termina, se ela foi lançada e se virou falta.
import { useSyncExternalStore } from 'react';
import { session } from './api';
import { api, aulaMatchesSubject, type Aula, type Subject } from './suap';
import { daysBetween, isoDay, parseDay } from './dates';

export type AttendanceStatus = 'pending' | 'present' | 'absent' | 'unregistered';

export type AttendanceCheck = {
  code: string;
  subject: string;
  date: string; // yyyy-mm-dd
  status: AttendanceStatus;
  faltas: number;
  checkedAt: number;
  attempts: number;
  /** Quando o app viu a aula registrada no SUAP (todo mundo começa com presença). */
  registeredAt?: number;
  /** Quando o app viu a falta aparecer. */
  absentAt?: number;
};

const storageKey = () => `supaco:att:${session.user}`;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

// useSyncExternalStore exige que getSnapshot devolva a mesma referência enquanto
// os dados não mudam; por isso o cache é invalidado só em saveAll, nunca recriado a cada leitura.
let snapshot: AttendanceCheck[] | null = null;

function loadAll(): AttendanceCheck[] {
  if (snapshot) return snapshot;
  try { snapshot = JSON.parse(localStorage.getItem(storageKey()) || '[]'); } catch { snapshot = []; }
  return snapshot!;
}

function saveAll(list: AttendanceCheck[]) {
  try { localStorage.setItem(storageKey(), JSON.stringify(list.slice(-80))); } catch { /* quota */ }
  snapshot = null;
  emit();
}

function upsert(check: AttendanceCheck) {
  const list = loadAll();
  const i = list.findIndex((c) => c.code === check.code && c.date === check.date);
  if (i >= 0) list[i] = check; else list.push(check);
  saveAll(list);
}

export const getChecks = loadAll;
export const onAttendanceChange = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
export const useAttendance = () => useSyncExternalStore(onAttendanceChange, loadAll);

/** Espera mínima entre uma tentativa e a próxima, crescendo aos poucos. */
function nextDelay(attempts: number) {
  if (attempts < 2) return 5 * 60_000;
  if (attempts < 5) return 20 * 60_000;
  return 60 * 60_000;
}

function needsCheck(code: string, date: string, list: AttendanceCheck[]) {
  const c = list.find((x) => x.code === code && x.date === date);
  if (!c) return true;
  // Presença do próprio dia ainda pode virar falta: o professor pode lançar depois
  if (c.status === 'present' && date === isoDay()) return Date.now() - c.checkedAt >= 10 * 60_000;
  if (c.status !== 'pending') return false;
  return Date.now() - c.checkedAt >= nextDelay(c.attempts);
}

/** Marca a aula como "aguardando" assim que ela termina, mesmo antes de checar. */
export function markEnded(code: string, subjectName: string, date: string) {
  const list = loadAll();
  if (list.some((c) => c.code === code && c.date === date)) return;
  upsert({ code, subject: subjectName, date, status: 'pending', faltas: 0, checkedAt: 0, attempts: 0 });
}

const monthCache = new Map<string, Promise<Aula[]>>();
function fetchMonth(year: number, month: number): Promise<Aula[]> {
  const key = `${year}-${month}`;
  monthCache.set(key, monthCache.get(key) ?? api.aulas(year, month).finally(() => setTimeout(() => monthCache.delete(key), 15_000)));
  return monthCache.get(key)!;
}

/** Aplica o que o SUAP devolveu a uma conferência: registrada (presença/falta), sem registro ou ainda pendente. */
function resolve(c: AttendanceCheck, records: Aula[] | null, s: Subject | undefined): AttendanceCheck {
  const now = Date.now();
  const attempts = c.attempts + 1;
  const match = records && s ? records.find((a) => a.data.slice(0, 10) === c.date && aulaMatchesSubject(a, s)) : undefined;

  if (match) {
    return {
      ...c, status: match.faltas > 0 ? 'absent' : 'present', faltas: match.faltas, checkedAt: now, attempts,
      registeredAt: c.registeredAt ?? now,
      absentAt: match.faltas > 0 ? c.absentAt ?? now : c.absentAt,
    };
  }
  // Passaram pelo menos 2 dias e o SUAP ainda não tem registro: desiste de esperar
  if (records && daysBetween(parseDay(c.date) ?? new Date(), new Date()) >= 2 && c.date !== isoDay()) {
    return { ...c, status: 'unregistered', checkedAt: now, attempts };
  }
  return { ...c, checkedAt: now, attempts };
}

const sameOutcome = (a: AttendanceCheck, b: AttendanceCheck) => a.status === b.status && a.faltas === b.faltas;

/** Reconfere as aulas "pendentes" (e as presenças de hoje) que já podem ter sido lançadas. Devolve true se algo mudou. */
export async function recheckPending(subjects: Subject[]): Promise<boolean> {
  const list = loadAll();
  const today = isoDay();
  const due = list.filter((c) => (c.status === 'pending' || (c.status === 'present' && c.date === today)) && needsCheck(c.code, c.date, list));
  if (!due.length) return false;

  const byMonth = new Map<string, { year: number; month: number; items: AttendanceCheck[] }>();
  due.forEach((c) => {
    const [y, m] = c.date.split('-').map(Number);
    const key = `${y}-${m}`;
    if (!byMonth.has(key)) byMonth.set(key, { year: y, month: m, items: [] });
    byMonth.get(key)!.items.push(c);
  });

  let changed = false;
  for (const { year, month, items } of byMonth.values()) {
    let records: Aula[] | null = null;
    try { records = await fetchMonth(year, month); } catch { /* offline: tenta de novo mais tarde */ }

    items.forEach((c) => {
      const next = resolve(c, records, subjects.find((x) => x.code === c.code));
      if (!sameOutcome(c, next)) changed = true;
      upsert(next);
    });
  }
  return changed;
}

const lastPoll = new Map<string, number>();

/**
 * Durante a aula, confere o SUAP a cada ~1 min para ver quando o professor registra a chamada
 * (aí todo mundo fica com presença) e quando uma falta aparece. Devolve true se algo mudou.
 */
export async function pollLive(subjects: Subject[], live: { code: string; subject: string }[], date: string): Promise<boolean> {
  const due = live.filter((c) => Date.now() - (lastPoll.get(c.code + date) ?? 0) >= 55_000);
  if (!due.length) return false;
  due.forEach((c) => lastPoll.set(c.code + date, Date.now()));

  const [y, m] = date.split('-').map(Number);
  let records: Aula[];
  try { records = await fetchMonth(y, m); } catch { return false; }

  let changed = false;
  due.forEach((c) => {
    const prev = attendanceFor(c.code, date, loadAll()) ?? { code: c.code, subject: c.subject, date, status: 'pending' as const, faltas: 0, checkedAt: 0, attempts: 0 };
    const next = resolve(prev, records, subjects.find((x) => x.code === c.code));
    if (!sameOutcome(prev, next)) changed = true;
    upsert(next);
  });
  return changed;
}

/** Força uma nova tentativa imediata em tudo que está pendente (usado pelo botão de atualizar). */
export function forceRecheck() {
  const list = loadAll().map((c) => (c.status === 'pending' ? { ...c, checkedAt: 0 } : c));
  saveAll(list);
}

export const attendanceFor = (code: string, date: string, list: AttendanceCheck[]) => list.find((c) => c.code === code && c.date === date);
