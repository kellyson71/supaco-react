import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useDisciplinas, usePeriod } from '../lib/data';
import { classesOn, nowMin, toMin, WEEKDAYS, WEEKDAYS_SHORT, type ClassItem } from '../lib/schedule';
import { useNow } from '../lib/hooks';
import { Card, cx, Empty, ErrorNote, PageHeader, Skeleton } from '../components/ui';
import { PeriodSelect } from '../components/PeriodSelect';
import { Link } from '../components/Shell';

const PX_PER_MIN = 1.15;

export function Schedule() {
  const now = useNow();
  const { period, current } = usePeriod();
  const { data, error, loading, refresh } = useDisciplinas(period);
  const isCurrent = period?.label === current?.label;
  const today = now.getDay();

  const days = [1, 2, 3, 4, 5, 6].map((d) => ({ d, items: data ? classesOn(data, d) : [] }))
    .filter(({ d, items }) => d <= 5 || items.length > 0);
  const [sel, setSel] = useState(() => (today >= 1 && today <= 6 ? today : 1));
  const selected = days.find((x) => x.d === sel) ?? days[0];

  const all = days.flatMap((x) => x.items);
  const empty = data && all.length === 0;

  return (
    <div className="rise">
      <PageHeader title="Horário" subtitle="Toque numa aula para ver notas e faltas" right={<PeriodSelect />} />
      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <Skeleton className="h-96" />}
      {empty && <Card><Empty title="Sem horários cadastrados">O SUAP não informou horários de aula para este período.</Empty></Card>}

      {data && !empty && (
        <>
          {/* Mobile: um dia por vez */}
          <div className="md:hidden">
            <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
              {days.map(({ d, items }) => (
                <button
                  key={d}
                  onClick={() => setSel(d)}
                  className={cx(
                    'flex min-w-14 flex-col items-center rounded-2xl border px-3 py-2 transition-colors',
                    sel === d ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface',
                  )}
                >
                  <span className="text-xs font-semibold">{WEEKDAYS_SHORT[d]}</span>
                  <span className={cx('font-mono text-[11px]', sel === d ? 'opacity-80' : 'text-muted')}>{items.length ? `${items.reduce((a, c) => a + c.lessons, 0)} aulas` : '—'}</span>
                  {isCurrent && d === today && <span className={cx('mt-1 size-1 rounded-full', sel === d ? 'bg-brand-ink' : 'bg-brand')} />}
                </button>
              ))}
            </div>
            {selected.items.length === 0 ? (
              <Card><Empty title={`Sem aulas na ${WEEKDAYS[selected.d].toLowerCase()}`} /></Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {selected.items.map((c) => <ClassCard key={c.code + c.start} c={c} live={isCurrent && selected.d === today && isLive(c, now)} />)}
              </div>
            )}
          </div>

          {/* Desktop: semana em grade proporcional ao tempo */}
          <WeekGrid days={days} now={now} showNow={isCurrent} />
        </>
      )}
    </div>
  );
}

const isLive = (c: ClassItem, now: Date) => toMin(c.start) <= nowMin(now) && nowMin(now) < toMin(c.end);

function ClassCard({ c, live, compact }: { c: ClassItem; live?: boolean; compact?: boolean }) {
  return (
    <Link
      to={`/disciplinas/${c.code}`}
      className={cx(
        'block h-full overflow-hidden rounded-xl border-l-[3px] transition-colors',
        live ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2',
        compact ? 'px-2.5 py-1.5' : 'border border-l-[3px] px-4 py-3',
      )}
    >
      <p className={cx('font-mono text-muted', compact ? 'text-[10px]' : 'text-xs')}>{c.start}–{c.end}</p>
      <p className={cx('font-medium leading-snug', compact ? 'line-clamp-2 text-[13px]' : 'mt-0.5')}>{c.subject}</p>
      {c.room && (
        <p className={cx('flex items-center gap-1 truncate text-muted', compact ? 'text-[11px]' : 'mt-1 text-sm')}>
          {!compact && <MapPin size={13} />}{c.room}
        </p>
      )}
    </Link>
  );
}

function WeekGrid({ days, now, showNow }: { days: { d: number; items: ClassItem[] }[]; now: Date; showNow: boolean }) {
  const all = days.flatMap((x) => x.items);
  const start = Math.floor(Math.min(...all.map((c) => toMin(c.start))) / 60) * 60;
  const end = Math.ceil(Math.max(...all.map((c) => toMin(c.end))) / 60) * 60;
  const height = (end - start) * PX_PER_MIN;
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  const today = now.getDay();
  const m = nowMin(now);

  return (
    <Card className="hidden overflow-hidden md:block">
      <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map(({ d }) => (
          <div key={d} className={cx('px-2 py-3 text-center text-sm font-semibold', showNow && d === today ? 'text-brand' : 'text-muted')}>{WEEKDAYS[d]}</div>
        ))}
      </div>
      <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)`, height: height + 12 }}>
        {hours.map((h) => (
          <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: (h - start) * PX_PER_MIN }}>
            <span className="absolute -top-2 left-2 bg-surface px-1 font-mono text-[10px] text-muted">{String(h / 60).padStart(2, '0')}h</span>
          </div>
        ))}
        <div />
        {days.map(({ d, items }) => (
          <div key={d} className={cx('relative border-l border-line/70', showNow && d === today && 'bg-brand-soft/30')}>
            {items.map((c) => (
              <div key={c.code + c.start} className="absolute inset-x-1" style={{ top: (toMin(c.start) - start) * PX_PER_MIN + 1, height: (toMin(c.end) - toMin(c.start)) * PX_PER_MIN - 2 }}>
                <ClassCard c={c} compact live={showNow && d === today && isLive(c, now)} />
              </div>
            ))}
            {showNow && d === today && m >= start && m <= end && (
              <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-bad" style={{ top: (m - start) * PX_PER_MIN }}>
                <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-bad" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
