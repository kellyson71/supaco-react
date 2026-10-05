// Gráficos pequenos do app, em SVG puro. Seguem as mesmas regras: marcas finas, grade discreta, um rótulo direto
// (o resto fica no tooltip e na tabela para leitor de tela) e cor só na marca, nunca no texto.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { cx } from './ui';

export type ChartPoint = {
  /** Rótulo curto do eixo ("jul"). */
  x: string;
  /** Título no tooltip e na tabela ("julho de 2026"). */
  title: string;
  value: number;
  /** Linhas extras do tooltip. */
  extra?: { label: string; value: string }[];
};

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Escala com limites redondos: devolve os valores das linhas de grade (perto de `lines` delas), do menor ao maior. */
function ticks(min: number, max: number, fromZero: boolean, lines: number) {
  const lo = fromZero ? 0 : min;
  const span = Math.max(max - lo, Math.abs(max) * 0.02, 1);
  const raw = span / lines;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw)! * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v < max + step; v += step) out.push(v);
  return out;
}

/** Só o primeiro, o último e alguns do meio ganham rótulo no eixo, para não embolar. */
const labeled = (i: number, n: number, every: number) => i === n - 1 || (i % every === 0 && n - 1 - i >= every);

function Tooltip({ p, x, width, format, swatch }: { p: ChartPoint; x: number; width: number; format: (n: number) => string; swatch: 'line' | 'rect' }) {
  const left = Math.min(Math.max(x, 96), Math.max(width - 96, 96));
  return (
    <div role="status" className="pointer-events-none absolute top-0 z-10 w-[192px] -translate-x-1/2 rounded-lg bg-inverse-surface px-3 py-2 text-inverse-on-surface shadow-[0_4px_14px_rgb(0_0_0/0.3)]" style={{ left }}>
      <p className="text-[11px] opacity-80">{p.title}</p>
      <p className="flex items-center gap-1.5 text-sm font-semibold tabular">
        <span className={cx('shrink-0 bg-inverse-primary', swatch === 'line' ? 'h-0.5 w-3 rounded-full' : 'size-2 rounded-[2px]')} />{format(p.value)}
      </p>
      {p.extra?.map((e) => (
        <p key={e.label} className="mt-0.5 flex justify-between gap-2 text-[11px] whitespace-nowrap"><span className="opacity-80">{e.label}</span><span className="font-medium tabular">{e.value}</span></p>
      ))}
    </div>
  );
}

function DataTable({ caption, column, points, format }: { caption: string; column: string; points: ChartPoint[]; format: (n: number) => string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th>Período</th><th>{column}</th></tr></thead>
      <tbody>{points.map((p) => <tr key={p.title}><th>{p.title}</th><td>{format(p.value)}</td></tr>)}</tbody>
    </table>
  );
}

/** Navegação pelo teclado e pelo ponteiro, comum aos dois gráficos. */
function useActive(n: number, indexAt: (clientX: number) => number) {
  const [active, setActive] = useState<number | null>(null);
  return {
    active,
    handlers: {
      tabIndex: 0,
      onPointerMove: (e: PointerEvent) => setActive(indexAt(e.clientX)),
      onPointerLeave: () => setActive(null),
      onFocus: () => setActive((a) => a ?? n - 1),
      onBlur: () => setActive(null),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
      },
    },
  };
}

/** A margem esquerda é a calha dos rótulos do eixo, para nenhuma marca passar por cima deles. */
const PAD = { l: 58, r: 12, t: 30, b: 22 };
const GRID = 'var(--md-outline-variant)';
const MUTED = 'var(--md-on-surface-variant)';

/**
 * Linha de uma série só, para mudança ao longo do tempo. `surface` é a cor do cartão em volta,
 * usada no anel dos pontos. O eixo não começa do zero: o que importa aqui é a variação.
 */
export function LineChart({ points, format, axisFormat = format, label, height = 190, surface = 'var(--md-surface-container)' }: {
  points: ChartPoint[]; format: (n: number) => string; axisFormat?: (n: number) => string; label: string; height?: number; surface?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const n = points.length;
  const grid = ticks(Math.min(...points.map((p) => p.value)), Math.max(...points.map((p) => p.value)), false, 2);
  const lo = grid[0], hi = grid[grid.length - 1];
  const plotW = Math.max(width - PAD.l - PAD.r, 1), plotH = height - PAD.t - PAD.b;
  const px = (i: number) => PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const py = (v: number) => PAD.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const { active, handlers } = useActive(n, (clientX) => {
    const rect = ref.current!.getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.round(((clientX - rect.left - PAD.l) / plotW) * (n - 1))));
  });
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.value).toFixed(1)}`).join('');
  const every = Math.max(1, Math.ceil(n / Math.max(Math.floor(plotW / 56), 2)));
  const last = points[n - 1];
  const shown = active ?? n - 1;

  return (
    <div ref={ref} className="relative rounded-lg outline-offset-4" style={{ height }} role="group" aria-label={label} {...handlers}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {grid.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={width - PAD.r} y1={py(v)} y2={py(v)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.l - 8} y={py(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} className="tabular">{axisFormat(v)}</text>
            </g>
          ))}
          <path d={`${path}L${px(n - 1).toFixed(1)},${PAD.t + plotH}L${px(0).toFixed(1)},${PAD.t + plotH}Z`} fill="var(--md-primary)" opacity={0.1} />
          <path d={path} fill="none" stroke="var(--md-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && <line x1={px(active)} x2={px(active)} y1={PAD.t} y2={PAD.t + plotH} stroke={MUTED} strokeWidth={1} />}
          <circle cx={px(shown)} cy={py(points[shown].value)} r={5} fill="var(--md-primary)" stroke={surface} strokeWidth={2} />
          {active === null && (
            <text x={px(n - 1)} y={py(last.value) - 11} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--md-on-surface)" className="tabular">{format(last.value)}</text>
          )}
          {points.map((p, i) => labeled(i, n, every) && (
            <text key={i} x={px(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={11} fill={MUTED}>{p.x}</text>
          ))}
        </svg>
      )}
      {active !== null && width > 0 && <Tooltip p={points[active]} x={px(active)} width={width} format={format} swatch="line" />}
      <DataTable caption={label} column="Valor" points={points} format={format} />
    </div>
  );
}

/** Colunas de uma série só, para comparar poucos períodos. Parte do zero; os valores ficam na grade e no tooltip. */
export function ColumnChart({ points, format, axisFormat = format, label, height = 190 }: {
  points: ChartPoint[]; format: (n: number) => string; axisFormat?: (n: number) => string; label: string; height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const n = points.length;
  const grid = ticks(0, Math.max(...points.map((p) => p.value)), true, 3);
  const hi = grid[grid.length - 1];
  const plotW = Math.max(width - PAD.l - PAD.r, 1), plotH = height - PAD.t - PAD.b;
  const band = plotW / n;
  const bar = Math.min(24, band * 0.6);
  const cx0 = (i: number) => PAD.l + band * (i + 0.5);
  const py = (v: number) => PAD.t + plotH - (v / (hi || 1)) * plotH;
  const { active, handlers } = useActive(n, (clientX) => {
    const rect = ref.current!.getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.floor((clientX - rect.left - PAD.l) / band)));
  });
  const base = PAD.t + plotH;

  return (
    <div ref={ref} className="relative rounded-lg outline-offset-4" style={{ height }} role="group" aria-label={label} {...handlers}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          {grid.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={width - PAD.r} y1={py(v)} y2={py(v)} stroke={GRID} strokeWidth={1} />
              {v > 0 && <text x={PAD.l - 8} y={py(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} className="tabular">{axisFormat(v)}</text>}
            </g>
          ))}
          {points.map((p, i) => {
            const top = py(p.value), h = Math.max(base - top, 1), r = Math.min(4, h, bar / 2);
            const x = cx0(i) - bar / 2;
            return (
              <g key={p.title}>
                {/* Ponta arredondada só em cima: a base fica reta, apoiada no eixo */}
                <path d={`M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bar - r}Q${x + bar},${top} ${x + bar},${top + r}V${base}Z`}
                  fill="var(--md-primary)" opacity={active === null || active === i ? 1 : 0.45} />
                <text x={cx0(i)} y={height - 6} textAnchor="middle" fontSize={11} fill={MUTED} className="tabular">{p.x}</text>
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && width > 0 && <Tooltip p={points[active]} x={cx0(active)} width={width} format={format} swatch="rect" />}
      <DataTable caption={label} column="Valor" points={points} format={format} />
    </div>
  );
}
