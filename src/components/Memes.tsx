import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useCalendario, usePeriod } from '../lib/data';
import { useAttendance } from '../lib/attendance';
import { MEMES, memeSrc, moments, SITUATION } from '../lib/memes';
import { memesOn, setVibe, useVibe } from '../lib/vibe';
import type { Subject } from '../lib/suap';
import { Badge, Button, Card, cx, EMPHASIZED, IconButton, spring } from './ui';

/** Fileira de memes deslizando sem parar (a lista vai duas vezes para emendar o fim no começo). */
function Marquee({ reverse }: { reverse?: boolean }) {
  const list = reverse ? [...MEMES].reverse() : MEMES;
  return (
    <div className="overflow-hidden" aria-hidden>
      <div className={cx('marquee flex w-max gap-2', reverse && 'marquee-reverse')}>
        {[...list, ...list].map((x, i) => (
          <img key={i} src={memeSrc(x.id)} alt="" loading="lazy" decoding="async" className="h-24 w-28 shrink-0 rounded-lg object-cover md:h-28 md:w-36" />
        ))}
      </div>
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
          <Card variant="tertiary" className="relative mb-4 overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-2 pt-3 opacity-90">
              <Marquee />
              <Marquee reverse />
            </div>
            <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[22px] leading-7 font-semibold tracking-tight">Quer desativar o modo sério?</p>
                <p className="mt-1 text-sm opacity-85">O Supaco passa a falar no modo zueira e mostra um meme conforme a sua situação: faltas, notas, fim de semestre. Dá para voltar atrás em Você › Aparência.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="text" onClick={() => setVibe({ asked: true })} className="!text-current">Continuar sério</Button>
                <Button icon="celebration" onClick={() => setVibe({ tone: 'zueira', memes: true, asked: true })}>Bora</Button>
              </div>
            </div>
          </Card>
        </m.section>
      )}
    </AnimatePresence>
  );
}

/** Meme do momento: escolhido pela situação do aluno, com a classificação e o motivo. */
export function MemeCard({ subjects, now, holiday }: { subjects: Subject[]; now: Date; holiday?: boolean }) {
  const vibe = useVibe();
  const { current } = usePeriod();
  const { data: aulas } = useAulas(current);
  const { data: cal } = useCalendario(current);
  const checks = useAttendance();
  const [i, setI] = useState(0);
  const list = useMemo(() => moments({ subjects, now, aulas, checks, cal, holiday }), [subjects, now, aulas, checks, cal, holiday]);

  if (!memesOn(vibe) || !list.length) return null;
  const cur = list[i % list.length];
  const sit = SITUATION[cur.situation];

  return (
    <Card variant="filled" className="mb-4 flex items-stretch gap-4 overflow-hidden rounded-2xl">
      <div className="relative w-32 shrink-0 self-stretch overflow-hidden bg-surface-container-highest sm:w-44">
        <AnimatePresence initial={false}>
          <m.img key={cur.meme.id} src={memeSrc(cur.meme.id)} alt={cur.meme.caption} decoding="async"
            initial={{ opacity: 0, scale: 1.15, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={spring}
            className="absolute inset-0 size-full object-cover" />
        </AnimatePresence>
      </div>
      <div className="flex min-h-32 min-w-0 flex-1 flex-col justify-center gap-1.5 py-4 pr-4">
        <div className="flex items-center gap-2">
          <Badge tone={sit.tone === 'neutral' ? 'neutral' : sit.tone}>{sit.label}</Badge>
          {list.length > 1 && <span className="text-xs text-on-surface-variant tabular">{(i % list.length) + 1} de {list.length}</span>}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={cur.situation} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EMPHASIZED }}>
            <p className="text-lg leading-6 font-semibold">{cur.meme.caption}</p>
            <p className="mt-0.5 text-sm text-on-surface-variant">{cur.text}</p>
          </m.div>
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <div className="flex shrink-0 items-center pr-3">
          <IconButton icon="arrow_forward" label="Próximo meme" variant="tonal" onClick={() => setI((n) => n + 1)} />
        </div>
      )}
    </Card>
  );
}

