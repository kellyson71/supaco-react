// Regras de aprovação do IFRN (Organização Didática): média 60, prova final e limite de 25% de faltas.
import type { Subject } from './suap';

export const PASS = 60;
export const FINAL_MIN = 20;

const WEIGHTS: Record<number, number[]> = { 1: [1], 2: [2, 3], 4: [2, 2, 3, 3] };
export const weightsFor = (stages: number) => WEIGHTS[stages] ?? Array(stages).fill(1);

const weighted = (grades: number[], w: number[]) =>
  grades.reduce((s, g, i) => s + g * w[i], 0) / w.reduce((a, b) => a + b, 0);

export type GradeOutlook =
  | { kind: 'passed'; average: number }
  | { kind: 'failed'; average: number | null }
  | { kind: 'final'; average: number; needed: number | null }
  | { kind: 'needs'; needed: number; stagesLeft: number }
  | { kind: 'secured'; stagesLeft: number }
  | { kind: 'empty' };

/** Nota mínima (igual em todas as etapas restantes) para fechar média 60 sem final. */
export function neededGrade(s: Subject): { needed: number; stagesLeft: number } | null {
  const w = weightsFor(s.stages);
  const left = s.grades.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0);
  if (!left.length) return null;
  const total = w.reduce((a, b) => a + b, 0);
  const done = s.grades.reduce<number>((acc, g, i) => acc + (g ?? 0) * w[i], 0);
  const wLeft = left.reduce((acc, i) => acc + w[i], 0);
  return { needed: Math.max(0, Math.ceil((PASS * total - done) / wLeft)), stagesLeft: left.length };
}

/** Menor nota na avaliação final que aprova: MFD = maior entre (MD+NAF)/2 e a média trocando uma etapa pela NAF. */
export function neededFinal(s: Subject): number | null {
  const grades = s.grades.map((g) => g ?? 0);
  const w = weightsFor(s.stages);
  const md = weighted(grades, w);
  for (let naf = 0; naf <= 100; naf++) {
    const best = Math.max(
      (md + naf) / 2,
      ...grades.map((_, i) => weighted(grades.map((g, j) => (j === i ? naf : g)), w)),
    );
    if (best >= PASS) return naf;
  }
  return null;
}

export function outlook(s: Subject): GradeOutlook {
  const status = s.status.toLowerCase();
  const avg = s.finalAverage ?? s.average;
  if (status.includes('aprovad')) return { kind: 'passed', average: avg ?? 0 };
  if (status.includes('reprovad')) return { kind: 'failed', average: avg };

  if (s.grades.every((g) => g === null)) return { kind: 'empty' };

  const need = neededGrade(s);
  if (need) {
    return need.needed === 0 ? { kind: 'secured', stagesLeft: need.stagesLeft } : { kind: 'needs', ...need };
  }

  const md = s.average ?? weighted(s.grades as number[], weightsFor(s.stages));
  if (md >= PASS) return { kind: 'passed', average: md };
  if (md < FINAL_MIN) return { kind: 'failed', average: md };
  return { kind: 'final', average: md, needed: s.finalExam !== null ? null : neededFinal(s) };
}

export type AbsenceLevel = 'safe' | 'caution' | 'critical' | 'over';

export function absenceLevel(s: Subject): AbsenceLevel {
  if (!s.limit) return 'safe';
  const left = s.limit - s.absences;
  if (left < 0) return 'over';
  if (left <= 2) return 'critical';
  if (left <= Math.max(4, s.limit * 0.3)) return 'caution';
  return 'safe';
}

/** Média ponderada geral (por carga horária) das disciplinas com média. */
export function overallAverage(subjects: Subject[]) {
  const withAvg = subjects.filter((s) => (s.finalAverage ?? s.average) !== null);
  if (!withAvg.length) return null;
  const totalW = withAvg.reduce((a, s) => a + (s.workload || 1), 0);
  return withAvg.reduce((a, s) => a + (s.finalAverage ?? s.average)! * (s.workload || 1), 0) / totalW;
}

export const gradeTone = (g: number | null) =>
  g === null ? 'text-muted' : g >= PASS ? 'text-ink' : g >= FINAL_MIN ? 'text-warn' : 'text-bad';
