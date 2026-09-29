import { useMemo } from 'react';
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

  return (
    <div className="presence-calendar -mx-1 overflow-x-auto px-1">
      <ActivityCalendar
        data={data}
        theme={{ light: colors, dark: colors }}
        colorScheme={dark ? 'dark' : 'light'}
        blockSize={17}
        blockMargin={4}
        blockRadius={4}
        fontSize={12}
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
    </div>
  );
}
