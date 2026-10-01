// Hooks de dados compartilhados pelas telas + período letivo selecionado.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useResource } from './store';
import { api, aulaMatchesSubject, type Calendario, type Parcial, type Periodo, type Turma } from './suap';
import { isoDay, parseDay } from './dates';
import { fetchPendingTasks } from './classroom';
import type { Holiday } from './insights';
import { withPartials } from './grades';

export const useEu = () => useResource('eu', api.eu, 24 * 60);
export const useAluno = () => useResource('aluno', api.aluno, 24 * 60);
export const useRequisitos = () => useResource('requisitos', api.requisitos, 12 * 60);
export const usePeriodos = () => useResource('periodos', api.periodos, 24 * 60);
export const useAvaliacoes = () => useResource('avaliacoes', api.avaliacoes, 60);
export const useMensagens = () => useResource('mensagens', api.mensagens, 30);

const useDisciplinasRaw = (p: Periodo | undefined) =>
  useResource(p ? `disciplinas:${p.label}` : null, () => api.disciplinas(p!), 30);

/** Matérias do período, com a etapa aberta contada pela média parcial (marcada em `partial`). */
export function useDisciplinas(p: Periodo | undefined) {
  const raw = useDisciplinasRaw(p);
  const { data: parciais } = useParciais(p);
  const data = useMemo(() => (raw.data && parciais ? withPartials(raw.data, parciais) : raw.data), [raw.data, parciais]);
  return { ...raw, data };
}
export const useFrequencia = (p: Periodo | undefined) =>
  useResource(p ? `frequencia:${p.label}` : null, () => api.frequencia(p!), 60);
export const useTurma = (code: string | undefined) =>
  useResource(code ? `turma:${code}` : null, () => api.turma(code!), 12 * 60);
/** Notas parciais de cada matéria do período (vazio se o SUAP não liberar). */
export function useParciais(p: Periodo | undefined) {
  const { data: subjects } = useDisciplinasRaw(p);
  return useResource(p && subjects ? `parciais:${p.label}` : null, () => api.parciais(p!, subjects!).catch((): Record<string, Parcial[]> => ({})), 60);
}
/** Professor de cada aula do diário; some em silêncio se o SUAP não liberar. */
export const useAulasDiario = (code: string | undefined) =>
  useResource(code ? `aulasdiario:${code}` : null, () => api.aulasDiario(code!).catch(() => []), 60);
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
/** Turmas de várias matérias (para saber em quais você divide sala com alguém). */
export function useTurmas(codes: string[] | undefined) {
  const key = codes?.length ? `turmas:${[...codes].sort().join(',')}` : null;
  return useResource(key, async () => {
    const list = await Promise.all(codes!.map(async (c) => [c, await api.turma(c).catch(() => null)] as const));
    return Object.fromEntries(list.filter(([, t]) => t)) as Record<string, Turma>;
  }, 12 * 60);
}
export const useCalendario = (p: Periodo | undefined) =>
  useResource(p ? `calendario:${p.label}` : null, () => api.calendario(p!).catch(() => null), 24 * 60);

/** Início e fim do semestre: pelo calendário acadêmico, ou uma estimativa se o SUAP não tiver calendário. */
function semesterRange(p: Periodo, cal: Calendario | null) {
  const start = parseDay(cal?.data_inicio) ?? new Date(p.ano, p.periodo === 1 ? 1 : 7, 1);
  const end = parseDay(cal?.data_fim) ?? new Date(p.ano, p.periodo === 1 ? 6 : 11, 31);
  return { start: isoDay(start), end: isoDay(end) };
}

/**
 * Aulas lançadas no semestre, só das matérias do período.
 * O minhas-aulas é por mês e mistura semestres (julho traz aulas do período anterior),
 * então espera o calendário para saber o intervalo e ainda filtra por data e matéria.
 */
export function useAulas(p: Periodo | undefined) {
  const cal = useCalendario(p);
  const subjects = useDisciplinas(p);
  const calReady = cal.data !== undefined || !!cal.error;
  const range = p && calReady ? semesterRange(p, cal.data ?? null) : null;

  const raw = useResource(p && range ? `aulas:v3:${p.label}:${range.start}` : null, async () => {
    const [sy, sm] = range!.start.split('-').map(Number);
    const last = new Date(Math.min(Date.now(), parseDay(range!.end)!.getTime()));
    const months: [number, number][] = [];
    for (let d = new Date(sy, sm - 1, 1); d <= last && months.length < 7; d.setMonth(d.getMonth() + 1)) {
      months.push([d.getFullYear(), d.getMonth() + 1]);
    }
    // Sem .catch por mês: um mês faltando daria totais errados; melhor falhar e manter o último dado bom
    const lists = await Promise.all(months.map(([y, m]) => api.aulas(y, m)));
    return lists.flat().sort((a, b) => (b.data > a.data ? 1 : -1));
  }, 60);

  const data = useMemo(() => {
    if (!raw.data || !range || !subjects.data) return undefined;
    return raw.data.filter((a) => a.data >= range.start && a.data <= range.end && subjects.data!.some((s) => aulaMatchesSubject(a, s)));
  }, [raw.data, range?.start, range?.end, subjects.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...raw, data, loading: !data && !raw.error, range };
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

