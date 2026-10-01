// Trocas de horário que o SUAP não registra: o horário do diário é fixo, mas a aula pode passar para outro dia.
// A prova está nas aulas lançadas: um dia previsto que nunca tem aula e outro, fora do horário, que sempre tem.
import { useSyncExternalStore } from 'react';
import { session } from './api';
import { isoDay, parseDay } from './dates';
import { toMin, type Slot } from './schedule';
import { aulaMatchesSubject, type Aula, type Subject } from './suap';

/** Quantas aulas previstas sem nenhuma lançada, e quantas lançadas fora do horário, para acreditar na troca. */
const MIN_MISSING = 3;
const MIN_EXTRA = 3;

export type Shift = {
  code: string;
  /** Dia previsto no SUAP que nunca acontece, e o dia em que as aulas de fato acontecem (0 = domingo). */
  from: number;
  to: number;
  /** Quantas vezes o dia previsto passou sem aula lançada, e quantas aulas já saíram no dia novo. */
  missed: number;
  held: number;
  /** Horário do dia novo: o mesmo do dia previsto, a não ser que a pessoa corrija. */
  start: string;
  end: string;
  lessons: number;
  room: string;
};

/** O que a pessoa decidiu sobre uma troca; sem decisão, ela vale como detectada. */
export type Decision = { status: 'confirmed' | 'ignored'; start?: string };
type Saved = Record<string, Decision>;

export const shiftKey = (code: string, from: number, to: number) => `${code}:${from}>${to}`;

const storageKey = () => `supaco:shifts:${session.user}`;
const subs = new Set<() => void>();
let snapshot: Saved | null = null;

function load(): Saved {
  if (snapshot) return snapshot;
  try { snapshot = JSON.parse(localStorage.getItem(storageKey()) || '{}'); } catch { snapshot = {}; }
  return snapshot!;
}

export function decide(key: string, decision: Decision | null) {
  const next = { ...load() };
  if (decision) next[key] = decision; else delete next[key];
  try { localStorage.setItem(storageKey(), JSON.stringify(next)); } catch { /* quota */ }
  snapshot = next;
  subs.forEach((fn) => fn());
}

export const useShiftDecisions = () => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, load);

const addMinutes = (hhmm: string, min: number) => {
  const t = toMin(hhmm) + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * Procura trocas de dia olhando só as aulas já lançadas.
 * `holidays` são datas ISO sem aula; `from` é o início do semestre.
 */
export function detectShifts(subjects: Subject[], aulas: Aula[], now: Date, holidays: Set<string>, semesterStart?: Date | null): Shift[] {
  const out: Shift[] = [];
  const today = isoDay(now);

  for (const s of subjects) {
    const mine = aulas.filter((a) => aulaMatchesSubject(a, s));
    if (mine.length < 4) continue;
    const dates = [...new Set(mine.map((a) => a.data))].sort();
    const first = parseDay(dates[0]);
    if (!first) continue;
    // Contar a partir da primeira aula lançada: antes disso o professor pode simplesmente não ter começado
    const start = semesterStart && semesterStart > first ? semesterStart : first;

    const launched = new Map<number, number>();
    dates.forEach((d) => { const w = parseDay(d)!.getDay(); launched.set(w, (launched.get(w) ?? 0) + 1); });

    const scheduled = [...new Set(s.slots.map((sl) => sl.day))];

    // Dias previstos que passaram várias vezes sem aula
    const missing = scheduled
      .map((day) => {
        let expected = 0;
        for (const d = new Date(start); isoDay(d) < today; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === day && !holidays.has(isoDay(d))) expected++;
        }
        return { day, expected, held: launched.get(day) ?? 0 };
      })
      .filter((x) => x.expected >= MIN_MISSING && x.held === 0)
      .sort((a, b) => b.expected - a.expected);

    // Dias fora do horário que aparecem repetidamente
    const extra = [...launched.entries()]
      .filter(([day, n]) => !scheduled.includes(day) && day !== 0 && n >= MIN_EXTRA)
      .sort((a, b) => b[1] - a[1]);

    missing.forEach((m, i) => {
      const e = extra[i];
      const slot = s.slots.find((sl) => sl.day === m.day);
      if (!e || !slot) return;
      out.push({ code: s.code, from: m.day, to: e[0], missed: m.expected, held: e[1], start: slot.start, end: slot.end, lessons: slot.lessons, room: slot.room });
    });
  }
  return out;
}

export type Applied = Shift & { status: 'auto' | 'confirmed' };

/**
 * Aplica as trocas ao horário: os blocos do dia previsto passam para o dia novo.
 * As ignoradas não mudam nada; se a pessoa corrigiu a hora, o bloco anda a mesma diferença.
 */
export function applyShifts(subjects: Subject[], shifts: Shift[], saved: Saved): { subjects: Subject[]; applied: Applied[]; ignored: Shift[] } {
  const applied: Applied[] = [];
  const ignored: Shift[] = [];
  const moves = new Map<string, { from: number; to: number; delta: number }[]>();

  for (const sh of shifts) {
    const d = saved[shiftKey(sh.code, sh.from, sh.to)];
    if (d?.status === 'ignored') { ignored.push(sh); continue; }
    const start = d?.start ?? sh.start;
    const delta = toMin(start) - toMin(sh.start);
    applied.push({ ...sh, start, end: addMinutes(sh.end, delta), status: d?.status === 'confirmed' ? 'confirmed' : 'auto' });
    moves.set(sh.code, [...(moves.get(sh.code) ?? []), { from: sh.from, to: sh.to, delta }]);
  }
  if (!applied.length) return { subjects, applied, ignored };

  return {
    subjects: subjects.map((s) => {
      const list = moves.get(s.code);
      if (!list) return s;
      const slots: Slot[] = s.slots.map((sl) => {
        const mv = list.find((x) => x.from === sl.day);
        return mv ? { ...sl, day: mv.to, start: addMinutes(sl.start, mv.delta), end: addMinutes(sl.end, mv.delta) } : sl;
      });
      return { ...s, slots, moved: list.map((x) => ({ from: x.from, to: x.to })) };
    }),
    applied,
    ignored,
  };
}
