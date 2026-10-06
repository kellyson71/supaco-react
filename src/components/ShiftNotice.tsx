import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useDisciplinas, useShifts, usePeriod } from '../lib/data';
import { decide, shiftKey, type Applied, type Shift } from '../lib/shifts';
import { WEEKDAYS } from '../lib/schedule';
import { Button, cx, EMPHASIZED, Icon } from './ui';

const day = (d: number) => WEEKDAYS[d].toLowerCase();

/**
 * Avisa quando as aulas de uma matéria acontecem num dia diferente do horário do SUAP.
 * `all` mostra também as já confirmadas e as desfeitas (tela de Horário); sem ele, só o que ainda pede uma resposta.
 */
export function ShiftNotice({ all }: { all?: boolean }) {
  const { current } = usePeriod();
  const { applied, ignored } = useShifts(current);
  const { data: subjects } = useDisciplinas(current);
  const name = (code: string) => subjects?.find((s) => s.code === code)?.name ?? code;

  const pending = applied.filter((a) => a.status === 'auto');
  const confirmed = all ? applied.filter((a) => a.status === 'confirmed') : [];
  const undone = all ? ignored : [];
  if (!pending.length && !confirmed.length && !undone.length) return null;

  return (
    <div className="mb-3 flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {pending.map((a) => (
          <m.div key={shiftKey(a.code, a.from, a.to)} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EMPHASIZED }}>
            <PendingShift a={a} name={name(a.code)} />
          </m.div>
        ))}
      </AnimatePresence>

      {(confirmed.length > 0 || undone.length > 0) && <Adjustments confirmed={confirmed} undone={undone} name={name} />}
    </div>
  );
}

/** Uma linha só ("Estrutura de Dados · seg → ter?") com a resposta rápida; a explicação e os ajustes abrem ao tocar. */
function PendingShift({ a, name }: { a: Applied; name: string }) {
  const [open, setOpen] = useState(false);
  const key = shiftKey(a.code, a.from, a.to);
  return (
    <div className="rounded-xl bg-surface-container-low text-on-surface-variant">
      <div className="flex items-center gap-1 pr-1 pl-3">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left text-sm">
          <Icon name="event_repeat" size={18} className="shrink-0 text-tertiary" />
          <span className="min-w-0 flex-1 truncate"><b className="font-medium text-on-surface">{name}</b> mudou de {day(a.from)} para {day(a.to)}?</span>
          <Icon name="expand_more" size={18} className={cx('shrink-0 transition-transform duration-300 ease-emphasized', open && 'rotate-180')} />
        </button>
        <Button size="sm" variant="text" onClick={() => decide(key, { status: 'confirmed', start: a.start })}>Sim</Button>
      </div>
      {open && (
        <div className="px-3 pb-3 text-sm">
          <p>
            O SUAP ainda mostra {day(a.from)}, mas {day(a.from)} passou {a.missed} {a.missed === 1 ? 'vez' : 'vezes'} sem nenhuma aula lançada e já saíram {a.held} aulas na {day(a.to)}.
            Usei o mesmo horário de antes ({a.start}–{a.end}).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <TimeField a={a} compact />
            <Button size="sm" variant="text" onClick={() => decide(key, { status: 'ignored' })}>Voltar ao horário do SUAP</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ajustes já confirmados ou desfeitos (tela de Horário), recolhidos até a pessoa querer mexer. */
function Adjustments({ confirmed, undone, name }: { confirmed: Applied[]; undone: Shift[]; name: (code: string) => string }) {
  const [open, setOpen] = useState(false);
  const n = confirmed.length + undone.length;
  return (
    <div className="rounded-xl bg-surface-container-low text-on-surface-variant">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm">
        <Icon name="event_repeat" size={18} className="shrink-0 text-primary" />
        <span className="flex-1">Ajustes de horário ({n})</span>
        <Icon name="expand_more" size={18} className={cx('shrink-0 transition-transform duration-300 ease-emphasized', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-3 pb-3">
          {confirmed.map((a) => (
            <li key={shiftKey(a.code, a.from, a.to)} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 flex-1"><b className="font-medium text-on-surface">{name(a.code)}</b> · {day(a.from)} → {day(a.to)}, {a.start}–{a.end}</span>
              <TimeField a={a} compact />
              <Button size="sm" variant="text" onClick={() => decide(shiftKey(a.code, a.from, a.to), { status: 'ignored' })}>Desfazer</Button>
            </li>
          ))}
          {undone.map((a) => (
            <li key={shiftKey(a.code, a.from, a.to)} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 flex-1"><b className="font-medium text-on-surface">{name(a.code)}</b> · {day(a.from)} → {day(a.to)} (desfeito)</span>
              <Button size="sm" variant="text" onClick={() => decide(shiftKey(a.code, a.from, a.to), null)}>Aplicar de novo</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Corrige a hora em que a aula começa no dia novo (o fim acompanha). */
function TimeField({ a, compact }: { a: Applied | (Shift & { status?: string }); compact?: boolean }) {
  return (
    <label className={cx('flex items-center gap-2 text-sm', compact ? 'text-on-surface-variant' : 'rounded-full bg-white/45 py-1 pr-2 pl-3 dark:bg-black/25')}>
      começa às
      <input type="time" value={a.start} step={300} aria-label={`Hora em que ${a.code} começa`}
        onChange={(e) => e.target.value && decide(shiftKey(a.code, a.from, a.to), { status: 'confirmed', start: e.target.value })}
        className="rounded-md bg-transparent px-1 py-0.5 font-medium tabular outline-none focus-visible:ring-2 focus-visible:ring-primary" />
    </label>
  );
}
