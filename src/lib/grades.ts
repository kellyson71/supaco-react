// Regras de aprovação do IFRN (Organização Didática): média 60, prova final e limite de 25% de faltas.
import type { Subject } from './suap';

export const PASS = 60;
export const FINAL_MIN = 20;

/** O mínimo para fazer as contas de nota: serve para uma matéria do boletim e para as calculadoras públicas. */
export type Graded = Pick<Subject, 'stages' | 'grades' | 'status' | 'average' | 'finalAverage' | 'finalExam'>;

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
export function neededGrade(s: Pick<Subject, 'stages' | 'grades'>): { needed: number; stagesLeft: number } | null {
  const w = weightsFor(s.stages);
  const left = s.grades.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0);
  if (!left.length) return null;
  const total = w.reduce((a, b) => a + b, 0);
  const done = s.grades.reduce<number>((acc, g, i) => acc + (g ?? 0) * w[i], 0);
  const wLeft = left.reduce((acc, i) => acc + w[i], 0);
  return { needed: Math.max(0, Math.ceil((PASS * total - done) / wLeft)), stagesLeft: left.length };
}

/** Menor nota na avaliação final que aprova: MFD = maior entre (MD+NAF)/2 e a média trocando uma etapa pela NAF. */
export function neededFinal(s: Pick<Subject, 'stages' | 'grades'>): number | null {
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

export function outlook(s: Graded): GradeOutlook {
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

/** A situação da matéria em uma frase, para quem está cursando. */
export function outlookText(o: GradeOutlook, s: Pick<Subject, 'grades'>): string {
  switch (o.kind) {
    case 'passed': return `Aprovado com média ${Math.round(o.average)}.`;
    case 'failed': return o.average !== null && o.average < FINAL_MIN ? 'Média abaixo de 20: sem direito à prova final.' : 'Reprovado nesta matéria.';
    case 'secured': return 'Média 60 garantida, mesmo tirando zero no que falta.';
    case 'empty': return `Nenhuma nota lançada ainda. Para passar direto, a média precisa chegar a ${PASS}.`;
    case 'needs': {
      const which = o.stagesLeft === 1 ? `na N${s.grades.findIndex((g) => g === null) + 1}` : `em cada uma das ${o.stagesLeft} etapas que faltam`;
      return o.needed > 100 ? `Nem com 100 ${which} fecha 60: vai para a prova final.` : `Você precisa de ${o.needed} ${which} para passar direto.`;
    }
    case 'final': return o.needed !== null ? `Média ${Math.round(o.average)}: prova final, e precisa de ${o.needed} nela.` : `Média ${Math.round(o.average)}: prova final.`;
  }
}

export type AbsenceLevel = 'safe' | 'caution' | 'critical' | 'over';

export function absenceLevel(s: Pick<Subject, 'limit' | 'absences'>): AbsenceLevel {
  if (!s.limit) return 'safe';
  const left = s.limit - s.absences;
  if (left < 0) return 'over';
  if (left <= 2) return 'critical';
  if (left <= Math.max(4, s.limit * 0.3)) return 'caution';
  return 'safe';
}

/** Média da matéria até agora: a oficial se existir, senão a ponderada só das etapas já lançadas. */
export function currentAverage(s: Graded): number | null {
  const official = s.finalAverage ?? s.average;
  if (official !== null) return official;
  const w = weightsFor(s.stages);
  let sum = 0, wsum = 0;
  s.grades.forEach((g, i) => { if (g !== null) { sum += g * w[i]; wsum += w[i]; } });
  return wsum ? sum / wsum : null;
}

/** Média geral (ponderada por carga horária) usando a média atual de cada matéria. */
export function overallAverage(subjects: Subject[]) {
  const items = subjects.map((s) => ({ avg: currentAverage(s), w: s.workload || 1 })).filter((x) => x.avg !== null);
  if (!items.length) return null;
  return items.reduce((a, x) => a + x.avg! * x.w, 0) / items.reduce((a, x) => a + x.w, 0);
}

/** Etapa em andamento deduzida pelo boletim (primeira etapa ainda sem nota na maioria das matérias). */
export function stageFromGrades(subjects: Subject[]): number | null {
  const counts = new Map<number, number>();
  subjects.forEach((s) => {
    const idx = s.grades.findIndex((g) => g === null);
    if (idx >= 0) counts.set(idx + 1, (counts.get(idx + 1) ?? 0) + 1);
  });
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

export const gradeTone = (g: number | null) =>
  g === null ? 'text-on-surface-variant' : g >= PASS ? 'text-on-surface' : g >= FINAL_MIN ? 'text-warning' : 'text-error';

// ---------- Notas parciais (avaliações dentro da etapa) ----------

export type StageProgress = {
  etapa: number;
  /** Média das avaliações já lançadas na etapa. */
  avg: number | null;
  done: number;
  total: number;
  /** Nota que cada avaliação pendente precisa ter para a etapa fechar em 60 (média aritmética). */
  needed: number | null;
  /** Próxima avaliação sem nota. */
  next: string | null;
};

/** Situação da etapa em andamento: a primeira que ainda tem avaliação sem nota. */
export function stageProgress(list: { etapa: number; sigla: string; nota: number | null }[] | undefined): StageProgress | null {
  if (!list?.length) return null;
  const stages = [...new Set(list.map((x) => x.etapa))].sort((a, b) => a - b);
  const etapa = stages.find((n) => list.some((x) => x.etapa === n && x.nota === null)) ?? stages[stages.length - 1];
  const items = list.filter((x) => x.etapa === etapa);
  const notas = items.map((x) => x.nota).filter((x): x is number => x !== null);
  const pending = items.filter((x) => x.nota === null);
  const sum = notas.reduce((a, b) => a + b, 0);
  return {
    etapa,
    avg: notas.length ? sum / notas.length : null,
    done: notas.length,
    total: items.length,
    needed: notas.length && pending.length ? Math.max(0, Math.ceil((PASS * items.length - sum) / pending.length)) : null,
    next: pending[0]?.sigla ?? null,
  };
}

/** A matéria tem alguma etapa contada pela média parcial. */
export const hasPartial = (s: Pick<Subject, 'partial'>) => !!s.partial?.some(Boolean);

/**
 * Etapa ainda aberta entra como "nota até agora": a média das avaliações já lançadas nela.
 * As contas (média, o que falta, situação) passam a usar essa nota; `partial` marca quais são estimadas.
 */
export function withPartials(subjects: Subject[], parciais: Record<string, { etapa: number; nota: number | null }[]>): Subject[] {
  return subjects.map((s) => {
    const list = parciais[s.code];
    if (!list?.length || s.finalAverage !== null || /aprovad|reprovad/i.test(s.status)) return s;
    const partial = s.grades.map(() => false);
    const grades = s.grades.map((g, i) => {
      if (g !== null) return g;
      const done = list.filter((x) => x.etapa === i + 1 && x.nota !== null).map((x) => x.nota as number);
      if (!done.length) return null;
      partial[i] = true;
      return Math.round(done.reduce((a, b) => a + b, 0) / done.length);
    });
    return partial.some(Boolean) ? { ...s, grades, partial } : s;
  });
}
