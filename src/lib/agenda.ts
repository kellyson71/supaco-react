import type { Avaliacao } from './suap';
import { cleanName } from './suap';
import type { Task } from './classroom';
import { parseDay } from './dates';

export type Deadline = {
  id: string;
  source: 'suap' | 'classroom';
  title: string;
  subject: string;
  date: Date | null;
  hasTime: boolean;
  link?: string;
  late?: boolean;
  detail?: string;
};

const TIPO: Record<string, string> = { P: 'Prova', T: 'Trabalho', S: 'Seminário', A: 'Avaliação' };

export function buildDeadlines(avaliacoes: Avaliacao[] = [], tasks: Task[] = []): Deadline[] {
  const suap = avaliacoes.map((a, i): Deadline => ({
    id: `suap-${a.id ?? i}`,
    source: 'suap',
    title: a.descricao || TIPO[a.tipo] || a.tipo || 'Avaliação',
    subject: cleanName(a.diario || ''),
    date: a.data ? parseDay(a.data) : null,
    hasTime: false,
    detail: [a.sigla, a.etapa && `${a.etapa}ª etapa`, a.peso ? `peso ${a.peso}` : null].filter(Boolean).join(' · '),
  }));
  const gc = tasks.map((t): Deadline => ({
    id: `gc-${t.id}`,
    source: 'classroom',
    title: t.title,
    subject: t.course,
    date: t.due ? new Date(t.due) : null,
    hasTime: true,
    link: t.link,
    late: t.late,
  }));
  return [...suap, ...gc].sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
}
