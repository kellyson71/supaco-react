import type { Avaliacao, Evento } from './suap';
import { cleanName } from './suap';
import type { Task } from './classroom';
import { isoDay, parseDay } from './dates';

export type Deadline = {
  id: string;
  source: 'suap' | 'classroom' | 'campus';
  title: string;
  subject: string;
  date: Date | null;
  hasTime: boolean;
  link?: string;
  late?: boolean;
  detail?: string;
};

const TIPO: Record<string, string> = { P: 'Prova', T: 'Trabalho', S: 'Seminário', A: 'Avaliação' };

const at = (day: string, hm: string | null) => {
  const d = parseDay(day);
  if (d && hm) { const [h, m] = hm.split(':').map(Number); d.setHours(h, m); }
  return d;
};

export function buildDeadlines(avaliacoes: Avaliacao[] = [], tasks: Task[] = [], eventos: Evento[] = []): Deadline[] {
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
  const campus = eventos.flatMap((e): Deadline[] => {
    const closing = e.inscricoes.map((i) => i.ate).sort()[0];
    return [
      // Evento em andamento (começou antes e ainda não acabou) fica em "hoje", não em atrasados
      e.inicio < isoDay()
        ? { id: `ev-${e.id}`, source: 'campus', title: e.nome, subject: `Acontecendo até ${parseDay(e.fim)?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`, date: new Date(), hasTime: false, link: e.link }
        : { id: `ev-${e.id}`, source: 'campus', title: e.nome, subject: e.local ? `Campus · ${e.local}` : 'Evento no campus', date: at(e.inicio, e.horaInicio), hasTime: !!e.horaInicio, link: e.link },
      // O fim das inscrições também é um prazo
      ...(closing && closing < e.inicio ? [{ id: `ev-insc-${e.id}`, source: 'campus' as const, title: `Inscrições: ${e.nome}`, subject: 'Último dia para se inscrever', date: parseDay(closing), hasTime: false, link: e.link }] : []),
    ];
  });
  return [...suap, ...gc, ...campus].sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
}
