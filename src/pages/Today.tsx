import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useAvaliacoes, useCalendario, useCampus, useCurrentSubjects, useEu, useFrequencia, useHolidays, useMensagens, usePeriod, useTasks, useTurma } from '../lib/data';
import { diffNews, loadSnapshot, saveSnapshot, type NewsItem } from '../lib/news';
import { classroom } from '../lib/classroom';
import { classesOn, formatDuration, nowMin, toMin, WEEKDAYS, WEEKDAYS_SHORT, type ClassItem } from '../lib/schedule';
import { absenceLevel, outlook, overallAverage, PASS } from '../lib/grades';
import { canSkip, currentStage, nextHoliday, type SkipVerdict } from '../lib/insights';
import { attendanceFor, markEnded, pollLive, recheckPending, useAttendance, type AttendanceCheck } from '../lib/attendance';
import { noRecordReason } from '../lib/noclass';
import { buildDeadlines, type Deadline } from '../lib/agenda';
import { daysBetween, isoDay, longDate, relativeDay, time, timeAgo } from '../lib/dates';
import { useNow } from '../lib/hooks';
import { aulaMatchesSubject, shortName, subjectTone, type Aula, type Subject } from '../lib/suap';
import { TONES, toneFor, type Tone } from '../lib/tones';
import { AbsenceMeter, Badge, Button, Card, Chip, CountUp, cx, EMPHASIZED, Empty, ErrorNote, Icon, Item, Ring, SectionHeader, Shape, Skeleton, Stagger, Tap } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { Highlights } from '../components/Highlights';
import { MemeCard, VibePrompt } from '../components/Memes';
import { useVibe } from '../lib/vibe';

const greeting = (h: number) => (h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');
const greetingZueira = (h: number) => (h < 5 ? 'Vai dormir' : h < 12 ? 'Acorda' : h < 18 ? 'Fala' : 'E aí');

export function Today() {
  const now = useNow();
  const { data: eu } = useEu();
  const res = useCurrentSubjects();
  const subjects = res.data;
  const { data: holidays } = useHolidays();
  const holiday = holidays?.find((h) => h.date === isoDay(now));
  const first = eu ? eu.primeiro_nome || eu.nome_usual.split(' ')[0] : '';
  useAttendanceWatch(subjects, now);
  const zueira = useVibe().tone === 'zueira';

  // Atalho do app "Posso faltar?" abre em /#posso-faltar
  useEffect(() => {
    if (subjects && window.location.hash === '#posso-faltar') document.getElementById('posso-faltar')?.scrollIntoView({ behavior: 'smooth' });
  }, [subjects]);

  return (
    <>
      <header className="mt-2 mb-6 flex items-center gap-4 md:mt-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-on-surface-variant first-letter:uppercase">{longDate(now)}</p>
          <h1 className="mt-1 text-[32px] leading-10 font-semibold tracking-tight md:text-[45px] md:leading-[52px]">
            {(zueira ? greetingZueira : greeting)(now.getHours())}{first && <>, <span className="text-primary">{first}</span></>}
          </h1>
        </div>
        <span className="hidden md:block"><Avatar size={48} /></span>
      </header>

      {res.error && !subjects && <div className="mb-4"><ErrorNote error={res.error} onRetry={res.refresh} /></div>}

      <VibePrompt />
      {subjects && <News subjects={subjects} />}
      {subjects && <MemeCard subjects={subjects} now={now} holiday={!!holiday} />}

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Item className="md:col-span-2 xl:col-span-7 xl:row-span-2">
          {subjects ? <NowCard subjects={subjects} now={now} holiday={holiday?.name} /> : <Skeleton className="h-80" />}
        </Item>
        <Item className="md:col-span-1 xl:col-span-5">
          <div id="posso-faltar" className="h-full scroll-mt-20">{subjects ? <SkipCard subjects={subjects} now={now} /> : <Skeleton className="h-72" />}</div>
        </Item>
        <Item className="md:col-span-1 xl:col-span-5"><Stats subjects={subjects} now={now} /></Item>
        <Item className="xl:col-span-4">{subjects && <DayList subjects={subjects} now={now} />}</Item>
        <Item className="xl:col-span-4">{subjects && <Attention subjects={subjects} />}</Item>
        <Item className="md:col-span-2 xl:col-span-4"><Deadlines /></Item>
      </Stagger>

      {subjects && <div className="mt-6"><Highlights subjects={subjects} /></div>}
    </>
  );
}

// ---------- Confere falta depois que a aula termina ----------

/** Assim que uma aula termina, marca "aguardando" e reconfere no SUAP até saber se virou falta. */
function useAttendanceWatch(subjects: Subject[] | undefined, now: Date) {
  const aulas = useSemesterAulas();
  useEffect(() => {
    if (!subjects) return;
    const date = isoDay(now);
    const mm = nowMin(now);
    const today = classesOn(subjects, now.getDay());
    today.filter((c) => toMin(c.end) <= mm).forEach((c) => markEnded(c.code, c.subject, date));
    // Aula em andamento: vigia o registro da chamada e as faltas; se mudou, atualiza o histórico de aulas
    const live = today.filter((c) => toMin(c.start) <= mm && mm < toMin(c.end));
    if (live.length) pollLive(subjects, live, date).then((changed) => changed && aulas.refresh());
    recheckPending(subjects).then((changed) => changed && aulas.refresh());
  }, [subjects, now]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------- Agora / próxima aula ----------

function nextSchoolDay(subjects: Subject[], from: Date) {
  for (let i = 1; i <= 7; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const list = classesOn(subjects, d.getDay());
    if (list.length) return { date: d, first: list[0] };
  }
  return null;
}

function NowCard({ subjects, now, holiday }: { subjects: Subject[]; now: Date; holiday?: string }) {
  const byCode = useMemo(() => new Map(subjects.map((s) => [s.code, s])), [subjects]);
  const today = holiday ? [] : classesOn(subjects, now.getDay());
  const mm = nowMin(now);
  const current = today.find((c) => toMin(c.start) <= mm && mm < toMin(c.end));
  const next = today.find((c) => toMin(c.start) > mm);
  const toneOf = (c: ClassItem): Tone => { const s = byCode.get(c.code); return s ? subjectTone(s) : toneFor(c.code); };

  if (current) {
    const p = (mm - toMin(current.start)) / (toMin(current.end) - toMin(current.start));
    return (
      <ClassHero item={current} tone={toneOf(current)} label="Aula agora" live>
        <Dial progress={p} center={formatDuration(toMin(current.end) - mm)} caption="para acabar" />
        <LiveStatus item={current} subject={byCode.get(current.code)} now={now} />
        <History subjects={subjects} now={now} />
        {next && <NextUp item={next} />}
      </ClassHero>
    );
  }
  if (next) {
    const wait = toMin(next.start) - mm;
    const after = today.find((c) => toMin(c.start) > toMin(next.start));
    return (
      <ClassHero item={next} tone={toneOf(next)} label={wait <= 120 ? `Começa em ${formatDuration(wait)}` : `Próxima aula às ${next.start}`}>
        <div className="mt-8 flex items-end gap-3">
          <span className="text-[64px] leading-none font-semibold tracking-tight tabular">{wait <= 120 ? formatDuration(wait) : next.start}</span>
          <span className="mb-2 text-sm font-medium opacity-80">{wait <= 120 ? 'até começar' : 'é a próxima'}</span>
        </div>
        <History subjects={subjects} now={now} />
        {after && <NextUp item={after} />}
      </ClassHero>
    );
  }

  const upcoming = nextSchoolDay(subjects, now);
  return (
    <Card variant="filled" className="relative flex h-full min-h-72 flex-col overflow-hidden rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-4">
        <Shape shape="flower" size={52} className="text-tertiary-container"><Icon name={holiday ? 'celebration' : 'weekend'} size={26} className="text-on-tertiary-container" fill /></Shape>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-on-surface-variant">{holiday ? 'Feriado' : today.length ? 'Por hoje é só' : 'Dia livre'}</p>
          <p className="text-[28px] leading-9 font-semibold tracking-tight">{holiday ?? (today.length ? 'Aulas encerradas' : 'Sem aulas hoje')}</p>
        </div>
      </div>
      {upcoming && (
        <p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name="arrow_forward" size={18} className="text-primary" />
          <span>Próxima: <b className="font-semibold text-on-surface">{upcoming.first.subject}</b> · {daysBetween(now, upcoming.date) === 1 ? 'amanhã' : WEEKDAYS[upcoming.date.getDay()].toLowerCase()} às {upcoming.first.start}</span>
        </p>
      )}
      <Recap subjects={subjects} now={now} />
    </Card>
  );
}

/** Aulas registradas de uma matéria num dia (o SUAP às vezes lança em mais de uma linha). */
function lessonOn(aulas: Aula[] | undefined, s: Subject, date: string) {
  const list = (aulas ?? []).filter((a) => a.data === date && aulaMatchesSubject(a, s));
  if (!list.length) return null;
  return {
    conteudo: [...new Set(list.map((a) => a.conteudo?.trim()).filter(Boolean))].join(' · '),
    qtd: list.reduce((n, a) => n + a.qtd_aulas, 0),
    faltas: list.reduce((n, a) => n + a.faltas, 0),
  };
}

function useSemesterAulas() {
  const { current } = usePeriod();
  return useAulas(current);
}

type LessonState = 'present' | 'absent' | 'none';

/** Junta o que o SUAP lançou no mês com a conferência feita pelo app (mais fresca durante a aula). */
function lessonState(lesson: ReturnType<typeof lessonOn>, check?: AttendanceCheck): { state: LessonState; faltas: number } {
  const faltas = Math.max(lesson?.faltas ?? 0, check?.faltas ?? 0);
  if (faltas > 0 || check?.status === 'absent') return { state: 'absent', faltas: Math.max(faltas, 1) };
  if (lesson || check?.status === 'present') return { state: 'present', faltas: 0 };
  return { state: 'none', faltas: 0 };
}

/** Motivo provável de uma aula não ter registro no SUAP, com os dados que o app já tem. */
function useReasonFor(subjects: Subject[]) {
  const { current } = usePeriod();
  const aulas = useSemesterAulas().data;
  const { data: holidays } = useHolidays();
  const { data: cal } = useCalendario(current);
  const { data: eu } = useEu();
  const { data: campus } = useCampus(eu?.campus);
  return (subject: Subject, date: string) => noRecordReason({ subject, date, subjects, aulas, holidays, cal, eventos: campus?.eventos });
}

const hhmm = (ts?: number) => (ts ? time(new Date(ts)) : '');

/** Acompanha a aula em andamento: em andamento → registrada (todos com presença) → falta lançada. */
function LiveStatus({ item, subject, now }: { item: ClassItem; subject?: Subject; now: Date }) {
  const checks = useAttendance();
  const aulas = useSemesterAulas().data;
  const { data: turma } = useTurma(item.code);
  const date = isoDay(now);
  const check = attendanceFor(item.code, date, checks);
  const { state, faltas } = lessonState(subject ? lessonOn(aulas, subject, date) : null, check);
  const prof = turma?.professores[0] ? shortName(turma.professores[0].nome).split(' ')[0] : 'o professor';

  const head = state === 'absent'
    ? { icon: 'cancel', title: 'Você recebeu falta', text: `${faltas} ${faltas === 1 ? 'falta lançada' : 'faltas lançadas'} nesta aula no SUAP.` }
    : state === 'present'
      ? { icon: 'check_circle', title: 'Você recebeu presença', text: 'Aula registrada sem falta. Fica assim até aparecer uma falta no SUAP.' }
      : { icon: 'hourglass_empty', title: 'Aguardando o registro', text: `Quando ${prof} registrar a chamada no SUAP, você já começa com presença.` };

  const steps: { label: string; hint: string; done: boolean; tone?: 'error' | 'success' }[] = [
    { label: 'Aula rolando', hint: `desde ${item.start}`, done: true },
    { label: 'Aula registrada', hint: state === 'none' ? 'aguardando' : `visto às ${hhmm(check?.registeredAt) || '—'}`, done: state !== 'none', tone: state !== 'none' ? 'success' : undefined },
    state === 'absent'
      ? { label: 'Falta lançada', hint: `visto às ${hhmm(check?.absentAt) || '—'}`, done: true, tone: 'error' }
      : { label: 'Sem falta', hint: state === 'present' ? 'até agora' : 'após o registro', done: false },
  ];

  return (
    <div className="relative rounded-2xl bg-black/10 p-3.5 dark:bg-white/10">
      <ol className="flex items-start">
        {steps.map((st, i) => (
          <li key={st.label} className="relative flex flex-1 flex-col items-center gap-1 text-center">
            {i > 0 && <span className={cx('absolute top-3.5 right-1/2 h-0.5 w-full bg-current', steps[i - 1].done && st.done ? 'opacity-70' : 'opacity-20')} />}
            <span className={cx('relative z-10 flex size-7 items-center justify-center rounded-full',
              st.tone === 'error' ? 'bg-error text-on-error' : st.tone === 'success' ? 'bg-success text-on-success' : st.done ? 'bg-white/60 dark:bg-black/30' : 'border border-current/40')}>
              <Icon name={st.tone === 'error' ? 'close' : st.done ? 'check' : 'more_horiz'} size={16} weight={600} />
            </span>
            <span className="text-xs leading-tight font-medium">{st.label}</span>
            <span className="text-[11px] leading-tight opacity-75">{st.hint}</span>
          </li>
        ))}
      </ol>
      <m.div key={state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }} className="mt-3 flex items-start gap-2.5 border-t border-current/15 pt-3">
        <Icon name={head.icon} size={22} fill className={state === 'none' ? 'animate-pulse' : undefined} />
        <div className="min-w-0">
          <p className="leading-tight font-semibold">{head.title}</p>
          <p className="mt-0.5 text-sm opacity-85">{head.text}</p>
          {check?.checkedAt ? <p className="mt-1 text-[11px] opacity-65">Conferido no SUAP às {hhmm(check.checkedAt)} · atualiza sozinho</p> : null}
        </div>
      </m.div>
    </div>
  );
}

/** Aulas de hoje que já acabaram, com o resultado de cada uma (presença, falta ou sem registro e o porquê). */
function History({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const checks = useAttendance();
  const aulas = useSemesterAulas().data;
  const reasonFor = useReasonFor(subjects);
  const date = isoDay(now);
  const mm = nowMin(now);
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const ended = classesOn(subjects, now.getDay()).filter((c) => toMin(c.end) <= mm);
  if (!ended.length) return null;

  return (
    <div className="relative rounded-2xl bg-black/10 p-3.5 dark:bg-white/10">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase opacity-80"><Icon name="history" size={16} />{ended.length === 1 ? 'Aula anterior' : 'Hoje até agora'}</p>
      <ul className="flex flex-col gap-2">
        {ended.map((c) => {
          const s = byCode.get(c.code);
          const { state, faltas } = lessonState(s ? lessonOn(aulas, s, date) : null, attendanceFor(c.code, date, checks));
          const verdict = state === 'absent'
            ? { icon: 'cancel', text: faltas === 1 ? 'Você levou falta' : `Você levou ${faltas} faltas` }
            : state === 'present' ? { icon: 'check_circle', text: 'Você recebeu presença' }
            : { icon: 'help', text: 'Aula sem registro no SUAP' };
          return (
            <li key={c.code + c.start} className="flex items-start gap-2.5 text-sm">
              <Icon name={verdict.icon} size={20} fill className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate"><b className="font-semibold">{c.subject}</b> <span className="opacity-70 tabular">· {c.start}–{c.end}</span></p>
                <p className="font-medium">{verdict.text}</p>
                {state === 'none' && s && <p className="mt-0.5 text-xs opacity-80">{reasonFor(s, date)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Resumo do que foi dado: as aulas que já acabaram hoje, ou as do último dia com aula lançada. */
function Recap({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const aulas = useSemesterAulas().data;
  const checks = useAttendance();
  const reasonFor = useReasonFor(subjects);
  const date = isoDay(now);
  const mm = nowMin(now);
  const byCode = new Map(subjects.map((s) => [s.code, s]));

  type Row = { s: Subject; day: string; lesson: ReturnType<typeof lessonOn>; check?: AttendanceCheck };
  /** Matérias do dia: as do horário mais as que o SUAP lançou nesse dia (reposição, evento, etc.). */
  const rowsFor = (day: string, scheduled: string[]): Row[] => {
    const lançadas = subjects.filter((s) => aulas?.some((a) => a.data === day && aulaMatchesSubject(a, s))).map((s) => s.code);
    return [...new Set([...scheduled, ...lançadas])]
      .map((code) => byCode.get(code))
      .filter((s): s is Subject => !!s)
      .map((s) => ({ s, day, lesson: lessonOn(aulas, s, day), check: attendanceFor(s.code, day, checks) }));
  };

  const endedToday = classesOn(subjects, now.getDay()).filter((c) => toMin(c.end) <= mm).map((c) => c.code);
  let rows = rowsFor(date, endedToday);
  let title = 'O que rolou hoje';

  if (!rows.length) {
    // Último dia com aula: pelo horário ou pelo que foi lançado (inclui aulas que o professor ainda não lançou)
    for (let i = 1; i <= 7 && !rows.length; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      rows = rowsFor(isoDay(d), classesOn(subjects, d.getDay()).map((c) => c.code));
      // Dia sem nada lançado e sem conferência (ex.: feriado) não conta como "última aula"
      if (rows.length && !rows.some((r) => r.lesson || r.check)) rows = [];
      if (rows.length) title = `Última aula · ${relativeDay(d, now)}`;
    }
  }
  if (!rows.length) return null;

  return (
    <div className="mt-5 border-t border-outline-variant pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-on-surface-variant"><Icon name="history_edu" size={18} className="text-primary" />{title}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ s, day, lesson, check }, i) => {
          const { state, faltas } = lessonState(lesson, check);
          return (
          <m.li key={s.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3, ease: EMPHASIZED }}>
            <Tap to={`/disciplinas/${s.code}`} className="flex items-start gap-3 rounded-xl bg-surface-container-high px-3.5 py-3">
              <span className={cx('mt-1.5 size-2.5 shrink-0 rounded-full', TONES[subjectTone(s)].color)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="mt-0.5 line-clamp-3 text-sm text-on-surface-variant">{state !== 'none' ? lesson?.conteudo || 'Conteúdo não informado' : reasonFor(s, day)}</p>
              </div>
              <LessonBadge state={state} faltas={faltas} />
            </Tap>
          </m.li>
          );
        })}
      </ul>
    </div>
  );
}

function LessonBadge({ state, faltas }: { state: LessonState; faltas: number }) {
  if (state === 'absent') return <Badge tone="error"><Icon name="cancel" size={14} fill />{faltas}<span className="hidden sm:inline"> {faltas === 1 ? 'falta' : 'faltas'}</span></Badge>;
  if (state === 'present') return <Badge tone="success"><Icon name="check_circle" size={14} fill /><span className="hidden sm:inline">presente</span></Badge>;
  return <Badge tone="warning"><Icon name="help" size={14} /><span className="hidden sm:inline">sem registro</span></Badge>;
}

function NextUp({ item }: { item: ClassItem }) {
  return (
    <div className="mt-auto flex items-center gap-3 rounded-full bg-black/10 py-2 pr-4 pl-2 dark:bg-white/10">
      <span className="flex size-9 items-center justify-center rounded-full bg-white/40 dark:bg-black/20"><Icon name="skip_next" size={20} fill /></span>
      <span className="min-w-0 flex-1 truncate text-sm">Depois: <b className="font-semibold">{item.subject}</b></span>
      <span className="text-sm font-medium tabular">{item.start}</span>
    </div>
  );
}

function ClassHero({ item, tone, label, live, children }: { item: ClassItem; tone: Tone; label: string; live?: boolean; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <Tap to={`/disciplinas/${item.code}`} className={cx('flex h-full min-h-80 flex-col rounded-2xl p-6', t.container, t.onContainer)}>
      <Shape shape="cookie" size={300} spin className="pointer-events-none absolute -right-20 -bottom-24 opacity-15" />
      <div className="relative flex items-start justify-between gap-3">
        <Badge className="bg-white/50 !text-current dark:bg-black/25">
          {live && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" /><span className="relative size-2 rounded-full bg-current" /></span>}
          {label}
        </Badge>
        <Icon name="arrow_outward" />
      </div>
      <p className="relative mt-3 text-[32px] leading-10 font-semibold tracking-tight md:text-[40px] md:leading-[48px]">{item.subject}</p>
      <div className="relative mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium opacity-90">
        <span className="flex items-center gap-1"><Icon name="schedule" size={18} />{item.start} – {item.end}</span>
        {item.room && <span className="flex items-center gap-1"><Icon name="location_on" size={18} />{item.room}</span>}
      </div>
      <Teacher code={item.code} />
      <div className="relative flex flex-1 flex-col gap-4">{children}</div>
    </Tap>
  );
}

/** Foto e nome do professor da aula (vem do cache da turma; some se não houver). */
function Teacher({ code }: { code: string }) {
  const { data } = useTurma(code);
  const p = data?.professores[0];
  if (!p) return null;
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }}
      className="relative mt-3 flex w-fit items-center gap-2 rounded-full bg-white/40 py-1 pr-3.5 pl-1 text-sm dark:bg-black/20">
      {p.foto ? <img src={p.foto} alt="" width={28} height={28} className="size-7 rounded-full object-cover object-top" /> : <Icon name="person" size={20} />}
      <span>com <b className="font-semibold">{shortName(p.nome)}</b>{data!.professores.length > 1 && ` +${data!.professores.length - 1}`}</span>
    </m.div>
  );
}

/** Mostrador em arco com o andamento da aula. */
function Dial({ progress, center, caption }: { progress: number; center: string; caption: string }) {
  const W = 300, H = 160, cx0 = W / 2, cy0 = H - 14, r = 128;
  const p = Math.max(0, Math.min(1, progress));
  const a = Math.PI * (1 - p);
  const kx = cx0 + r * Math.cos(a), ky = cy0 - r * Math.sin(a);
  const arc = `M ${cx0 - r} ${cy0} A ${r} ${r} 0 0 1 ${cx0 + r} ${cy0}`;
  return (
    <div className="relative mx-auto mt-4 w-full max-w-[320px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <path d={arc} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="12" strokeLinecap="round" />
        <m.path d={arc} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: p }} transition={{ duration: 1.3, ease: EMPHASIZED }} />
        <m.g initial={{ x: cx0 - r, y: cy0 }} animate={{ x: kx, y: ky }} transition={{ duration: 1.3, ease: EMPHASIZED }}>
          <circle r="16" fill="currentColor" />
          <circle r="6" fill="var(--md-surface)" />
        </m.g>
      </svg>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <p className="text-[44px] leading-none font-semibold tracking-tight tabular">{center}</p>
        <p className="mt-1 text-sm font-medium opacity-80">{caption}</p>
      </div>
    </div>
  );
}

// ---------- Posso faltar? ----------

const VERDICT: Record<SkipVerdict, { title: string; icon: string; shape: 'flower' | 'cookie' | 'clover' | 'sunny'; bg: string; fg: string }> = {
  yes: { title: 'Pode faltar', icon: 'check', shape: 'flower', bg: 'text-success', fg: 'text-on-success' },
  tight: { title: 'Pode, mas no limite', icon: 'priority_high', shape: 'clover', bg: 'text-warning', fg: 'text-on-warning' },
  no: { title: 'Melhor não faltar', icon: 'close', shape: 'cookie', bg: 'text-error', fg: 'text-on-error' },
  noclass: { title: 'Não tem aula', icon: 'beach_access', shape: 'sunny', bg: 'text-tertiary', fg: 'text-on-tertiary' },
};
/** Os mesmos veredictos no modo zueira. */
const VERDICT_ZUEIRA: Record<SkipVerdict, string> = { yes: 'Falte, meu filho', tight: 'Reflita', no: 'Nem pense nisso', noclass: 'Baixo em disposição' };

function SkipCard({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const options = useMemo(() => {
    const out: { key: string; label: string; day: number }[] = [];
    const todayOver = !classesOn(subjects, now.getDay()).some((c) => toMin(c.end) > nowMin(now));
    for (let i = todayOver ? 1 : 0; out.length < 6 && i < 10; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      if (d.getDay() === 0) continue;
      out.push({ key: isoDay(d), label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WEEKDAYS_SHORT[d.getDay()], day: d.getDay() });
    }
    return out;
  }, [subjects, now]);
  const [sel, setSel] = useState(options[0]?.key);
  const opt = options.find((o) => o.key === sel) ?? options[0];
  const { verdict, items } = canSkip(subjects, opt.day);
  const v = VERDICT[verdict];
  const zueira = useVibe().tone === 'zueira';
  const worst = items[0];

  return (
    <Card variant="filled" className="flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Icon name="help" className="text-primary" fill />
        <h2 className="text-[22px] leading-7 font-medium">Posso faltar?</h2>
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        {options.map((o) => <Chip key={o.key} label={o.label} selected={o.key === opt.key} onClick={() => setSel(o.key)} />)}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div key={opt.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: EMPHASIZED }} className="mt-4 flex flex-1 flex-col">
          <div className="flex items-center gap-4">
            <m.span initial={{ scale: 0.5, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <Shape shape={v.shape} size={64} className={v.bg}><Icon name={v.icon} size={32} weight={600} className={v.fg} /></Shape>
            </m.span>
            <div className="min-w-0">
              <p className="text-2xl leading-8 font-semibold tracking-tight">{zueira ? VERDICT_ZUEIRA[verdict] : v.title}</p>
              <p className="text-sm text-on-surface-variant">
                {verdict === 'noclass' ? `${opt.label === 'Hoje' || opt.label === 'Amanhã' ? opt.label : WEEKDAYS[opt.day]} está livre.`
                  : verdict === 'no' ? `${worst.s.name} passaria do limite.`
                  : verdict === 'tight' ? `${worst.s.name} ficaria com ${worst.leftAfter} ${worst.leftAfter === 1 ? 'falta livre' : 'faltas livres'}.`
                  : `Todas as matérias do dia continuam com folga.`}
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {items.map(({ s, lessons, leftAfter }) => (
                <li key={s.code} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                  <span className={cx('size-2.5 shrink-0 rounded-full', TONES[subjectTone(s)].color)} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="text-on-surface-variant tabular">−{lessons}</span>
                  <span className={cx('w-24 text-right font-medium tabular', leftAfter < 0 ? 'text-error' : leftAfter <= 2 ? 'text-warning' : 'text-success')}>
                    {leftAfter < 0 ? `estoura ${-leftAfter}` : `sobram ${leftAfter}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </m.div>
      </AnimatePresence>
    </Card>
  );
}

// ---------- Números ----------

function Stats({ subjects, now }: { subjects?: Subject[]; now: Date }) {
  const { current } = usePeriod();
  const { data: freq } = useFrequencia(current);
  const { data: cal } = useCalendario(current);
  const { data: holidays } = useHolidays();
  const avg = subjects ? overallAverage(subjects) : null;
  const stage = currentStage(cal, subjects, now);
  const hol = nextHoliday(holidays, now);

  return (
    <div className="grid h-full grid-cols-2 gap-3">
      <StatTile icon="grade" label="Média geral" hint={avg !== null && avg < PASS ? 'abaixo de 60' : 'até agora'}>
        <Ring value={(avg ?? 0) / 100} size={56} stroke={6} color={avg !== null && avg < PASS ? 'var(--c-warning)' : 'var(--md-primary)'}>
          <CountUp value={avg !== null ? Math.round(avg) : null} className="text-lg font-semibold" />
        </Ring>
      </StatTile>
      <StatTile icon="how_to_reg" label="Frequência" hint={freq ? `${freq.total_faltas} faltas no período` : ' '}>
        <Ring value={(freq?.percentual_frequencia ?? 0) / 100} size={56} stroke={6} color={freq && freq.percentual_frequencia < 75 ? 'var(--md-error)' : 'var(--c-success)'}>
          <CountUp value={freq?.percentual_frequencia ?? null} className="text-base font-semibold" suffix="%" />
        </Ring>
      </StatTile>
      <StatTile icon="flag" label={stage ? `${stage.n}ª etapa` : 'Etapa'} hint={stage?.end ? `termina ${stage.end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : stage ? 'em andamento' : 'sem calendário'}>
        <p className="text-[32px] leading-none font-semibold tracking-tight tabular">
          {stage?.daysLeft !== null && stage?.daysLeft !== undefined ? <><CountUp value={stage.daysLeft} /><span className="text-base font-medium text-on-surface-variant"> dias</span></> : stage ? `${stage.n}ª` : '–'}
        </p>
      </StatTile>
      <StatTile icon="celebration" label="Próximo feriado" hint={hol ? hol.name : 'nenhum no ano'}>
        <p className="text-[32px] leading-none font-semibold tracking-tight tabular">
          {hol ? hol.days === 0 ? 'Hoje' : <><CountUp value={hol.days} /><span className="text-base font-medium text-on-surface-variant"> dias</span></> : '–'}
        </p>
      </StatTile>
    </div>
  );
}

function StatTile({ icon, label, hint, children }: { icon: string; label: string; hint: string; children: ReactNode }) {
  return (
    <Card variant="filled" className="flex min-h-36 flex-col justify-between gap-3 rounded-2xl p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant"><Icon name={icon} size={18} className="text-primary" fill />{label}</p>
      <div className="flex items-center">{children}</div>
      <p className="truncate text-xs text-on-surface-variant">{hint}</p>
    </Card>
  );
}

// ---------- Aulas de hoje ----------

const ATTENDANCE_BADGE: Record<AttendanceCheck['status'], { icon: string; textClass: string; label: string; fill?: boolean; pulse?: boolean }> = {
  pending: { icon: 'help', textClass: 'text-warning', label: 'sem registro' },
  present: { icon: 'check_circle', textClass: 'text-success', label: 'presença confirmada', fill: true },
  absent: { icon: 'cancel', textClass: 'text-error', label: 'falta registrada', fill: true },
  unregistered: { icon: 'help', textClass: 'text-warning', label: 'SUAP não lançou' },
};

function DayList({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const today = classesOn(subjects, now.getDay());
  const mm = nowMin(now);
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const checks = useAttendance();
  const aulas = useSemesterAulas().data;
  const reasonFor = useReasonFor(subjects);
  const date = isoDay(now);

  return (
    <section className="h-full">
      <SectionHeader title="Aulas de hoje" icon="schedule" action={<Button variant="text" size="sm" to="/horario">Semana</Button>} />
      {!today.length ? (
        <Card variant="filled" className="rounded-2xl"><Empty icon="event_available" title="Sem aulas hoje" /></Card>
      ) : (
        <div className="flex flex-col gap-1 overflow-hidden rounded-2xl">
          {today.map((c) => {
            const s = byCode.get(c.code);
            const t = TONES[s ? subjectTone(s) : toneFor(c.code)];
            const past = toMin(c.end) <= mm;
            const live = toMin(c.start) <= mm && mm < toMin(c.end);
            const lesson = (past || live) && s ? lessonOn(aulas, s, date) : null;
            const check = past || live ? attendanceFor(c.code, date, checks) : undefined;
            const { state } = lessonState(lesson, check);
            // Aula em andamento só ganha selo quando já foi registrada; depois de acabar, sem registro também aparece
            const status: AttendanceCheck['status'] | undefined = state !== 'none' ? (state === 'absent' ? 'absent' : 'present') : past ? (check?.status === 'unregistered' ? 'unregistered' : 'pending') : undefined;
            const badge = status ? ATTENDANCE_BADGE[status] : undefined;
            return (
              <Tap key={c.code + c.start} to={`/disciplinas/${c.code}`} className={cx('flex items-center gap-3 rounded-sm px-4 py-3', live ? cx(t.container, t.onContainer) : 'bg-surface-container', past && !badge && 'opacity-60')}>
                <div className="w-12 shrink-0 text-sm leading-tight tabular">
                  <p className="font-semibold">{c.start}</p>
                  <p className="text-xs opacity-70">{c.end}</p>
                </div>
                <span className={cx('h-10 w-1 shrink-0 rounded-full', t.color)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.subject}</p>
                  <p className={cx('text-xs opacity-75', lesson?.conteudo || (past && state === 'none') ? 'line-clamp-2' : 'truncate')}>{lesson?.conteudo || (past && state === 'none' && s ? reasonFor(s, date) : c.room || 'Sala não informada')}</p>
                </div>
                {live && <Badge tone="primary">agora</Badge>}
                {badge && (
                  <span className={cx('flex items-center gap-1 text-xs font-medium', badge.textClass)} title={badge.label}>
                    <Icon name={badge.icon} size={18} fill={badge.fill} className={badge.pulse ? 'animate-pulse' : undefined} />
                    <span className="hidden sm:inline">{badge.label}</span>
                  </span>
                )}
              </Tap>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------- Fique de olho ----------

function Attention({ subjects }: { subjects: Subject[] }) {
  const items = subjects
    .map((s) => ({ s, lvl: absenceLevel(s), o: outlook(s) }))
    .filter(({ lvl, o }) => lvl !== 'safe' || o.kind === 'final' || (o.kind === 'needs' && o.needed > 75))
    .sort((a, b) => (a.s.limit - a.s.absences) - (b.s.limit - b.s.absences));

  return (
    <section className="h-full">
      <SectionHeader title="Fique de olho" icon="visibility" action={<Button variant="text" size="sm" to="/disciplinas">Matérias</Button>} />
      {items.length === 0 ? (
        <Card variant="filled" className="flex items-center gap-4 rounded-2xl p-5">
          <Shape shape="flower" size={52} className="text-success"><Icon name="verified" className="text-on-success" fill /></Shape>
          <p className="text-sm">Tudo sob controle: nenhuma matéria perto do limite de faltas ou abaixo da média.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-1 overflow-hidden rounded-2xl">
          {items.slice(0, 5).map(({ s, lvl, o }) => (
            <Tap key={s.code} to={`/disciplinas/${s.code}`} className="rounded-sm bg-surface-container px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={cx('size-2.5 shrink-0 rounded-full', TONES[subjectTone(s)].color)} />
                <p className="min-w-0 flex-1 truncate font-medium">{s.name}</p>
                {o.kind === 'final' && <Badge tone="warning">prova final</Badge>}
                {o.kind === 'needs' && o.needed > 75 && <Badge tone={o.needed > 100 ? 'error' : 'warning'}>precisa {o.needed}</Badge>}
              </div>
              <AbsenceMeter used={s.absences} limit={s.limit} level={lvl} />
            </Tap>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Desde a última visita ----------

const NEWS_ICON: Record<NewsItem['kind'], { icon: string; cls: string }> = {
  grade: { icon: 'grade', cls: 'bg-primary text-on-primary' },
  final: { icon: 'flag', cls: 'bg-warning text-on-warning' },
  absence: { icon: 'event_busy', cls: 'bg-error text-on-error' },
  status: { icon: 'verified', cls: 'bg-success text-on-success' },
  message: { icon: 'mail', cls: 'bg-tertiary text-on-tertiary' },
};

function newsText(n: NewsItem) {
  switch (n.kind) {
    case 'grade': return <>Saiu a <b className="font-semibold">N{n.stage}</b> de {n.subject}: <b className="font-semibold tabular">{n.value}</b></>;
    case 'final': return <>Nota da prova final de {n.subject}: <b className="font-semibold tabular">{n.value}</b></>;
    case 'absence': return <>+{n.delta} {n.delta === 1 ? 'falta' : 'faltas'} em {n.subject}</>;
    case 'status': return <>{n.subject}: <b className="font-semibold">{n.status}</b></>;
    case 'message': return <>{n.count} {n.count === 1 ? 'mensagem nova' : 'mensagens novas'}{n.from && <> de {shortName(n.from)}</>}</>;
  }
}

let celebrated = false;

function News({ subjects }: { subjects: Subject[] }) {
  const { data: msgs } = useMensagens();
  const [prev, setPrev] = useState(loadSnapshot);
  const items = useMemo(() => (prev ? diffNews(prev, subjects, msgs) : []), [prev, subjects, msgs]);

  // Primeira visita: guarda o retrato atual em silêncio, sem inventar novidades
  useEffect(() => {
    if (!prev && msgs) { saveSnapshot(subjects, msgs); setPrev(loadSnapshot()); }
  }, [prev, subjects, msgs]);

  useEffect(() => {
    if (celebrated || !items.some((n) => (n.kind === 'grade' && n.value >= 90) || (n.kind === 'status' && /aprovad/i.test(n.status)))) return;
    celebrated = true;
    import('canvas-confetti').then(({ default: confetti }) => confetti({ particleCount: 90, spread: 70, origin: { y: 0.2 }, disableForReducedMotion: true }));
  }, [items]);

  const dismiss = () => { saveSnapshot(subjects, msgs); setPrev(loadSnapshot()); };

  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <m.section key="news" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: EMPHASIZED }} className="overflow-hidden">
          <Card variant="secondary" className="mb-4 rounded-2xl p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="auto_awesome" fill />
              <h2 className="flex-1 text-lg font-medium">Desde sua última visita{prev && <span className="text-sm font-normal opacity-75"> · {timeAgo(prev.at)}</span>}</h2>
              <Button variant="text" size="sm" icon="check" onClick={dismiss} className="!text-current">Entendi</Button>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {items.map((n, i) => (
                <m.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3, ease: EMPHASIZED }}>
                  <Tap to={n.kind === 'message' ? '/mensagens' : `/disciplinas/${n.code}`} className="flex items-center gap-3 rounded-lg bg-white/35 px-3 py-2.5 text-sm dark:bg-black/15">
                    <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-full', NEWS_ICON[n.kind].cls)}><Icon name={NEWS_ICON[n.kind].icon} size={18} fill /></span>
                    <span className="min-w-0 flex-1">{newsText(n)}</span>
                    <Icon name="chevron_right" size={20} className="opacity-60" />
                  </Tap>
                </m.li>
              ))}
            </ul>
          </Card>
        </m.section>
      )}
    </AnimatePresence>
  );
}

// ---------- Prazos ----------

function Deadlines() {
  const linked = classroom.linked;
  const { data: avaliacoes, loading } = useAvaliacoes();
  const { data: tasks } = useTasks(linked && classroom.tokenValid);
  const { data: eu } = useEu();
  const { data: campus } = useCampus(eu?.campus);
  const now = new Date();
  const list = buildDeadlines(avaliacoes, tasks, campus?.eventos)
    .filter((d) => d.date && daysBetween(now, d.date) >= (d.late ? -3 : 0) && daysBetween(now, d.date) <= 14)
    .slice(0, 5);

  return (
    <section className="h-full">
      <SectionHeader title="Próximos prazos" icon="event" action={<Button variant="text" size="sm" to="/agenda">Agenda</Button>} />
      {loading ? <Skeleton className="h-40" /> : list.length === 0 ? (
        <Card variant="filled" className="rounded-2xl">
          <Empty icon="event_available" title="Nada nos próximos 14 dias" action={!linked && <Button variant="tonal" size="sm" icon="add_link" to="/agenda">Conectar Classroom</Button>} />
        </Card>
      ) : (
        <div className="flex flex-col gap-1 overflow-hidden rounded-2xl">{list.map((d) => <DeadlineRow key={d.id} d={d} />)}</div>
      )}
    </section>
  );
}

export function DeadlineRow({ d }: { d: Deadline }) {
  const now = new Date();
  const n = d.date ? daysBetween(now, d.date) : null;
  const urgent = d.late || (n !== null && n <= 1);
  const body = (
    <div className="flex items-center gap-3 rounded-sm bg-surface-container px-4 py-3">
      <div className={cx('flex size-12 shrink-0 flex-col items-center justify-center rounded-lg leading-none', d.late ? 'bg-error-container text-on-error-container' : urgent ? 'bg-warning-container text-on-warning-container' : 'bg-secondary-container text-on-secondary-container')}>
        {d.date ? (
          <>
            <span className="text-lg font-semibold tabular">{d.date.getDate()}</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase">{d.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
          </>
        ) : <Icon name="event_busy" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{d.title}</p>
        <p className="truncate text-xs text-on-surface-variant">
          {d.source === 'classroom' && <Icon name="assignment" size={12} className="mr-1 align-[-1px]" />}
          {d.source === 'campus' && <Icon name="apartment" size={12} className="mr-1 align-[-1px]" />}
          {d.subject}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs">
        <p className={cx('font-medium', d.late ? 'text-error' : urgent ? 'text-warning' : 'text-on-surface-variant')}>{d.date ? relativeDay(d.date, now) : 'sem data'}</p>
        {d.hasTime && d.date && <p className="text-on-surface-variant tabular">{time(d.date)}</p>}
      </div>
    </div>
  );
  return d.link ? <Tap href={d.link} className="rounded-sm">{body}</Tap> : body;
}
