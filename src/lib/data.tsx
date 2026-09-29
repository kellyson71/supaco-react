// Hooks de dados compartilhados pelas telas + período letivo selecionado.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useResource } from './store';
import { api, type Aula, type Periodo } from './suap';
import { parseDay } from './dates';
import { fetchPendingTasks } from './classroom';
import type { Holiday } from './insights';

export const useEu = () => useResource('eu', api.eu, 24 * 60);
export const useAluno = () => useResource('aluno', api.aluno, 24 * 60);
export const useRequisitos = () => useResource('requisitos', api.requisitos, 12 * 60);
export const usePeriodos = () => useResource('periodos', api.periodos, 24 * 60);
export const useAvaliacoes = () => useResource('avaliacoes', api.avaliacoes, 60);
export const useMensagens = () => useResource('mensagens', api.mensagens, 30);

export const useDisciplinas = (p: Periodo | undefined) =>
  useResource(p ? `disciplinas:${p.label}` : null, () => api.disciplinas(p!), 30);
export const useFrequencia = (p: Periodo | undefined) =>
  useResource(p ? `frequencia:${p.label}` : null, () => api.frequencia(p!), 60);
export const useTurma = (code: string | undefined) =>
  useResource(code ? `turma:${code}` : null, () => api.turma(code!), 12 * 60);
export const useCampus = (sigla: string | undefined) =>
  useResource(sigla ? `campus:v3:${sigla}` : null, () => api.campus(sigla!), 6 * 60);
export const useEstatisticas = () => useResource('estatisticas', api.estatisticas, 24 * 60);

/** Nomes dos professores das matérias atuais (para destacar projetos que eles coordenam). */
export function useMyTeachers(codes: string[] | undefined) {
  const key = codes?.length ? `professores:${[...codes].sort().join(',')}` : null;
  return useResource(key, async () => {
    const turmas = await Promise.all(codes!.map((c) => api.turma(c).catch(() => null)));
    return [...new Set(turmas.flatMap((t) => t?.professores.map((p) => p.nome) ?? []))];
  }, 24 * 60);
}
export const useCalendario = (p: Periodo | undefined) =>
  useResource(p ? `calendario:${p.label}` : null, () => api.calendario(p!).catch(() => null), 24 * 60);

/** Aulas registradas no período (do início do semestre até hoje, no máx. 6 meses). */
export function useAulas(p: Periodo | undefined, inicio?: string | null) {
  // v2: datas passaram a vir em ISO; o cache antigo (dd/mm/aaaa) é ignorado
  return useResource(p ? `aulas:v2:${p.label}` : null, async () => {
    const now = new Date();
    const start = parseDay(inicio) ?? new Date(p!.ano, p!.periodo === 1 ? 1 : 6, 1);
    const months: [number, number][] = [];
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= now && months.length < 6; d.setMonth(d.getMonth() + 1)) {
      months.push([d.getFullYear(), d.getMonth() + 1]);
    }
    const lists = await Promise.all(months.map(([y, m]) => api.aulas(y, m).catch(() => [] as Aula[])));
    return lists.flat().sort((a, b) => (b.data > a.data ? 1 : -1));
  }, 60);
}

export const useTasks = (enabled: boolean) =>
  useResource(enabled ? 'classroom' : null, fetchPendingTasks, 20);

export const useHolidays = () => {
  const year = new Date().getFullYear();
  return useResource(`feriados:${year}`, async () => {
    const r = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (!r.ok) throw new Error('feriados');
    return (await r.json()) as Holiday[];
  }, 7 * 24 * 60);
};

// ---------- Período ----------

type PeriodCtx = { period: Periodo | undefined; current: Periodo | undefined; periods: Periodo[]; setPeriod: (label: string) => void };
const Ctx = createContext<PeriodCtx>({ period: undefined, current: undefined, periods: [], setPeriod: () => {} });

export function PeriodProvider({ children }: { children: ReactNode }) {
  const { data: periods = [] } = usePeriodos();
  const [selected, setSelected] = useState<string | null>(null);
  const value = useMemo(() => ({
    periods,
    current: periods[0],
    period: periods.find((p) => p.label === selected) ?? periods[0],
    setPeriod: setSelected,
  }), [periods, selected]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePeriod = () => useContext(Ctx);

/** Disciplinas do período letivo atual (sempre o mais recente, independente do seletor). */
export const useCurrentSubjects = () => useDisciplinas(usePeriod().current);

