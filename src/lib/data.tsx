// Hooks de dados compartilhados pelas telas + período letivo selecionado.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useResource } from './store';
import { api, type Periodo } from './suap';
import { classroom, fetchPendingTasks } from './classroom';

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
export const useCalendario = (p: Periodo | undefined) =>
  useResource(p ? `calendario:${p.label}` : null, () => api.calendario(p!).catch(() => null), 24 * 60);

export const useTasks = (enabled: boolean) =>
  useResource(enabled ? 'classroom' : null, fetchPendingTasks, 20);

type Holiday = { date: string; name: string };
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

export const classroomLinked = () => classroom.linked;
