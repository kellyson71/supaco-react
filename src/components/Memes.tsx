import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useCalendario, usePeriod } from '../lib/data';
import { useAttendance } from '../lib/attendance';
import { MEMES, memeSrc, nextSkip, reactions, type NextSkip } from '../lib/memes';
import { memesOn, setVibe, useVibe } from '../lib/vibe';
import type { Subject } from '../lib/suap';
import { Button, Card, cx, EMPHASIZED, spring, Tap } from './ui';

const REEL = Object.keys(MEMES);

/** Dois memes por vez, trocando em sequência: um entra pela direita enquanto o outro sai. */
function MemeReel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(id);
  }, []);
  // Cada posição troca numa batida diferente, para as duas não mudarem juntas
  const slots = [REEL[Math.floor((i + 1) / 2) * 2 % REEL.length], REEL[(Math.floor(i / 2) * 2 + 1) % REEL.length]];
  return (
    <div className="flex shrink-0 justify-center gap-3" aria-hidden>
      {slots.map((id, k) => (
        <div key={k} className={cx('relative size-28 overflow-hidden rounded-xl bg-black shadow-lg sm:size-32', k === 0 ? '-rotate-3' : 'mt-3 rotate-3')}>
          <AnimatePresence initial={false}>
            <m.img key={id} src={memeSrc(id)} alt="" decoding="async"
              initial={{ x: '100%', opacity: 0.4 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-100%', opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute inset-0 size-full object-cover" />
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/** Convite da primeira visita: sair do modo sério e ligar os memes. */
export function VibePrompt() {
  const vibe = useVibe();
  return (
    <AnimatePresence initial={false}>
      {!vibe.asked && (
        <m.section key="vibe" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: EMPHASIZED }} className="overflow-hidden">
          <Card variant="tertiary" className="mb-4 flex flex-col items-center gap-5 overflow-hidden rounded-2xl p-5 sm:flex-row md:p-6">
            <MemeReel />
            <div className="min-w-0 flex-1">
              <p className="text-[22px] leading-7 font-semibold tracking-tight">Quer desativar o modo sério?</p>
              <p className="mt-1 text-sm opacity-85">o supaco para de falar igual e-mail da coordenação e te diz logo se dá pra faltar a próxima aula. dá pra voltar atrás em Você › Aparência.</p>
              <div className="mt-4 flex gap-2">
                <Button icon="celebration" onClick={() => setVibe({ tone: 'zueira', memes: true, asked: true })}>bora</Button>
                <Button variant="text" onClick={() => setVibe({ asked: true })} className="!text-current">sou sério</Button>
              </div>
            </div>
          </Card>
        </m.section>
      )}
    </AnimatePresence>
  );
}

const HERO: Record<NextSkip['verdict'], string> = {
  pode: 'bg-success-container text-on-success-container',
  reflita: 'bg-warning-container text-on-warning-container',
  zerou: 'bg-error-container text-on-error-container',
  estourou: 'bg-error-container text-on-error-container',
};

/**
 * Topo da Hoje no modo zueira: dá para faltar a próxima aula? A resposta vem numa frase,
 * com o meme do lado (quando os memes estão ligados) e os números de verdade embaixo.
 */
export function SkipHero({ subjects, now, holiday }: { subjects: Subject[]; now: Date; holiday?: boolean }) {
  const vibe = useVibe();
  const { current } = usePeriod();
  const { data: aulas } = useAulas(current);
  const { data: cal } = useCalendario(current);
  const checks = useAttendance();
  const next = useMemo(() => nextSkip(subjects, now, holiday), [subjects, now, holiday]);
  const extras = useMemo(() => reactions({ subjects, now, aulas, checks, cal, holiday }), [subjects, now, aulas, checks, cal, holiday]);

  if (vibe.tone !== 'zueira' || (!next && !extras.length)) return null;
  const memes = memesOn(vibe);
  const h = next && HERO[next.verdict];

  return (
    <div className="mb-4 flex flex-col gap-2">
      {next && h && (
        <Tap to={`/disciplinas/${next.subject.code}`} className={cx('flex flex-col overflow-hidden rounded-2xl sm:flex-row', h)}>
          {memes && (
            <m.img key={next.meme} src={memeSrc(next.meme)} alt={MEMES[next.meme]} decoding="async"
              initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
              className="max-h-64 w-full bg-black object-contain sm:max-h-72 sm:w-auto sm:max-w-[46%]" />
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5 md:p-6">
            <p className="text-sm font-medium opacity-80">
              dá pra faltar {next.subject.name}, {next.when} às {next.item.start}?
            </p>
            <p className="text-[26px] leading-8 font-semibold tracking-tight md:text-[32px] md:leading-10">{next.line}</p>
            <p className="text-sm opacity-80 tabular">
              {next.subject.absences} de {next.subject.limit} faltas usadas
              {next.verdict !== 'estourou' && <> · faltando essa ({next.item.lessons} {next.item.lessons === 1 ? 'aula' : 'aulas'}) {next.leftAfter < 0 ? `estoura em ${-next.leftAfter}` : `sobram ${next.leftAfter}`}</>}
            </p>
          </div>
        </Tap>
      )}
      {extras.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {extras.map((r, i) => (
            <m.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06, duration: 0.3, ease: EMPHASIZED }}
              className="flex items-center gap-3 overflow-hidden rounded-2xl bg-surface-container">
              {memes && <img src={memeSrc(r.meme)} alt={MEMES[r.meme]} loading="lazy" decoding="async" className="size-20 shrink-0 object-cover" />}
              <p className={cx('min-w-0 flex-1 py-3 pr-4 text-[15px] leading-5 font-medium', !memes && 'pl-4')}>{r.line}</p>
            </m.li>
          ))}
        </ul>
      )}
    </div>
  );
}
