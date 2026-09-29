import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityCalendar, type Activity } from 'react-activity-calendar';
import 'react-activity-calendar/tooltips.css';
import type { DayPresence } from '../lib/semester';
import { isoDay, parseDay } from '../lib/dates';
import { useThemeState } from '../lib/theme';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LEGEND = ['Sem aula', 'Faltou tudo', 'Faltou a maior parte', 'Faltou um pouco', 'Presente'];

/** 0 = sem aula · 1 = faltou tudo · 2 = faltou mais da metade · 3 = faltou menos · 4 = presente */
const levelOf = (d: DayPresence) => (d.absences === 0 ? 4 : d.absences >= d.lessons ? 1 : d.absences / d.lessons > 0.5 ? 2 : 3);

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Mapa de presença estilo GitHub, com as cores do tema Material 3 atual. */
export function PresenceCalendar({ days, from, to }: { days: DayPresence[]; from?: string | null; to?: Date }) {
  const { dark, seed } = useThemeState();

  // As cores dependem do tema aplicado no <html>; recalcula quando ele muda
  const colors = useMemo(() => [
    cssVar('--md-surface-container-highest'),
    cssVar('--md-error'),
    cssVar('--c-warning'),
    cssVar('--c-warning-container'),
    cssVar('--c-success'),
  ], [dark, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo<Activity[]>(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const start = from ?? days[0]?.date ?? isoDay();
    const end = isoDay(to ?? new Date());
    const list: Activity[] = days.filter((d) => d.date >= start && d.date <= end).map((d) => ({ date: d.date, count: d.lessons, level: levelOf(d) }));
    // Pontas vazias para o calendário cobrir o semestre inteiro até hoje
    if (!byDate.has(start)) list.unshift({ date: start, count: 0, level: 0 });
    if (!byDate.has(end) && end > start) list.push({ date: end, count: 0, level: 0 });
    return list;
  }, [days, from, to]);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  // Quadradinhos do tamanho que preenche a largura disponível (entre 12 e 34 px)
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const first = parseDay(data[0]?.date);
  const last = parseDay(data[data.length - 1]?.date);
  const weeks = first && last ? Math.ceil((last.getTime() - first.getTime()) / (7 * 86_400_000)) + 2 : 20;
  const margin = 4;
  const block = width ? Math.max(12, Math.min(34, Math.floor((width - 36) / weeks) - margin)) : 17;

  return (
    <div ref={ref} className="presence-calendar w-full overflow-x-auto">
      <ActivityCalendar
        data={data}
        theme={{ light: colors, dark: colors }}
        colorScheme={dark ? 'dark' : 'light'}
        blockSize={block}
        blockMargin={margin}
        blockRadius={Math.round(block / 4)}
        fontSize={12}
        showColorLegend={false}
        weekStart={1}
        showTotalCount={false}
        showWeekdayLabels={['mon', 'wed', 'fri']}
        labels={{ months: MONTHS, weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], legend: { less: '', more: '' } }}
        tooltips={{
          activity: {
            text: (a) => {
              const d = byDate.get(a.date);
              const when = parseDay(a.date)?.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
              if (!d) return `${when} · sem aula`;
              return `${when} · ${d.lessons} ${d.lessons === 1 ? 'aula' : 'aulas'}${d.absences ? `, ${d.absences} ${d.absences === 1 ? 'falta' : 'faltas'}` : ', presente'}`;
            },
          },
          colorLegend: { text: (level) => LEGEND[level] },
        }}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
        {[4, 3, 2, 1, 0].map((l) => (
          <span key={l} className="flex items-center gap-1.5"><span className="size-3 rounded-[3px]" style={{ background: colors[l] }} />{LEGEND[l]}</span>
        ))}
      </div>
    </div>
  );
}
