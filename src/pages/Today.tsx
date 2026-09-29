import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAvaliacoes, useCalendario, useCurrentSubjects, useEu, useFrequencia, useHolidays, usePeriod, useTasks } from '../lib/data';
import { classroom } from '../lib/classroom';
import { classesOn, formatDuration, nowMin, toMin, WEEKDAYS, WEEKDAYS_SHORT, type ClassItem } from '../lib/schedule';
import { absenceLevel, outlook, overallAverage, PASS } from '../lib/grades';
import { canSkip, currentStage, nextHoliday, type SkipVerdict } from '../lib/insights';
import { attendanceFor, markEnded, recheckPending, useAttendance, type AttendanceCheck } from '../lib/attendance';
import { buildDeadlines, type Deadline } from '../lib/agenda';
import { daysBetween, isoDay, longDate, relativeDay, time } from '../lib/dates';
import { useNow } from '../lib/hooks';
import { subjectTone, type Subject } from '../lib/suap';
import { TONES, toneFor, type Tone } from '../lib/tones';
import { AbsenceMeter, Badge, Button, Card, Chip, CountUp, cx, EMPHASIZED, Empty, ErrorNote, Icon, Item, Ring, SectionHeader, Shape, Skeleton, Stagger, Tap } from '../components/ui';
import { Avatar } from '../components/Avatar';

const greeting = (h: number) => (h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

export function Today() {
  const now = useNow();
  const { data: eu } = useEu();
  const res = useCurrentSubjects();
  const subjects = res.data;
  const { data: holidays } = useHolidays();
  const holiday = holidays?.find((h) => h.date === isoDay(now));
  const first = eu ? eu.primeiro_nome || eu.nome_usual.split(' ')[0] : '';
  useAttendanceWatch(subjects, now);

  return (
    <>
      <header className="mt-2 mb-6 flex items-center gap-4 md:mt-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-on-surface-variant first-letter:uppercase">{longDate(now)}</p>
          <h1 className="mt-1 text-[32px] leading-10 font-semibold tracking-tight md:text-[45px] md:leading-[52px]">
            {greeting(now.getHours())}{first && <>, <span className="text-primary">{first}</span></>}
          </h1>
        </div>
        <span className="hidden md:block"><Avatar size={48} /></span>
      </header>

      {res.error && !subjects && <div className="mb-4"><ErrorNote error={res.error} onRetry={res.refresh} /></div>}

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Item className="md:col-span-2 xl:col-span-7 xl:row-span-2">
          {subjects ? <NowCard subjects={subjects} now={now} holiday={holiday?.name} /> : <Skeleton className="h-80" />}
        </Item>
        <Item className="md:col-span-1 xl:col-span-5">
          {subjects ? <SkipCard subjects={subjects} now={now} /> : <Skeleton className="h-72" />}
        </Item>
        <Item className="md:col-span-1 xl:col-span-5"><Stats subjects={subjects} now={now} /></Item>
        <Item className="xl:col-span-4">{subjects && <DayList subjects={subjects} now={now} />}</Item>
        <Item className="xl:col-span-4">{subjects && <Attention subjects={subjects} />}</Item>
        <Item className="md:col-span-2 xl:col-span-4"><Deadlines /></Item>
      </Stagger>
    </>
  );
}

// ---------- Confere falta depois que a aula termina ----------

/** Assim que uma aula termina, marca "aguardando" e reconfere no SUAP até saber se virou falta. */
function useAttendanceWatch(subjects: Subject[] | undefined, now: Date) {
  useEffect(() => {
    if (!subjects) return;
    const date = isoDay(now);
    const mm = nowMin(now);
    classesOn(subjects, now.getDay())
      .filter((c) => toMin(c.end) <= mm)
      .forEach((c) => markEnded(c.code, c.subject, date));
    recheckPending(subjects);
  }, [subjects, now]);
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
        {after && <NextUp item={after} />}
      </ClassHero>
    );
  }

  const upcoming = nextSchoolDay(subjects, now);
  return (
    <Card variant="tertiary" className="relative flex h-full min-h-72 flex-col overflow-hidden rounded-2xl p-6">
      <Shape shape="sunny" size={260} spin className="absolute -top-16 -right-16 text-on-tertiary-container/10" />
      <Shape shape="flower" size={64} className="relative text-tertiary"><Icon name={holiday ? 'celebration' : 'weekend'} size={30} className="text-on-tertiary" fill /></Shape>
      <p className="relative mt-auto pt-10 text-sm font-medium opacity-80">{holiday ? 'Feriado' : today.length ? 'Por hoje é só' : 'Dia livre'}</p>
      <p className="relative text-[36px] leading-[44px] font-semibold tracking-tight">{holiday ?? (today.length ? 'Aulas encerradas' : 'Sem aulas hoje')}</p>
      {upcoming && (
        <p className="relative mt-3 flex items-center gap-2 text-base">
          <Icon name="arrow_forward" size={20} />
          <span><b className="font-semibold">{upcoming.first.subject}</b> · {daysBetween(now, upcoming.date) === 1 ? 'amanhã' : WEEKDAYS[upcoming.date.getDay()].toLowerCase()} às {upcoming.first.start}</span>
        </p>
      )}
    </Card>
  );
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
      <div className="relative flex flex-1 flex-col gap-4">{children}</div>
    </Tap>
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
              <p className="text-2xl leading-8 font-semibold tracking-tight">{v.title}</p>
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
  pending: { icon: 'hourglass_empty', textClass: 'text-on-surface-variant', label: 'aguardando SUAP', pulse: true },
  present: { icon: 'check_circle', textClass: 'text-success', label: 'presença confirmada', fill: true },
  absent: { icon: 'cancel', textClass: 'text-error', label: 'falta registrada', fill: true },
  unregistered: { icon: 'help', textClass: 'text-warning', label: 'SUAP não lançou' },
};

function DayList({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const today = classesOn(subjects, now.getDay());
  const mm = nowMin(now);
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const checks = useAttendance();
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
            const check = past ? attendanceFor(c.code, date, checks) : undefined;
            const badge = check ? ATTENDANCE_BADGE[check.status] : undefined;
            return (
              <Tap key={c.code + c.start} to={`/disciplinas/${c.code}`} className={cx('flex items-center gap-3 rounded-sm px-4 py-3', live ? cx(t.container, t.onContainer) : 'bg-surface-container', past && !badge && 'opacity-60')}>
                <div className="w-12 shrink-0 text-sm leading-tight tabular">
                  <p className="font-semibold">{c.start}</p>
                  <p className="text-xs opacity-70">{c.end}</p>
                </div>
                <span className={cx('h-10 w-1 shrink-0 rounded-full', t.color)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.subject}</p>
                  <p className="truncate text-xs opacity-75">{c.room || 'Sala não informada'}</p>
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

// ---------- Prazos ----------

function Deadlines() {
  const linked = classroom.linked;
  const { data: avaliacoes, loading } = useAvaliacoes();
  const { data: tasks } = useTasks(linked && classroom.tokenValid);
  const now = new Date();
  const list = buildDeadlines(avaliacoes, tasks)
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
