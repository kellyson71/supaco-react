import { useMemo } from 'react';
import { ArrowUpRight, CalendarCheck2, Coffee, MapPin, PartyPopper } from 'lucide-react';
import { useAvaliacoes, useCalendario, useCurrentSubjects, useEu, useFrequencia, useHolidays, usePeriod, useTasks } from '../lib/data';
import { classroom } from '../lib/classroom';
import { classesOn, formatDuration, nowMin, toMin, WEEKDAYS, type ClassItem } from '../lib/schedule';
import { absenceLevel, outlook, overallAverage, PASS } from '../lib/grades';
import { buildDeadlines, type Deadline } from '../lib/agenda';
import { daysBetween, isoDay, longDate, parseDay, relativeDay, time } from '../lib/dates';
import { useNow } from '../lib/hooks';
import type { Calendario, Periodo, Subject } from '../lib/suap';
import { Badge, Card, cx, Empty, ErrorNote, Eyebrow, levelText, Skeleton, Tally } from '../components/ui';
import { Link } from '../components/Shell';

const greeting = (h: number) => (h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

export function Today() {
  const now = useNow();
  const { data: eu } = useEu();
  const { current } = usePeriod();
  const subjectsRes = useCurrentSubjects();
  const subjects = subjectsRes.data;
  const { data: holidays } = useHolidays();
  const holiday = holidays?.find((h) => h.date === isoDay(now));

  return (
    <div className="rise">
      <header className="mt-2 mb-7">
        <p className="text-sm font-medium text-muted first-letter:uppercase">{longDate(now)}</p>
        <h1 className="mt-1 font-display text-[32px] leading-tight font-semibold tracking-tight md:text-[40px]">
          {greeting(now.getHours())}{eu ? `, ${eu.primeiro_nome || eu.nome_usual.split(' ')[0]}` : ''}
        </h1>
      </header>

      {subjectsRes.error && !subjects && <div className="mb-6"><ErrorNote error={subjectsRes.error} onRetry={subjectsRes.refresh} /></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {subjects ? <NowCard subjects={subjects} now={now} holiday={holiday?.name} /> : <Skeleton className="h-44" />}
          {subjects ? <DayTimeline subjects={subjects} now={now} /> : <Skeleton className="h-56" />}
        </div>
        <div className="flex flex-col gap-6">
          {subjects ? <Attention subjects={subjects} /> : <Skeleton className="h-40" />}
          <Deadlines />
          <Summary subjects={subjects} period={current} />
        </div>
      </div>
    </div>
  );
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
  const today = holiday ? [] : classesOn(subjects, now.getDay());
  const m = nowMin(now);
  const current = today.find((c) => toMin(c.start) <= m && m < toMin(c.end));
  const next = today.find((c) => toMin(c.start) > m);

  if (current) {
    const total = toMin(current.end) - toMin(current.start);
    const pct = ((m - toMin(current.start)) / total) * 100;
    return (
      <HeroCard eyebrow={`Agora · termina em ${formatDuration(toMin(current.end) - m)}`} item={current} live>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-brand-ink/20">
          <div className="h-full rounded-full bg-brand-ink" style={{ width: `${pct}%` }} />
        </div>
        {next && <p className="mt-3 text-sm opacity-75">Depois: <b className="font-semibold">{next.subject}</b> às {next.start}</p>}
      </HeroCard>
    );
  }
  if (next) {
    const wait = toMin(next.start) - m;
    return <HeroCard eyebrow={wait <= 90 ? `Próxima aula · em ${formatDuration(wait)}` : `Próxima aula · às ${next.start}`} item={next} />;
  }

  const upcoming = nextSchoolDay(subjects, now);
  const title = holiday ? `Feriado: ${holiday}` : today.length ? 'Aulas de hoje encerradas' : 'Sem aulas hoje';
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {holiday ? <PartyPopper size={20} /> : <Coffee size={20} />}
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">{title}</p>
          {upcoming ? (
            <p className="mt-1 text-sm text-muted">
              Próxima: <span className="font-medium text-ink">{upcoming.first.subject}</span>{' '}
              {daysBetween(now, upcoming.date) === 1 ? 'amanhã' : WEEKDAYS[upcoming.date.getDay()].toLowerCase()} às {upcoming.first.start}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Nenhum horário cadastrado para este período.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function HeroCard({ eyebrow, item, live, children }: { eyebrow: string; item: ClassItem; live?: boolean; children?: React.ReactNode }) {
  return (
    <Link to={`/disciplinas/${item.code}`} className="block rounded-2xl bg-brand p-6 text-brand-ink shadow-[0_12px_32px_-12px] shadow-brand/60 transition hover:brightness-105">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase opacity-80">
        {live && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-current" /></span>}
        {eyebrow}
      </p>
      <p className="mt-3 font-display text-[26px] leading-tight font-semibold md:text-3xl">{item.subject}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-85">
        <span className="font-mono">{item.start}–{item.end}</span>
        {item.room && <span className="flex items-center gap-1"><MapPin size={14} />{item.room}</span>}
        <span>{item.lessons} {item.lessons === 1 ? 'aula' : 'aulas'}</span>
      </div>
      {children}
    </Link>
  );
}

function DayTimeline({ subjects, now }: { subjects: Subject[]; now: Date }) {
  const today = classesOn(subjects, now.getDay());
  const m = nowMin(now);
  const byCode = useMemo(() => new Map(subjects.map((s) => [s.code, s])), [subjects]);
  if (!today.length) return null;

  return (
    <div>
      <Eyebrow right={<Link to="/horario" className="text-xs font-medium text-brand">Semana</Link>}>Hoje</Eyebrow>
      <Card className="divide-y divide-line">
        {today.map((c) => {
          const past = toMin(c.end) <= m;
          const live = toMin(c.start) <= m && m < toMin(c.end);
          const s = byCode.get(c.code);
          const lvl = s ? absenceLevel(s) : 'safe';
          return (
            <Link key={`${c.code}-${c.start}`} to={`/disciplinas/${c.code}`} className={cx('flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2', past && 'opacity-45')}>
              <div className="w-12 shrink-0 font-mono text-sm leading-tight">
                <p className={cx('font-semibold', live && 'text-brand')}>{c.start}</p>
                <p className="text-xs text-muted">{c.end}</p>
              </div>
              <span className={cx('h-9 w-[3px] shrink-0 rounded-full', live ? 'bg-brand' : 'bg-line')} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.subject}</p>
                <p className="truncate text-xs text-muted">{c.room || 'Sala não informada'}</p>
              </div>
              {s && lvl !== 'safe' && (
                <span className={cx('shrink-0 text-xs font-semibold', levelText[lvl])}>
                  {s.limit - s.absences < 0 ? 'acima do limite' : s.limit - s.absences === 1 ? '1 falta livre' : `${s.limit - s.absences} faltas livres`}
                </span>
              )}
            </Link>
          );
        })}
      </Card>
    </div>
  );
}

// ---------- Atenção ----------

function Attention({ subjects }: { subjects: Subject[] }) {
  const items = subjects
    .map((s) => ({ s, lvl: absenceLevel(s), o: outlook(s) }))
    .filter(({ lvl, o }) => lvl !== 'safe' || o.kind === 'final' || (o.kind === 'needs' && o.needed > 75))
    .sort((a, b) => (a.s.limit - a.s.absences) - (b.s.limit - b.s.absences));

  return (
    <div>
      <Eyebrow>Atenção</Eyebrow>
      <Card>
        {items.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <CalendarCheck2 size={18} className="text-brand" />
            <p className="text-sm">Tudo em dia: nenhuma disciplina perto do limite de faltas ou abaixo da média.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.slice(0, 5).map(({ s, lvl, o }) => {
              const left = s.limit - s.absences;
              return (
                <li key={s.code}>
                  <Link to={`/disciplinas/${s.code}`} className="block px-4 py-3.5 transition-colors hover:bg-surface-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">{s.name}</p>
                      {o.kind === 'final' && <Badge tone="warn">prova final</Badge>}
                      {o.kind === 'needs' && o.needed > 75 && <Badge tone={o.needed > 100 ? 'bad' : 'warn'}>precisa de {o.needed}</Badge>}
                    </div>
                    {lvl !== 'safe' && (
                      <div className="mt-2 flex items-center gap-3">
                        <Tally used={s.absences} limit={s.limit} level={lvl} size="sm" />
                        <span className={cx('ml-auto shrink-0 text-xs font-semibold', levelText[lvl])}>
                          {left < 0 ? `${-left} acima do limite` : left === 0 ? 'no limite' : `${left} ${left === 1 ? 'falta livre' : 'faltas livres'}`}
                        </span>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
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
    <div>
      <Eyebrow right={<Link to="/agenda" className="text-xs font-medium text-brand">Ver agenda</Link>}>Próximos prazos</Eyebrow>
      <Card>
        {loading ? <div className="p-4"><Skeleton className="h-16" /></div> : list.length === 0 ? (
          <Empty title="Nada nos próximos 14 dias">
            {!linked && <Link to="/agenda" className="font-medium text-brand">Conecte o Google Classroom</Link>}
          </Empty>
        ) : (
          <ul className="divide-y divide-line">{list.map((d) => <DeadlineRow key={d.id} d={d} />)}</ul>
        )}
      </Card>
    </div>
  );
}

export function DeadlineRow({ d }: { d: Deadline }) {
  const now = new Date();
  const n = d.date ? daysBetween(now, d.date) : null;
  const urgent = n !== null && n <= 1;
  const body = (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className={cx('w-14 shrink-0 text-xs font-semibold', d.late ? 'text-bad' : urgent ? 'text-warn' : 'text-muted')}>
        {d.date ? relativeDay(d.date, now) : 'sem data'}
        {d.hasTime && d.date && <span className="block font-mono font-normal">{time(d.date)}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{d.title}</p>
        <p className="truncate text-xs text-muted">{d.subject}{d.detail ? ` · ${d.detail}` : ''}</p>
      </div>
      {d.source === 'classroom' && <Badge tone="muted">Classroom</Badge>}
      {d.link && <ArrowUpRight size={15} className="shrink-0 text-muted" />}
    </div>
  );
  return <li>{d.link ? <a href={d.link} target="_blank" rel="noreferrer" className="block transition-colors hover:bg-surface-2">{body}</a> : body}</li>;
}

// ---------- Resumo ----------

function Summary({ subjects, period }: { subjects?: Subject[]; period?: Periodo }) {
  const { data: freq } = useFrequencia(period);
  const { data: cal } = useCalendario(period);
  const avg = subjects ? overallAverage(subjects) : null;
  const stage = useMemo(() => currentStage(cal ?? null), [cal]);

  return (
    <div>
      <Eyebrow>Período {period?.label}</Eyebrow>
      <Card className="grid grid-cols-3 divide-x divide-line">
        <Stat label="Média geral" value={avg !== null ? Math.round(avg).toString() : '—'} tone={avg !== null && avg < PASS ? 'text-warn' : undefined} />
        <Stat label="Frequência" value={freq ? `${freq.percentual_frequencia}%` : '—'} tone={freq && freq.percentual_frequencia < 75 ? 'text-bad' : undefined} />
        <Stat label={stage ? `${stage.n}ª etapa` : 'Etapa'} value={stage ? `${stage.left}d` : '—'} hint={stage ? 'para acabar' : undefined} />
      </Card>
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-1 font-mono text-2xl font-semibold tabular', tone)}>{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function currentStage(cal: Calendario | null) {
  if (!cal) return null;
  const now = new Date();
  for (let n = 1; n <= 4; n++) {
    const start = cal[`data_inicio_etapa_${n as 1 | 2 | 3 | 4}`];
    const end = cal[`data_fim_etapa_${n as 1 | 2 | 3 | 4}`];
    if (!start || !end) continue;
    const s = parseDay(start), e = parseDay(end);
    if (now >= s && daysBetween(now, e) >= 0) return { n, left: daysBetween(now, e) };
  }
  return null;
}
