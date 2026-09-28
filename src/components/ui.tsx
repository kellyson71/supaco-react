import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AbsenceLevel } from '../lib/grades';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const levelText: Record<AbsenceLevel, string> = {
  safe: 'text-brand', caution: 'text-warn', critical: 'text-bad', over: 'text-bad',
};
const levelBg: Record<AbsenceLevel, string> = {
  safe: 'bg-brand', caution: 'bg-warn', critical: 'bg-bad', over: 'bg-bad',
};

/**
 * Marcas de chamada: cada traço é uma falta permitida, agrupados de 5 como no diário de classe.
 * Traços cheios = faltas usadas; vazados = o que ainda resta.
 */
export function Tally({ used, limit, level, size = 'md' }: { used: number; limit: number; level: AbsenceLevel; size?: 'sm' | 'md' }) {
  if (!limit) return null;
  const h = size === 'sm' ? 'h-2.5' : 'h-3.5';
  // Carga horária muito grande vira barra contínua para não estourar a largura
  if (limit > 50) {
    const pct = Math.min(100, (used / limit) * 100);
    return (
      <div className={cx('relative w-full max-w-48 overflow-hidden rounded-full bg-line', size === 'sm' ? 'h-1.5' : 'h-2')} aria-hidden>
        <div className={cx('h-full rounded-full', levelBg[level])} style={{ width: `${pct}%` }} />
      </div>
    );
  }
  const total = Math.max(limit, used);
  const groups: number[][] = [];
  for (let i = 0; i < total; i += 5) groups.push(Array.from({ length: Math.min(5, total - i) }, (_, k) => i + k));
  return (
    <div className="flex flex-wrap items-end gap-x-1.5 gap-y-1" aria-hidden>
      {groups.map((g, gi) => (
        <div key={gi} className="flex gap-[3px]">
          {g.map((i) => (
            <span
              key={i}
              className={cx(
                'w-[3px] rounded-full',
                h,
                i >= limit ? 'bg-bad' : i < used ? levelBg[level] : 'bg-line',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={cx('rounded-2xl border border-line bg-surface', className)}>{children}</As>;
}

export function Eyebrow({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-none font-semibold tracking-tight md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />;

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
      <AlertCircle size={16} className="shrink-0" />
      <span className="flex-1">Não foi possível carregar do SUAP. {navigator.onLine ? '' : 'Você está offline.'}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline underline-offset-2">Tentar de novo</button>}
      <span className="sr-only">{error.message}</span>
    </div>
  );
}

export function Badge({ tone = 'muted', children }: { tone?: 'muted' | 'brand' | 'warn' | 'bad'; children: ReactNode }) {
  const tones = {
    muted: 'bg-surface-2 text-muted',
    brand: 'bg-brand-soft text-brand',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
