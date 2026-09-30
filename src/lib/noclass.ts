// Explica por que uma aula do horário não tem registro no SUAP.
import { isoDay, parseDay } from './dates';
import { aulaMatchesSubject, type Aula, type Calendario, type Evento, type Subject } from './suap';
import type { Holiday } from './insights';

type Input = {
  subject: Subject;
  date: string; // yyyy-mm-dd
  subjects: Subject[];
  aulas?: Aula[];
  holidays?: Holiday[];
  cal?: Calendario | null;
  eventos?: Evento[];
};

/** Eventos longos (inscrições abertas por semanas etc.) não explicam uma aula perdida. */
const MAX_EVENT_DAYS = 3;

function eventOn(eventos: Evento[] | undefined, date: string) {
  return eventos?.find((e) => {
    const a = parseDay(e.inicio);
    const b = parseDay(e.fim) ?? a;
    if (!a || !b) return false;
    return isoDay(a) <= date && date <= isoDay(b) && (b.getTime() - a.getTime()) / 86_400_000 < MAX_EVENT_DAYS;
  });
}

/** Dia fora do semestre ou entre uma etapa e a seguinte (recesso). */
function calendarGap(cal: Calendario | null | undefined, date: string): string | null {
  if (!cal) return null;
  const start = parseDay(cal.data_inicio);
  const end = parseDay(cal.data_fim);
  if (start && end && (date < isoDay(start) || date > isoDay(end))) return 'Fora do período letivo do calendário acadêmico.';

  const stages = ([1, 2, 3, 4] as const)
    .map((n) => [parseDay(cal[`data_inicio_etapa_${n}`]), parseDay(cal[`data_fim_etapa_${n}`])] as const)
    .filter((r): r is readonly [Date, Date] => !!r[0] && !!r[1]);
  for (let i = 0; i < stages.length - 1; i++) {
    if (date > isoDay(stages[i][1]) && date < isoDay(stages[i + 1][0])) return 'Recesso entre etapas, segundo o calendário acadêmico.';
  }
  return null;
}

export function noRecordReason({ subject, date, subjects, aulas, holidays, cal, eventos }: Input): string {
  const holiday = holidays?.find((h) => h.date === date);
  if (holiday) return `Feriado: ${holiday.name}.`;

  const gap = calendarGap(cal, date);
  if (gap) return gap;

  const event = eventOn(eventos, date);
  if (event) return `Tinha "${event.nome}" no campus nesse dia, o que pode ter suspendido a aula.`;

  const others = subjects.some((s) => s.code !== subject.code && aulas?.some((a) => a.data === date && aulaMatchesSubject(a, s)));
  if (others) return 'O SUAP lançou outras aulas desse dia, mas não esta: o professor ainda não registrou, ou a aula não aconteceu.';

  return 'Nenhuma aula do dia foi lançada no SUAP: pode ter sido um dia sem aula, ou os professores ainda não registraram.';
}
