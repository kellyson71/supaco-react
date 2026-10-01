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
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface-container-high text-on-surface sm:max-w-lg sm:rounded-[28px]">
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

        <div className="flex flex-col gap-3 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {events.map((e) => (
            <p key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-container-highest px-3.5 py-2.5 text-sm"><Icon name="apartment" size={18} className="text-primary" />Evento no campus: <b className="font-semibold">{e.nome}</b></p>
          ))}

          {dayAulas.map((a) => <LessonCard key={a.id} a={a} aulas={aulas} subjects={subjects} />)}

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

function Row({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
      <dt className="w-28 shrink-0 text-sm text-on-surface-variant">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}

function LessonCard({ a, aulas, subjects }: { a: Aula; aulas: Aula[]; subjects: Subject[] }) {
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
      <div className={cx('flex items-start gap-3 px-4 py-3', absent ? 'bg-error-container text-on-error-container' : cx(t.container, t.onContainer))}>
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-6 font-semibold">{s?.name ?? cleanName(a.disciplina)}</p>
          {s?.sigla && <p className="text-xs opacity-80">{s.sigla}</p>}
        </div>
        {absent
          ? <Badge className="bg-white/50 !text-current dark:bg-black/25"><Icon name="cancel" size={14} fill />{plural(a.faltas, 'falta', 'faltas')}</Badge>
          : <Badge className="bg-white/50 !text-current dark:bg-black/25"><Icon name="check_circle" size={14} fill />presente</Badge>}
      </div>

      <div className="px-4 pt-3">
        <p className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">Conteúdo</p>
        <p className="mt-1 text-[15px] leading-6 whitespace-pre-line">{a.conteudo?.trim() || 'Sem conteúdo informado pelo professor.'}</p>
      </div>

      <dl className="divide-y divide-outline-variant/50 px-4 py-1">
        {teacher && <Row icon="person" label="Professor">{titleCase(teacher)}</Row>}
        <Row icon="schedule" label="Horário">
          {slots.length ? slots.map((sl) => `${sl.start} – ${sl.end}`).join(' · ') : 'Fora do horário fixo (reposição ou ajuste)'}
          <span className="text-on-surface-variant"> · {plural(a.qtd_aulas, 'aula', 'aulas')} de 45 min</span>
        </Row>
        {(slots[0]?.room || s?.rooms[0]) && <Row icon="location_on" label="Local">{slots[0]?.room || s?.rooms.join(' · ')}</Row>}
        <Row icon="flag" label="Etapa">{a.etapa || '—'}{sameEtapa.length > 0 && <span className="text-on-surface-variant"> · {plural(sameEtapa.length, 'aula lançada', 'aulas lançadas')} nela</span>}</Row>
        {idx >= 0 && (
          <Row icon="format_list_numbered" label="Posição">
            {a.qtd_aulas > 1 ? `Aulas ${firstNo} a ${lastNo}` : `Aula ${firstNo}`} da matéria no semestre
            {s && <span className="text-on-surface-variant"> · carga horária de {s.workload} aulas</span>}
          </Row>
        )}
        {idx >= 0 && (
          <Row icon="how_to_reg" label="Até este dia">
            {plural(totalFaltas, 'falta', 'faltas')} em {plural(totalAulas, 'aula', 'aulas')}
            <span className="text-on-surface-variant"> · {Math.round(((totalAulas - totalFaltas) / Math.max(totalAulas, 1)) * 100)}% de presença</span>
          </Row>
        )}
        {s && (
          <Row icon="monitoring" label="Hoje na matéria">
            {s.absences} de {s.limit} {s.limit === 1 ? 'falta permitida' : 'faltas permitidas'}
            <span className="text-on-surface-variant"> · frequência {Math.round(s.attendance)}% · {s.workloadDone} de {s.workload} aulas dadas</span>
          </Row>
        )}
        {check?.registeredAt && (
          <Row icon="fact_check" label="Registro">
            Aula vista no SUAP às {hhmm(check.registeredAt)}{check.absentAt ? `, falta vista às ${hhmm(check.absentAt)}` : ''}
          </Row>
        )}
        <Row icon="tag" label="ID no SUAP"><span className="tabular">{a.id}</span></Row>
      </dl>

      {materiais.length > 0 && (
        <div className="px-4 pb-3">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-on-surface-variant uppercase">Materiais deste dia</p>
          <ul className="flex flex-col gap-1.5">
            {materiais.map((x) => (
              <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer" className="state flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-sm"><Icon name="attach_file" size={18} className="text-primary" /><span className="min-w-0 flex-1 truncate">{x.descricao || 'Material'}</span><Icon name="open_in_new" size={16} className="opacity-60" /></a></li>
            ))}
          </ul>
        </div>
      )}

      <details className="border-t border-outline-variant/50 px-4 py-2.5 text-xs text-on-surface-variant">
        <summary className="cursor-pointer select-none">Dados brutos do SUAP</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-container p-3 text-[11px] leading-5 text-on-surface">{JSON.stringify({ ...a, ...(diaryEntry ? { diario: diaryEntry } : {}) }, null, 2)}</pre>
      </details>
    </article>
  );
}
