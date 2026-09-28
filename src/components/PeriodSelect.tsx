import { ChevronDown } from 'lucide-react';
import { usePeriod } from '../lib/data';

export function PeriodSelect() {
  const { periods, period, setPeriod } = usePeriod();
  if (periods.length < 2) return period ? <span className="font-mono text-sm text-muted">{period.label}</span> : null;
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Período letivo</span>
      <select
        value={period?.label}
        onChange={(e) => setPeriod(e.target.value)}
        className="appearance-none rounded-xl border border-line bg-surface py-2 pr-9 pl-3 font-mono text-sm font-medium outline-none focus:border-brand"
      >
        {periods.map((p, i) => <option key={p.label} value={p.label}>{p.label}{i === 0 ? ' (atual)' : ''}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 text-muted" />
    </label>
  );
}
