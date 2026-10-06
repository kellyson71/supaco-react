// Kit de componentes no estilo Material 3 (Expressive), sobre os tokens --md-* do tema dinâmico.
import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { animate, m, useReducedMotion, type Variants } from 'motion/react';
import type { AbsenceLevel } from '../lib/grades';
import { TONES, type Tone } from '../lib/tones';
import { Link } from './Link';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Curvas e molas do sistema de movimento do M3. */
export const EMPHASIZED = [0.2, 0, 0, 1] as const;
export const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;
export const springBouncy = { type: 'spring', stiffness: 300, damping: 18 } as const;

// ---------- Ícone (Material Symbols Rounded) ----------

export function Icon({ name, fill, size = 24, weight, className, style }: { name: string; fill?: boolean; size?: number; weight?: number; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden className={cx('msr', className)}
      style={{ fontSize: size, width: size, height: size, '--fill': fill ? 1 : 0, '--wght': weight ?? 400, ...style } as CSSProperties}>
      {name}
    </span>
  );
}

// ---------- Ripple ----------

export function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const onPointerDown = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const id = Date.now() + Math.random();
    setRipples((l) => [...l, { id, x: e.clientX - r.left - size / 2, y: e.clientY - r.top - size / 2, size }]);
    setTimeout(() => setRipples((l) => l.filter((x) => x.id !== id)), 600);
  };
  const layer = (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      {ripples.map((r) => <span key={r.id} className="ripple" style={{ left: r.x, top: r.y, width: r.size, height: r.size }} />)}
    </span>
  );
  return { onPointerDown, layer };
}

// ---------- Botões ----------

type BtnVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
const BTN: Record<BtnVariant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline-variant text-on-surface-variant',
  text: 'text-primary',
  elevated: 'bg-surface-container-low text-primary shadow-sm',
};

export function Button({ children, icon, variant = 'filled', size = 'md', onClick, to, href, type = 'button', disabled, className }: {
  children: ReactNode; icon?: string; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; onClick?: () => void; to?: string; href?: string;
  type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const { onPointerDown, layer } = useRipple();
  const sizes = { sm: 'h-9 px-4 text-sm gap-1.5', md: 'h-11 px-5 text-[15px] gap-2', lg: 'h-14 px-7 text-base gap-2.5' };
  const cls = cx('state relative inline-flex items-center justify-center rounded-full font-medium tracking-[0.01em] transition-[border-radius] duration-200 active:rounded-xl disabled:pointer-events-none disabled:opacity-40', BTN[variant], sizes[size], className);
  const inner = <>{layer}{icon && <Icon name={icon} size={size === 'lg' ? 22 : 20} />}<span className="relative">{children}</span></>;
  if (to) return <Link to={to} className={cls}><span onPointerDown={onPointerDown} className="contents">{inner}</span></Link>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" onPointerDown={onPointerDown} className={cls}>{inner}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} onPointerDown={onPointerDown} className={cls}>{inner}</button>;
}

export function IconButton({ icon, label, onClick, variant = 'standard', fill, size = 40, className, to }: {
  icon: string; label: string; onClick?: () => void; variant?: 'standard' | 'tonal' | 'filled' | 'outlined'; fill?: boolean; size?: number; className?: string; to?: string;
}) {
  const { onPointerDown, layer } = useRipple();
  const v = { standard: 'text-on-surface-variant', tonal: 'bg-secondary-container text-on-secondary-container', filled: 'bg-primary text-on-primary', outlined: 'border border-outline-variant text-on-surface-variant' }[variant];
  const cls = cx('state relative inline-flex shrink-0 items-center justify-center rounded-full transition-[border-radius] duration-200 active:rounded-xl', v, className);
  const inner = <>{layer}<Icon name={icon} fill={fill} size={Math.round(size * 0.55)} /></>;
  if (to) return <Link to={to} label={label} className={cls}><span onPointerDown={onPointerDown} className="contents" style={{ width: size, height: size }}>{inner}</span></Link>;
  return <button type="button" aria-label={label} title={label} onClick={onClick} onPointerDown={onPointerDown} className={cls} style={{ width: size, height: size }}>{inner}</button>;
}

// ---------- Cards e superfícies ----------

type CardVariant = 'filled' | 'elevated' | 'outlined' | 'primary' | 'secondary' | 'tertiary';
const CARD: Record<CardVariant, string> = {
  filled: 'bg-surface-container',
  elevated: 'bg-surface-container-low shadow-[0_1px_2px_rgb(0_0_0/0.1),0_2px_6px_rgb(0_0_0/0.06)]',
  outlined: 'bg-surface border border-outline-variant',
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
};

export function Card({ children, className, variant = 'filled', tone }: { children: ReactNode; className?: string; variant?: CardVariant; tone?: Tone }) {
  return <div className={cx('rounded-xl', tone ? cx(TONES[tone].container, TONES[tone].onContainer) : CARD[variant], className)}>{children}</div>;
}

/** Card clicável: camada de estado, ripple e mola no toque. */
export function Tap({ to, href, onClick, children, className, label }: { to?: string; href?: string; onClick?: () => void; children: ReactNode; className?: string; label?: string }) {
  const { onPointerDown, layer } = useRipple();
  const body = (
    <m.div whileTap={{ scale: 0.98 }} transition={spring} onPointerDown={onPointerDown} className={cx('state relative overflow-hidden', className)}>
      {layer}
      {children}
    </m.div>
  );
  if (to) return <Link to={to} label={label} className="block h-full rounded-xl">{body}</Link>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="block h-full rounded-xl">{body}</a>;
  return <button onClick={onClick} aria-label={label} className="block h-full w-full rounded-xl text-left">{body}</button>;
}

export function SectionHeader({ title, icon, action }: { title: string; icon?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-10 items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-[22px] leading-7 font-medium tracking-tight">
        {icon && <Icon name={icon} className="text-primary" fill />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function TopTitle({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {sub && <p className="mb-1 text-sm font-medium text-on-surface-variant">{sub}</p>}
        <h1 className="text-[36px] leading-[44px] font-semibold tracking-tight md:text-[45px] md:leading-[52px]">{title}</h1>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

// ---------- Chips e seleção ----------

export function Chip({ label, icon, selected, onClick, className }: { label: string; icon?: string; selected?: boolean; onClick?: () => void; className?: string }) {
  const { onPointerDown, layer } = useRipple();
  return (
    <button onClick={onClick} onPointerDown={onPointerDown} aria-pressed={selected}
      className={cx('state relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
        selected ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant', className)}>
      {layer}
      {selected ? <Icon name="check" size={18} /> : icon && <Icon name={icon} size={18} />}
      <span className="relative">{label}</span>
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'error' | 'warning' | 'success'; className?: string }) {
  const t = {
    neutral: 'bg-surface-container-highest text-on-surface-variant',
    primary: 'bg-primary-container text-on-primary-container',
    error: 'bg-error-container text-on-error-container',
    warning: 'bg-warning-container text-on-warning-container',
    success: 'bg-success-container text-on-success-container',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', t, className)}>{children}</span>;
}

/** Botões segmentados (M3): opções conectadas, a selecionada ganha ✓. */
export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; className?: string }) {
  const id = useId();
  return (
    <div className={cx('inline-flex h-10 overflow-hidden rounded-full border border-outline', className)} role="radiogroup">
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cx('state relative flex min-w-12 flex-1 items-center justify-center gap-1.5 px-4 text-sm font-medium', i > 0 && 'border-l border-outline', on ? 'text-on-secondary-container' : 'text-on-surface')}>
            {on && <m.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 -z-10 bg-secondary-container" />}
            {on ? <Icon name="check" size={18} /> : o.icon && <Icon name={o.icon} size={18} />}
            <span className="whitespace-nowrap">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Seletor com menu próprio (no lugar do <select> nativo, que o navegador desenha fora do tema).
 * Teclado: setas, Home/End, Enter/Espaço escolhem, Esc fecha. O botão mostra o ícone e o rótulo da opção atual.
 */
export function Select<T extends string>({ value, options, onChange, icon, label, className, menuClassName }: {
  value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void; icon?: string; label: string; className?: string; menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const pick = (v: T) => { onChange(v); setOpen(false); root.current?.querySelector('button')?.focus(); };

  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', out);
    return () => document.removeEventListener('pointerdown', out);
  }, [open]);
  useEffect(() => { if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    const last = options.length - 1;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(last); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[active].value); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={root} className={cx('relative', className)} onKeyDown={onKey}>
      <button type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined} onClick={() => (open ? setOpen(false) : show())}
        className="state relative inline-flex h-12 w-full items-center gap-2 rounded-full border border-outline-variant pr-2 pl-4 text-sm font-medium text-on-surface">
        {icon && <Icon name={icon} size={20} className="text-primary" />}
        <span className="min-w-0 flex-1 truncate text-left">{current?.label ?? label}</span>
        <Icon name="arrow_drop_down" size={20} className={cx('transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label}
          className={cx('no-scrollbar absolute top-full left-0 z-30 mt-1 max-h-72 min-w-full w-max max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-surface-container-high py-2 shadow-[0_8px_28px_rgb(0_0_0/0.28)]', menuClassName)}>
          {options.map((o, i) => (
            <li key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value} onPointerEnter={() => setActive(i)} onClick={() => pick(o.value)}
              className={cx('flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm', i === active && 'bg-on-surface/8', o.value === value ? 'font-medium text-primary' : 'text-on-surface')}>
              <span className="w-[18px] shrink-0">{o.value === value && <Icon name="check" size={18} />}</span>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.hint && <span className="shrink-0 text-xs text-on-surface-variant">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Switch do M3: o polegar cresce e ganha ✓ quando ligado. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx('relative flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors', on ? 'border-primary bg-primary' : 'border-outline bg-surface-container-highest')}>
      <m.span layout transition={spring}
        className={cx('flex items-center justify-center rounded-full', on ? 'ml-auto mr-0.5 size-6 bg-on-primary text-primary' : 'ml-1.5 size-4 bg-outline')}>
        {on && <Icon name="check" size={16} weight={600} />}
      </m.span>
    </button>
  );
}

// ---------- Campo de texto contornado com rótulo flutuante ----------

export function TextField({ id, label, value, onChange, type = 'text', inputMode, autoComplete, autoFocus, trailing, supporting, error }: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; inputMode?: 'numeric' | 'text';
  autoComplete?: string; autoFocus?: boolean; trailing?: ReactNode; supporting?: string; error?: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <input id={id} type={type} inputMode={inputMode} autoComplete={autoComplete} autoFocus={autoFocus} value={value} placeholder=" "
          onChange={(e) => onChange(e.target.value)}
          className={cx('peer h-14 w-full rounded-sm border bg-transparent px-4 pt-1 text-base text-on-surface outline-none transition-colors',
            !!trailing && 'pr-12', error ? 'border-error focus:border-2 focus:border-error' : 'border-outline hover:border-on-surface focus:border-2 focus:border-primary')} />
        <label htmlFor={id}
          className={cx('pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 bg-surface-container-lowest px-1 text-base text-on-surface-variant transition-all duration-200',
            'peer-focus:top-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs',
            error ? 'peer-focus:text-error' : 'peer-focus:text-primary')}>
          {label}
        </label>
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {supporting && <p className={cx('mt-1 px-4 text-xs', error ? 'text-error' : 'text-on-surface-variant')}>{supporting}</p>}
    </div>
  );
}

// ---------- Movimento ----------

const listV: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } } };
const itemV: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EMPHASIZED } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return <m.div variants={listV} initial="hidden" animate="show" className={className}>{children}</m.div>;
}
export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return <m.div variants={itemV} className={className}>{children}</m.div>;
}

export function CountUp({ value, decimals = 0, suffix = '', className }: { value: number | null | undefined; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  useEffect(() => {
    const el = ref.current;
    if (!el || value === null || value === undefined) return;
    if (reduce) { el.textContent = fmt(value); return; }
    const ctl = animate(0, value, { duration: 1, ease: EMPHASIZED, onUpdate: (v) => { el.textContent = fmt(v); } });
    return () => ctl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, suffix, reduce]);
  return <span ref={ref} className={cx('tabular', className)}>{value === null || value === undefined ? '–' : fmt(0)}</span>;
}

// ---------- Progresso ----------

/** Indicador circular do M3: trilho e indicador separados por um pequeno vão. */
export function Ring({ value, size = 64, stroke = 6, color = 'var(--md-primary)', track = 'var(--md-secondary-container)', children, className }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const gap = pct > 0 && pct < 1 ? (stroke * 1.6) / c : 0;
  return (
    <div className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <m.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round"
          initial={{ pathLength: 1, pathOffset: 0 }} animate={{ pathLength: Math.max(0, 1 - pct - gap * 2), pathOffset: pct + gap }}
          transition={{ duration: 1.1, ease: EMPHASIZED, delay: 0.1 }} />
        <m.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 1.1, ease: EMPHASIZED, delay: 0.1 }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Barra de progresso ondulada (M3 Expressive): a parte preenchida vira uma onda que se move. */
export function WavyProgress({ value, color = 'var(--md-primary)', track = 'var(--md-secondary-container)', height = 14, className }: { value: number; color?: string; track?: string; height?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const id = useId().replace(/:/g, '');
  const wl = 24;
  const amp = height / 2 - 3;
  let d = `M 0 ${height / 2}`;
  for (let x = 0; x <= 2400; x += wl) d += ` q ${wl / 4} ${-amp} ${wl / 2} 0 t ${wl / 2} 0`;
  return (
    <div className={cx('relative w-full', className)} style={{ height }}>
      <svg className="absolute inset-0 h-full w-full overflow-hidden" preserveAspectRatio="none">
        <defs>
          <clipPath id={`clip-${id}`}>
            <m.rect x="0" y="0" height="100%" initial={{ width: '0%' }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1.2, ease: EMPHASIZED, delay: 0.15 }} />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>
          <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" className="wave-move" />
        </g>
      </svg>
      <m.div className="absolute top-1/2 right-0 h-1 -translate-y-1/2 rounded-full" style={{ background: track }}
        initial={{ left: '6px' }} animate={{ left: `calc(${pct * 100}% + 6px)` }} transition={{ duration: 1.2, ease: EMPHASIZED, delay: 0.15 }} />
      <span className="absolute top-1/2 right-0 size-1 -translate-y-1/2 rounded-full" style={{ background: color }} />
    </div>
  );
}

/** Barra linear de faltas: indicador grosso + trilho + ponto de parada no limite. */
export const levelColor: Record<AbsenceLevel, { bar: string; text: string; container: string; onContainer: string; icon: string }> = {
  safe: { bar: 'var(--c-success)', text: 'text-success', container: 'bg-success-container', onContainer: 'text-on-success-container', icon: 'sentiment_satisfied' },
  caution: { bar: 'var(--c-warning)', text: 'text-warning', container: 'bg-warning-container', onContainer: 'text-on-warning-container', icon: 'sentiment_neutral' },
  critical: { bar: 'var(--md-error)', text: 'text-error', container: 'bg-error-container', onContainer: 'text-on-error-container', icon: 'sentiment_stressed' },
  over: { bar: 'var(--md-error)', text: 'text-error', container: 'bg-error-container', onContainer: 'text-on-error-container', icon: 'sentiment_very_dissatisfied' },
};

export function AbsenceMeter({ used, limit, level, showLabel = true }: { used: number; limit: number; level: AbsenceLevel; showLabel?: boolean }) {
  if (!limit) return null;
  const pct = Math.min(1, used / limit);
  const left = limit - used;
  const c = levelColor[level];
  return (
    <div>
      <div className="relative flex h-2 items-center gap-1">
        <m.span className="h-2 rounded-full" style={{ background: c.bar }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: EMPHASIZED, delay: 0.15 }} />
        {pct < 1 && <span className="h-2 flex-1 rounded-full bg-surface-container-highest" />}
        {pct < 1 && <span className="absolute right-0.5 size-1 rounded-full" style={{ background: c.bar }} />}
      </div>
      {showLabel && (
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="text-on-surface-variant tabular">{used} de {limit} faltas</span>
          <span className={cx('font-medium', c.text)}>{left < 0 ? `${-left} acima do limite` : left === 0 ? 'no limite' : `${left} ${left === 1 ? 'livre' : 'livres'}`}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Formas expressivas do M3 ----------

function shapePath(lobes: number, depth: number, size = 100) {
  const cx0 = size / 2, R = size / 2 - 1;
  const pts: string[] = [];
  for (let i = 0; i <= 360; i += 2) {
    const a = (i * Math.PI) / 180;
    const r = R * (1 - depth + depth * (0.5 + 0.5 * Math.cos(lobes * a)));
    pts.push(`${(cx0 + r * Math.cos(a)).toFixed(2)},${(cx0 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}
export const SHAPES = { cookie: shapePath(9, 0.12), flower: shapePath(8, 0.22), clover: shapePath(4, 0.28), sunny: shapePath(12, 0.08), soft: shapePath(6, 0.1) };
export type ShapeName = keyof typeof SHAPES;

export function Shape({ shape = 'cookie', size = 48, className, children, spin }: { shape?: ShapeName; size?: number; className?: string; children?: ReactNode; spin?: boolean }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center', !className?.includes('absolute') && 'relative', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={cx('absolute inset-0 size-full fill-current', spin && 'spin-slow')} aria-hidden><path d={SHAPES[shape]} /></svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

// ---------- Estados vazios/erro ----------

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />;

export function Empty({ icon = 'inbox', title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <Shape shape="cookie" size={72} className="mb-4 text-secondary-container"><Icon name={icon} size={32} className="text-on-secondary-container" /></Shape>
      <p className="text-lg font-medium">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-on-surface-variant">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
      <Icon name="cloud_off" />
      <span className="flex-1">Não deu para falar com o SUAP.{navigator.onLine ? '' : ' Você está offline.'}</span>
      {onRetry && <Button variant="text" size="sm" onClick={onRetry} className="!text-on-error-container">Tentar de novo</Button>}
      <span className="sr-only">{error.message}</span>
    </div>
  );
}
