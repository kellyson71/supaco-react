import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'motion/react';
import { useAulasDiario, useCalendario, useCampus, useEu, useHolidays, usePeriod, useTurma } from '../lib/data';
import { attendanceFor, useAttendance } from '../lib/attendance';
import { noRecordReason } from '../lib/noclass';
import { classesOn } from '../lib/schedule';
import { isoDay, longDate, parseDay, time } from '../lib/dates';
import { aulaMatchesSubject, cleanName, subjectTone, titleCase, type Aula, type Calendario, type Subject } from '../lib/suap';
import { TONES } from '../lib/tones';
import { Badge, cx, EMPHASIZED, Icon } from './ui';
import { Link } from './Link';

type Props = {
  date: string;
  /** Todas as aulas lançadas no semestre (para somar faltas e contar a posição da aula). */
  aulas: Aula[];
  subjects: Subject[];
  /** Mostra só esta aula (histórico da matéria); sem isso, mostra todas as do dia (mapa de presença). */
  only?: Aula;
  onClose: () => void;
};

const hhmm = (ts?: number) => (ts ? time(new Date(ts)) : '');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Em que etapa do calendário acadêmico o dia cai. */
function stageOn(cal: Calendario | null | undefined, date: string) {
  if (!cal) return null;
  for (const n of [1, 2, 3, 4] as const) {
    const a = parseDay(cal[`data_inicio_etapa_${n}`]);
    const b = parseDay(cal[`data_fim_etapa_${n}`]);
    if (a && b && isoDay(a) <= date && date <= isoDay(b)) return `${n}ª etapa`;
  }
  const fa = parseDay(cal.data_inicio_prova_final);
  const fb = parseDay(cal.data_fim_prova_final);
  if (fa && fb && isoDay(fa) <= date && date <= isoDay(fb)) return 'Prova final';
  return null;
}

/** Folha com tudo que o SUAP e o app sabem sobre as aulas de um dia (ou de uma aula só). */
export function LessonSheet({ date, aulas, subjects, only, onClose }: Props) {
  const { current } = usePeriod();
  const { data: cal } = useCalendario(current);
  const { data: holidays } = useHolidays();
  const { data: eu } = useEu();
  const { data: campus } = useCampus(eu?.campus);
  const closeRef = useRef<HTMLButtonElement>(null);
  const day = parseDay(date);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const dayAulas = useMemo(() => (only ? [only] : aulas.filter((a) => a.data === date)), [aulas, date, only]);
  const holiday = holidays?.find((h) => h.date === date);
  const stage = stageOn(cal, date);
  const events = (campus?.eventos ?? []).filter((e) => {
    const a = parseDay(e.inicio);
    const b = parseDay(e.fim) ?? a;
    return a && b && isoDay(a) <= date && date <= isoDay(b) && (b.getTime() - a.getTime()) / 86_400_000 < 3;
  });

  // Dia sem aula lançada: mostra o que o horário previa e o provável motivo
  const scheduled = day && !dayAulas.length ? classesOn(subjects, day.getDay()) : [];
  const past = date <= isoDay();

  const total = dayAulas.reduce((n, a) => n + a.qtd_aulas, 0);
  const faltas = dayAulas.reduce((n, a) => n + a.faltas, 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={day ? longDate(day) : date}>
      <m.div className="absolute inset-0 bg-black/50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} />
      <m.div
        initial={{ opacity: 0, y: 48, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: EMPHASIZED }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-container-high text-on-surface sm:max-w-lg sm:rounded-xl">
        <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-outline-variant sm:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-6 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">{only ? 'Detalhes da aula' : 'Aulas do dia'}</p>
            <h2 className="mt-0.5 text-2xl leading-8 font-semibold tracking-tight first-letter:uppercase">{day ? longDate(day) : date}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dayAulas.length > 0 && <Badge>{plural(total, 'aula', 'aulas')}</Badge>}
              {dayAulas.length > 0 && (faltas > 0
                ? <Badge tone="error"><Icon name="cancel" size={14} fill />{plural(faltas, 'falta', 'faltas')}</Badge>
                : <Badge tone="success"><Icon name="check_circle" size={14} fill />presente</Badge>)}
              {stage && <Badge>{stage}</Badge>}
              {holiday && <Badge tone="warning"><Icon name="celebration" size={14} />{holiday.name}</Badge>}
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Fechar" className="state flex size-10 shrink-0 items-center justify-center rounded-full"><Icon name="close" /></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {events.map((e) => (
            <p key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-container-highest px-3.5 py-2.5 text-sm"><Icon name="apartment" size={18} className="text-primary" />Evento no campus: <b className="font-semibold">{e.nome}</b></p>
          ))}

          {dayAulas.map((a) => <LessonCard key={a.id} a={a} aulas={aulas} subjects={subjects} onOpenSubject={onClose} />)}

          {!dayAulas.length && (
            scheduled.length > 0 && past ? (
              <>
                <p className="text-sm text-on-surface-variant">Nenhuma aula foi lançada no SUAP neste dia, mas o seu horário previa:</p>
                {scheduled.map((c) => {
                  const s = subjects.find((x) => x.code === c.code);
                  return (
                    <div key={c.code + c.start} className="rounded-2xl bg-surface-container-highest p-4 text-sm">
                      <p className="flex items-center gap-2 font-medium"><span className={cx('size-2.5 rounded-full', TONES[s ? subjectTone(s) : 'teal'].color)} />{c.subject}</p>
                      <p className="mt-1 text-on-surface-variant tabular">{c.start} – {c.end} · {plural(c.lessons, 'aula', 'aulas')}{c.room && ` · ${c.room}`}</p>
                      {s && <p className="mt-2 text-on-surface-variant">{noRecordReason({ subject: s, date, subjects, aulas, holidays, cal, eventos: campus?.eventos })}</p>}
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-surface-container-highest px-3.5 py-3 text-sm text-on-surface-variant">
                <Icon name="event_busy" size={20} />
                {holiday ? `Feriado: ${holiday.name}.` : day && (day.getDay() === 0 || day.getDay() === 6) ? 'Fim de semana, sem aula.' : past ? 'Sem aula neste dia.' : 'Dia ainda sem aulas lançadas.'}
              </p>
            )
          )}
        </div>
      </m.div>
    </div>,
    document.body,
  );
}

function Tile({ icon, label, wide, children }: { icon: string; label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cx('rounded-xl bg-surface-container px-3 py-2.5', wide && 'col-span-2')}>
      <p className="flex items-center gap-1.5 text-xs text-on-surface-variant"><Icon name={icon} size={16} />{label}</p>
      <p className="mt-1 text-sm leading-5">{children}</p>
    </div>
  );
}

function LessonCard({ a, aulas, subjects, onOpenSubject }: { a: Aula; aulas: Aula[]; subjects: Subject[]; onOpenSubject: () => void }) {
  const s = subjects.find((x) => aulaMatchesSubject(a, x));
  const { data: diario } = useAulasDiario(s?.code);
  const { data: turma } = useTurma(s?.code);
  const checks = useAttendance();
  const day = parseDay(a.data);

  const diaryEntry = diario?.find((d) => d.data === a.data && (!d.conteudo || d.conteudo.trim() === a.conteudo?.trim())) ?? diario?.find((d) => d.data === a.data);
  const teacher = diaryEntry?.professor ?? turma?.professores[0]?.nome;
  const slots = day && s ? s.slots.filter((sl) => sl.day === day.getDay()) : [];
  const materiais = (turma?.materiais ?? []).filter((x) => { const d = parseDay(x.data); return d && isoDay(d) === a.data; });
  const check = s ? attendanceFor(s.code, a.data, checks) : undefined;

  // Posição da aula na matéria e o acumulado até aqui
  const mine = useMemo(() => (s ? aulas.filter((x) => aulaMatchesSubject(x, s)) : []).sort((x, y) => x.data.localeCompare(y.data) || x.id - y.id), [aulas, s]);
  const idx = mine.findIndex((x) => x.id === a.id);
  const before = idx > 0 ? mine.slice(0, idx) : [];
  const firstNo = before.reduce((n, x) => n + x.qtd_aulas, 0) + 1;
  const lastNo = firstNo + a.qtd_aulas - 1;
  const totalFaltas = [...before, a].reduce((n, x) => n + x.faltas, 0);
  const totalAulas = [...before, a].reduce((n, x) => n + x.qtd_aulas, 0);
  const sameEtapa = mine.filter((x) => x.etapa === a.etapa);

  const absent = a.faltas > 0;
  const t = TONES[s ? subjectTone(s) : 'teal'];

  return (
    <article className="overflow-hidden rounded-2xl bg-surface-container-highest">
      {(() => {
        const head = (
          <div className={cx('flex items-center gap-3 px-4 py-3', absent ? 'bg-error-container text-on-error-container' : cx(t.container, t.onContainer))}>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-6 font-semibold">{s?.name ?? cleanName(a.disciplina)}</p>
              {s?.sigla && <p className="text-xs opacity-80">{s.sigla}</p>}
            </div>
            {absent
              ? <Badge className="bg-white/50 !text-current dark:bg-black/25"><Icon name="cancel" size={14} fill />{plural(a.faltas, 'falta', 'faltas')}</Badge>
              : <Badge className="bg-white/50 !text-current dark:bg-black/25"><Icon name="check_circle" size={14} fill />presente</Badge>}
            {s && <Icon name="chevron_right" size={22} className="opacity-70" />}
          </div>
        );
        // Clicar na matéria abre a página dela (e fecha a folha)
        return s ? <div onClick={onOpenSubject}><Link to={`/disciplinas/${s.code}`} label={`Abrir ${s.name}`} className="state block">{head}</Link></div> : head;
      })()}

      <div className="px-4 pt-3">
        <p className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">Conteúdo</p>
        <p className="mt-1 text-[15px] leading-6 whitespace-pre-line">{a.conteudo?.trim() || 'Sem conteúdo informado pelo professor.'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        {teacher && <Tile icon="person" label="Professor" wide>{titleCase(teacher)}</Tile>}
        <Tile icon="schedule" label="Horário">
          {slots.length ? slots.map((sl) => `${sl.start} – ${sl.end}`).join(' · ') : 'Fora do horário fixo'}
          <span className="block text-xs text-on-surface-variant">{plural(a.qtd_aulas, 'aula', 'aulas')} de 45 min</span>
        </Tile>
        {(slots[0]?.room || s?.rooms[0]) ? <Tile icon="location_on" label="Local">{slots[0]?.room || s?.rooms.join(' · ')}</Tile> : null}
        <Tile icon="flag" label="Etapa">
          {a.etapa || '—'}
          {sameEtapa.length > 0 && <span className="block text-xs text-on-surface-variant">{plural(sameEtapa.length, 'aula lançada', 'aulas lançadas')}</span>}
        </Tile>
        {idx >= 0 && (
          <Tile icon="format_list_numbered" label="Posição">
            {a.qtd_aulas > 1 ? `Aulas ${firstNo} a ${lastNo}` : `Aula ${firstNo}`}
            {s && <span className="block text-xs text-on-surface-variant">de {s.workload} no semestre</span>}
          </Tile>
        )}
        {idx >= 0 && (
          <Tile icon="how_to_reg" label="Até este dia">
            {plural(totalFaltas, 'falta', 'faltas')} em {plural(totalAulas, 'aula', 'aulas')}
            <span className="block text-xs text-on-surface-variant">{Math.round(((totalAulas - totalFaltas) / Math.max(totalAulas, 1)) * 100)}% de presença</span>
          </Tile>
        )}
        {s && (
          <Tile icon="monitoring" label="Hoje na matéria" wide>
            {s.absences} de {s.limit} {s.limit === 1 ? 'falta permitida' : 'faltas permitidas'}
            <span className="block text-xs text-on-surface-variant">frequência {Math.round(s.attendance)}% · {s.workloadDone} de {s.workload} aulas dadas</span>
          </Tile>
        )}
      </div>

      {materiais.length > 0 && (
        <div className="px-4 pb-4">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-on-surface-variant uppercase">Materiais deste dia</p>
          <ul className="flex flex-col gap-1.5">
            {materiais.map((x) => (
              <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer" className="state flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-sm"><Icon name="attach_file" size={18} className="text-primary" /><span className="min-w-0 flex-1 truncate">{x.descricao || 'Material'}</span><Icon name="open_in_new" size={16} className="opacity-60" /></a></li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-outline-variant/50 px-4 py-2.5 text-xs text-on-surface-variant">
        {check?.registeredAt ? `Aula vista no SUAP às ${hhmm(check.registeredAt)}${check.absentAt ? `, falta às ${hhmm(check.absentAt)}` : ''} · ` : ''}ID no SUAP <span className="tabular">{a.id}</span>
      </p>
    </article>
  );
}
