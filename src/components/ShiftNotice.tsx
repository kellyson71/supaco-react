import { AnimatePresence, m } from 'motion/react';
import { useDisciplinas, useShifts, usePeriod } from '../lib/data';
import { decide, shiftKey, type Applied, type Shift } from '../lib/shifts';
import { WEEKDAYS } from '../lib/schedule';
import { Button, Card, cx, EMPHASIZED, Icon } from './ui';

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
    <div className="mb-4 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {pending.map((a) => (
          <m.div key={shiftKey(a.code, a.from, a.to)} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }}>
            <Card variant="tertiary" className="rounded-2xl p-4 md:p-5">
              <div className="flex items-start gap-3">
                <Icon name="event_repeat" fill className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{name(a.code)} parece ter mudado de {day(a.from)} para {day(a.to)}</p>
                  <p className="mt-1 text-sm opacity-85">
                    O SUAP ainda mostra {day(a.from)}, mas {day(a.from)} passou {a.missed} {a.missed === 1 ? 'vez' : 'vezes'} sem nenhuma aula lançada e já saíram {a.held} aulas na {day(a.to)}.
                    Usei o mesmo horário de antes ({a.start}–{a.end}); se a aula começa em outra hora, ajuste.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" icon="check" onClick={() => decide(shiftKey(a.code, a.from, a.to), { status: 'confirmed', start: a.start })}>Está certo</Button>
                    <TimeField a={a} />
                    <Button size="sm" variant="text" onClick={() => decide(shiftKey(a.code, a.from, a.to), { status: 'ignored' })} className="!text-current">Não, voltar ao horário do SUAP</Button>
                  </div>
                </div>
              </div>
            </Card>
          </m.div>
        ))}
      </AnimatePresence>

      {(confirmed.length > 0 || undone.length > 0) && (
        <Card variant="filled" className="rounded-2xl p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-on-surface-variant"><Icon name="event_repeat" size={18} className="text-primary" />Ajustes de horário</p>
          <ul className="flex flex-col gap-1.5">
            {confirmed.map((a) => (
              <li key={shiftKey(a.code, a.from, a.to)} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="min-w-0 flex-1"><b className="font-semibold">{name(a.code)}</b> · {day(a.from)} → {day(a.to)}, {a.start}–{a.end}</span>
                <TimeField a={a} compact />
                <Button size="sm" variant="text" onClick={() => decide(shiftKey(a.code, a.from, a.to), { status: 'ignored' })}>Desfazer</Button>
              </li>
            ))}
            {undone.map((a) => (
              <li key={shiftKey(a.code, a.from, a.to)} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
                <span className="min-w-0 flex-1"><b className="font-semibold">{name(a.code)}</b> · {day(a.from)} → {day(a.to)} (desfeito)</span>
                <Button size="sm" variant="text" onClick={() => decide(shiftKey(a.code, a.from, a.to), null)}>Aplicar de novo</Button>
              </li>
            ))}
          </ul>
        </Card>
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
