import { usePeriod } from '../lib/data';
import { Icon } from './ui';

/** Seletor de período no formato de "assist chip" com menu nativo. */
export function PeriodSelect() {
  const { periods, period, setPeriod } = usePeriod();
  if (!period) return null;
  return (
    <label className="state relative inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant pr-3 pl-3 text-sm font-medium text-on-surface-variant">
      <Icon name="date_range" size={18} className="text-primary" />
      <span className="sr-only">Período letivo</span>
      <select value={period.label} onChange={(e) => setPeriod(e.target.value)} disabled={periods.length < 2}
        className="cursor-pointer appearance-none bg-transparent pr-5 text-on-surface outline-none disabled:cursor-default">
        {periods.map((p, i) => <option key={p.label} value={p.label}>{p.label}{i === 0 ? ' (atual)' : ''}</option>)}
      </select>
      {periods.length > 1 && <Icon name="arrow_drop_down" size={20} className="pointer-events-none absolute right-2" />}
    </label>
  );
}
