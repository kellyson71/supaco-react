import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useCalendario, useDisciplinas, usePeriod } from '../lib/data';
import { classesOn, nowMin, toMin, WEEKDAYS, WEEKDAYS_SHORT, type ClassItem } from '../lib/schedule';
import { useNow } from '../lib/hooks';
import { subjectTone } from '../lib/suap';
import { TONES, toneFor, type Tone } from '../lib/tones';
import { downloadIcs } from '../lib/ics';
import { parseDay } from '../lib/dates';
import { Badge, Button, Card, cx, EMPHASIZED, Empty, ErrorNote, Icon, Segmented, Skeleton, spring, Tap, TopTitle } from '../components/ui';
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
          {data && !empty && <Button variant="tonal" icon="calendar_add_on" onClick={exportIcs}>Exportar para agenda</Button>}
        </>} />
      {isCurrent && <ShiftNotice all />}
      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <Skeleton className="h-96" />}
      {empty && <Card className="rounded-2xl"><Empty icon="calendar_view_week" title="Sem horários cadastrados">O SUAP não informou horários de aula para este período.</Empty></Card>}

      {data && !empty && (
        <>
          <div className="lg:hidden">
            <Segmented value={sel} onChange={setSel} className="mb-4 w-full"
              options={days.map(({ d }) => ({ value: String(d), label: WEEKDAYS_SHORT[d] }))} />
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={selected.d} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: EMPHASIZED }}>
                {selected.items.length === 0 ? (
                  <Card className="rounded-2xl"><Empty icon="weekend" title={`${WEEKDAYS[selected.d]} livre`}>Nenhuma aula nesse dia.</Empty></Card>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.items.map((c) => (
                      <ClassRow key={c.code + c.start} c={c} tone={toneOf(c.code)} live={isCurrent && selected.d === today && isLive(c, now)} past={isCurrent && selected.d === today && toMin(c.end) <= nowMin(now)} />
                    ))}
                  </div>
                )}
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

function ClassRow({ c, tone, live, past }: { c: ClassItem; tone: Tone; live?: boolean; past?: boolean }) {
  const t = TONES[tone];
  return (
    <Tap to={`/disciplinas/${c.code}`} className={cx('flex items-stretch gap-4 rounded-xl p-4', t.container, t.onContainer, past && 'opacity-60')}>
      <div className="w-14 shrink-0 text-sm leading-tight tabular">
        <p className="text-base font-semibold">{c.start}</p>
        <p className="opacity-75">{c.end}</p>
      </div>
      <span className={cx('w-1 shrink-0 rounded-full', t.color)} />
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-6 font-medium">{c.subject}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm opacity-80">
          {c.room && <span className="flex items-center gap-1"><Icon name="location_on" size={16} />{c.room}</span>}
          <span>{c.lessons} {c.lessons === 1 ? 'aula' : 'aulas'}</span>
        </p>
      </div>
      {live && <Badge tone="primary" className="self-start">agora</Badge>}
    </Tap>
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
