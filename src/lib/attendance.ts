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
};

const storageKey = () => `supaco:att:${session.user}`;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function loadAll(): AttendanceCheck[] {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '[]'); } catch { return []; }
}

function saveAll(list: AttendanceCheck[]) {
  try { localStorage.setItem(storageKey(), JSON.stringify(list.slice(-80))); } catch { /* quota */ }
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

/** Reconfere todas as aulas "pendentes" (de hoje ou de dias anteriores) que já podem ter sido lançadas. */
export async function recheckPending(subjects: Subject[]) {
  const list = loadAll();
  const today = isoDay();
  const due = list.filter((c) => c.status === 'pending' && needsCheck(c.code, c.date, list));
  if (!due.length) return;

  const byMonth = new Map<string, { year: number; month: number; items: AttendanceCheck[] }>();
  due.forEach((c) => {
    const [y, m] = c.date.split('-').map(Number);
    const key = `${y}-${m}`;
    if (!byMonth.has(key)) byMonth.set(key, { year: y, month: m, items: [] });
    byMonth.get(key)!.items.push(c);
  });

  for (const { year, month, items } of byMonth.values()) {
    let records: Aula[] | null = null;
    try { records = await fetchMonth(year, month); } catch { /* offline: tenta de novo mais tarde */ }

    items.forEach((c) => {
      const s = subjects.find((x) => x.code === c.code);
      const attempts = c.attempts + 1;
      const match = records && s ? records.find((a) => a.data.slice(0, 10) === c.date && aulaMatchesSubject(a, s)) : undefined;

      if (match) {
        upsert({ ...c, status: match.faltas > 0 ? 'absent' : 'present', faltas: match.faltas, checkedAt: Date.now(), attempts });
      } else if (records && daysBetween(parseDay(c.date) ?? new Date(), new Date()) >= 2 && c.date !== today) {
        // Passaram pelo menos 2 dias e o SUAP ainda não tem registro: desiste de esperar
        upsert({ ...c, status: 'unregistered', checkedAt: Date.now(), attempts });
      } else {
        upsert({ ...c, checkedAt: Date.now(), attempts });
      }
    });
  }
}

/** Força uma nova tentativa imediata em tudo que está pendente (usado pelo botão de atualizar). */
export function forceRecheck() {
  const list = loadAll().map((c) => (c.status === 'pending' ? { ...c, checkedAt: 0 } : c));
  saveAll(list);
}

export const attendanceFor = (code: string, date: string, list: AttendanceCheck[]) => list.find((c) => c.code === code && c.date === date);
