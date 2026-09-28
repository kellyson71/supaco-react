// Respostas rápidas calculadas a partir dos dados: posso faltar?, etapa atual, próximo feriado.
import type { Calendario, Subject } from './suap';
import { stageFromGrades } from './grades';
import { daysBetween, parseDay } from './dates';

// ---------- Posso faltar? ----------

export type SkipVerdict = 'noclass' | 'yes' | 'tight' | 'no';
export type SkipItem = { s: Subject; lessons: number; leftAfter: number };

/** Simula faltar o dia inteiro `day` (0 = domingo) e diz se alguma matéria estoura o limite. */
export function canSkip(subjects: Subject[], day: number): { verdict: SkipVerdict; items: SkipItem[] } {
  const items = subjects
    .map((s) => ({ s, lessons: s.slots.filter((sl) => sl.day === day).reduce((a, sl) => a + sl.lessons, 0) }))
    .filter((x) => x.lessons > 0)
    .map((x) => ({ ...x, leftAfter: x.s.limit - x.s.absences - x.lessons }))
    .sort((a, b) => a.leftAfter - b.leftAfter);

  if (!items.length) return { verdict: 'noclass', items };
  if (items.some((x) => x.leftAfter < 0)) return { verdict: 'no', items };
  if (items.some((x) => x.leftAfter <= 2)) return { verdict: 'tight', items };
  return { verdict: 'yes', items };
}

// ---------- Etapa ----------

export type Stage = { n: number; daysLeft: number | null; end: Date | null; source: 'calendario' | 'boletim' };

export function currentStage(cal: Calendario | null | undefined, subjects: Subject[] | undefined, now = new Date()): Stage | null {
  if (cal) {
    let last: Stage | null = null;
    for (const n of [1, 2, 3, 4] as const) {
      const start = parseDay(cal[`data_inicio_etapa_${n}`]);
      const end = parseDay(cal[`data_fim_etapa_${n}`]);
      if (!start || !end) continue;
      if (now >= start && daysBetween(now, end) >= 0) return { n, daysLeft: daysBetween(now, end), end, source: 'calendario' };
      // Entre etapas (recesso): mostra a próxima
      if (now < start) return { n, daysLeft: daysBetween(now, end), end, source: 'calendario' };
      last = { n, daysLeft: null, end, source: 'calendario' };
    }
    if (last) return last;
  }
  const n = subjects ? stageFromGrades(subjects) : null;
  return n ? { n, daysLeft: null, end: null, source: 'boletim' } : null;
}

// ---------- Feriados ----------

export type Holiday = { date: string; name: string };

export function nextHoliday(list: Holiday[] | undefined, now = new Date()) {
  if (!list) return null;
  const upcoming = list
    .map((h) => ({ ...h, d: parseDay(h.date) }))
    .filter((h): h is Holiday & { d: Date } => !!h.d && daysBetween(now, h.d) >= 0)
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  return upcoming[0] ? { ...upcoming[0], days: daysBetween(now, upcoming[0].d) } : null;
}
