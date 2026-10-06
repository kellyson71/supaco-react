import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useCalendario, useDisciplinas, usePeriod, useTurma } from '../lib/data';
import { classesOn, formatDuration, nowMin, toMin, WEEKDAYS, WEEKDAYS_SHORT, type ClassItem } from '../lib/schedule';
import { useNow } from '../lib/hooks';
import { shortName, subjectTone } from '../lib/suap';
import { TONES, toneFor, type Tone } from '../lib/tones';
import { downloadIcs } from '../lib/ics';
import { parseDay } from '../lib/dates';
import { Button, Card, cx, EMPHASIZED, Empty, ErrorNote, Icon, IconButton, Skeleton, spring, Tap, TopTitle } from '../components/ui';
import { PeriodSelect } from '../components/PeriodSelect';
import { ShiftNotice } from '../components/ShiftNotice';

const PX_PER_MIN = 1.3;

export function Schedule() {
  const now = useNow();
  const { period, current } = usePeriod();
  const { data, error, loading, refresh } = useDisciplinas(period);
  const { data: cal } = useCalendario(period);
  const isCurrent = period?.label === current?.label;
  const today = now.getDay();

  const days = [1, 2, 3, 4, 5, 6].map((d) => ({ d, items: data ? classesOn(data, d) : [] }))
    .filter(({ d, items }) => d <= 5 || items.length > 0);
  const [sel, setSel] = useState(() => String(today >= 1 && today <= 6 ? today : 1));
  const selected = days.find((x) => String(x.d) === sel) ?? days[0];
  const toneOf = (code: string): Tone => { const s = data?.find((x) => x.code === code); return s ? subjectTone(s) : toneFor(code); };
  const empty = data && days.every((x) => !x.items.length);
  const totalLessons = days.reduce((a, x) => a + x.items.reduce((b, c) => b + c.lessons, 0), 0);

  const exportIcs = () => {
    if (!data) return;
    const end = parseDay(cal?.data_fim) ?? new Date(now.getTime() + 20 * 7 * 86_400_000);
    downloadIcs(data, end);
  };

  return (
    <>
      <TopTitle title="Horário" sub={data && !empty ? `${totalLessons} aulas por semana` : 'Sua semana de aulas'}
        right={<>
          <PeriodSelect />
          {data && !empty && (
            <>
              <span className="md:hidden"><IconButton icon="calendar_add_on" variant="tonal" label="Exportar para a agenda do celular" onClick={exportIcs} /></span>
              <span className="max-md:hidden"><Button variant="tonal" icon="calendar_add_on" onClick={exportIcs}>Exportar para agenda</Button></span>
            </>
          )}
        </>} />
      {isCurrent && <ShiftNotice all />}
      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <Skeleton className="h-96" />}
      {empty && <Card className="rounded-2xl"><Empty icon="calendar_view_week" title="Sem horários cadastrados">O SUAP não informou horários de aula para este período.</Empty></Card>}

      {data && !empty && (
        <>
          <div className="lg:hidden">
            <WeekStrip days={days} sel={String(selected.d)} onSel={setSel} today={isCurrent ? today : -1} now={now} toneOf={toneOf} />
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={selected.d} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: EMPHASIZED }}>
                <DayTimeline day={selected} isToday={isCurrent && selected.d === today} now={now} toneOf={toneOf} />
              </m.div>
            </AnimatePresence>
          </div>
          <WeekGrid days={days} now={now} showNow={isCurrent} toneOf={toneOf} />
        </>
      )}
    </>
  );
}

const isLive = (c: ClassItem, now: Date) => toMin(c.start) <= nowMin(now) && nowMin(now) < toMin(c.end);

/** A semana em uma faixa: o dia do mês (na semana atual), e um ponto colorido para cada aula do dia. */
function WeekStrip({ days, sel, onSel, today, now, toneOf }: { days: { d: number; items: ClassItem[] }[]; sel: string; onSel: (d: string) => void; today: number; now: Date; toneOf: (c: string) => Tone }) {
  // Dia do mês de cada dia desta semana (só faz sentido no período atual)
  const dateOf = (d: number) => { const x = new Date(now); x.setDate(now.getDate() + (d - now.getDay())); return x.getDate(); };
  return (
    <div role="tablist" aria-label="Dia da semana" className="mb-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map(({ d, items }) => {
        const on = String(d) === sel;
        return (
          <button key={d} role="tab" aria-selected={on} aria-label={`${WEEKDAYS[d]}, ${items.length} ${items.length === 1 ? 'matéria' : 'matérias'}`} onClick={() => onSel(String(d))}
            className={cx('state relative flex flex-col items-center gap-1 rounded-2xl pt-2 pb-2.5 transition-colors duration-200', on ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant')}>
            <span className={cx('text-[11px] font-medium tracking-wide uppercase', d === today && !on && 'text-primary')}>{WEEKDAYS_SHORT[d]}</span>
            {today >= 0 && <span className={cx('text-lg leading-6 font-semibold tabular', !on && 'text-on-surface')}>{dateOf(d)}</span>}
            <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
              {items.length === 0 ? <span className="h-px w-3 bg-current opacity-40" />
                : items.slice(0, 5).map((c) => <span key={c.code + c.start} className={cx('size-1.5 rounded-full', on ? 'bg-on-primary' : TONES[toneOf(c.code)].color)} />)}
            </span>
            {d === today && <span className={cx('absolute top-1.5 right-1.5 size-1.5 rounded-full', on ? 'bg-on-primary' : 'bg-primary')} title="hoje" />}
          </button>
        );
      })}
    </div>
  );
}

/** As aulas de um dia numa linha do tempo, com os intervalos entre elas e o que está rolando agora. */
function DayTimeline({ day, isToday, now, toneOf }: { day: { d: number; items: ClassItem[] }; isToday: boolean; now: Date; toneOf: (c: string) => Tone }) {
  const { d, items } = day;
  if (!items.length) return <Card className="rounded-2xl"><Empty icon="weekend" title={`${WEEKDAYS[d]} livre`}>Nenhuma aula nesse dia.</Empty></Card>;
  const lessons = items.reduce((a, c) => a + c.lessons, 0);
  return (
    <>
      <p className="mb-3 px-1 text-sm text-on-surface-variant">
        <b className="font-medium text-on-surface">{WEEKDAYS[d]}{isToday && ', hoje'}</b> · {lessons} aulas, das {items[0].start} às {items[items.length - 1].end}
      </p>
      <ol className="flex flex-col">
        {items.map((c, i) => {
          const gap = i > 0 ? toMin(c.start) - toMin(items[i - 1].end) : 0;
          return (
            <li key={c.code + c.start}>
              {gap >= 10 && (
                <p className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 py-1.5 text-xs text-on-surface-variant">
                  <span />
                  <span className="flex items-center gap-2"><span className="h-px w-4 bg-outline-variant" />{gap <= 30 ? 'intervalo' : 'janela'} de {formatDuration(gap)}<span className="h-px flex-1 bg-outline-variant" /></span>
                </p>
              )}
              {gap > 0 && gap < 10 && <span className="block h-2" />}
              <ClassRow c={c} tone={toneOf(c.code)} now={isToday ? now : null} />
            </li>
          );
        })}
      </ol>
    </>
  );
}

function ClassRow({ c, tone, now }: { c: ClassItem; tone: Tone; now: Date | null }) {
  const t = TONES[tone];
  const { data: turma } = useTurma(c.code);
  const prof = turma?.professores[0];
  const mm = now ? nowMin(now) : -1;
  const live = now ? isLive(c, now) : false;
  const past = mm >= 0 && toMin(c.end) <= mm;
  const progress = live ? (mm - toMin(c.start)) / (toMin(c.end) - toMin(c.start)) : 0;
  return (
    <div className={cx('grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3', past && 'opacity-55')}>
      <div className="pt-3 text-right leading-tight tabular">
        <p className={cx('text-base font-semibold', live && 'text-primary')}>{c.start}</p>
        <p className="text-xs text-on-surface-variant">{c.end}</p>
      </div>
      <Tap to={`/disciplinas/${c.code}`} className={cx('rounded-2xl px-4 py-3', t.container, t.onContainer)}>
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[17px] leading-6 font-medium">{c.subject}</p>
          {live && <span className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium dark:bg-black/25"><span className="size-1.5 animate-pulse rounded-full bg-current" />agora</span>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm opacity-85">
          {c.room && <span className="flex items-center gap-1"><Icon name="location_on" size={16} />{c.room}</span>}
          {prof && <span className="flex items-center gap-1"><Icon name="person" size={16} />{shortName(prof.nome)}</span>}
          <span>{c.lessons} {c.lessons === 1 ? 'aula' : 'aulas'}</span>
        </p>
        {live && (
          <div className="mt-2.5 flex items-center gap-2 text-xs font-medium">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-black/15 dark:bg-white/20"><span className="block h-full rounded-full bg-current" style={{ width: `${Math.round(progress * 100)}%` }} /></span>
            faltam {formatDuration(toMin(c.end) - mm)}
          </div>
        )}
      </Tap>
    </div>
  );
}

function WeekGrid({ days, now, showNow, toneOf }: { days: { d: number; items: ClassItem[] }[]; now: Date; showNow: boolean; toneOf: (c: string) => Tone }) {
  const all = days.flatMap((x) => x.items);
  const start = Math.floor(Math.min(...all.map((c) => toMin(c.start))) / 60) * 60;
  const end = Math.ceil(Math.max(...all.map((c) => toMin(c.end))) / 60) * 60;
  const height = (end - start) * PX_PER_MIN;
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  const today = now.getDay();
  const mm = nowMin(now);
  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <Card variant="filled" className="hidden rounded-2xl p-4 lg:block">
      <div className="grid gap-2 pb-3" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map(({ d, items }) => (
          <div key={d} className={cx('rounded-full py-2 text-center', showNow && d === today ? 'bg-primary text-on-primary' : 'text-on-surface-variant')}>
            <p className="text-sm font-semibold">{WEEKDAYS[d]}</p>
            <p className="text-[11px] opacity-80">{items.reduce((a, c) => a + c.lessons, 0)} aulas</p>
          </div>
        ))}
      </div>
      <div className="relative grid gap-2" style={{ gridTemplateColumns: cols, height: height + 12 }}>
        {hours.map((h) => (
          <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-outline-variant/60" style={{ top: (h - start) * PX_PER_MIN }}>
            <span className="absolute -top-2.5 left-0 bg-surface-container pr-2 text-xs text-on-surface-variant tabular">{String(h / 60).padStart(2, '0')}:00</span>
          </div>
        ))}
        <div />
        {days.map(({ d, items }) => (
          <div key={d} className="relative">
            {items.map((c, i) => {
              const t = TONES[toneOf(c.code)];
              const live = showNow && d === today && isLive(c, now);
              return (
                <m.div key={c.code + c.start} className="absolute inset-x-0"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.02 * (d * 3 + i) }}
                  style={{ top: (toMin(c.start) - start) * PX_PER_MIN + 2, height: (toMin(c.end) - toMin(c.start)) * PX_PER_MIN - 4 }}>
                  <Tap to={`/disciplinas/${c.code}`} className={cx('h-full rounded-lg border-l-4 p-2.5', t.container, t.onContainer, live && 'ring-2 ring-primary')}>
                    <p className="text-[11px] font-medium opacity-80 tabular">{c.start}–{c.end}</p>
                    <p className="line-clamp-2 text-sm leading-snug font-semibold">{c.subject}</p>
                    {c.room && <p className="mt-0.5 truncate text-[11px] opacity-75">{c.room}</p>}
                  </Tap>
                </m.div>
              );
            })}
            {showNow && d === today && mm >= start && mm <= end && (
              <div className="pointer-events-none absolute -inset-x-1 z-10 h-0.5 bg-error" style={{ top: (mm - start) * PX_PER_MIN }}>
                <span className="absolute -top-[5px] -left-1 size-3 rounded-full bg-error" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
