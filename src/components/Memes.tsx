import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useAvaliacoes, useCalendario, usePeriod } from '../lib/data';
import { decide, loadPlans, MEMES, memeSrc, planKey, reply, savePlans, say, upcoming, type Choice, type Decision } from '../lib/memes';
import { memesOn, setVibe, useVibe } from '../lib/vibe';
import type { Subject } from '../lib/suap';
import { Button, Card, Chip, cx, EMPHASIZED, Icon, spring } from './ui';
import { Link } from './Link';

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

const HERO: Record<Decision['verdict'], { box: string; tag: string }> = {
  pode: { box: 'bg-success-container text-on-success-container', tag: 'pode' },
  depende: { box: 'bg-warning-container text-on-warning-container', tag: 'depende' },
  'melhor-nao': { box: 'bg-error-container text-on-error-container', tag: 'melhor não' },
  zerou: { box: 'bg-error-container text-on-error-container', tag: 'não' },
  estourou: { box: 'bg-error-container text-on-error-container', tag: 'já era' },
};

/**
 * Topo da Hoje no modo zueira: dá para faltar a próxima aula? A decisão pesa faltas, notas,
 * avaliação marcada e a altura do semestre; a resposta vem numa frase, com meme e os motivos.
 */
export function SkipHero({ subjects, now, holiday }: { subjects: Subject[]; now: Date; holiday?: boolean }) {
  const vibe = useVibe();
  const { current } = usePeriod();
  const { data: aulas } = useAulas(current);
  const { data: cal } = useCalendario(current);
  const { data: avaliacoes } = useAvaliacoes();
  const [sel, setSel] = useState(0);
  const [roll, setRoll] = useState(0);
  const [plans, setPlans] = useState(loadPlans);

  const targets = useMemo(() => upcoming(subjects, now, holiday), [subjects, now, holiday]);
  const target = targets[Math.min(sel, targets.length - 1)];
  const decision = useMemo(() => (target ? decide(target, { subjects, now, aulas, cal, avaliacoes }) : null), [target, subjects, now, aulas, cal, avaliacoes]);

  if (vibe.tone !== 'zueira' || !decision) return null;
  const memes = memesOn(vibe);
  const h = HERO[decision.verdict];
  const { line, meme } = say(decision, now, roll);
  const key = planKey(decision.target);
  const plan = plans[key];
  const { facts } = decision;

  const choose = (choice: Choice | null) => {
    const next = { ...plans };
    if (choice) next[key] = choice; else delete next[key];
    setPlans(next);
    savePlans(next);
    if (choice === 'faltar' && decision.verdict === 'pode') {
      import('canvas-confetti').then(({ default: confetti }) => confetti({ particleCount: 60, spread: 60, origin: { y: 0.25 }, disableForReducedMotion: true }));
    }
  };

  return (
    <div className="mb-4">
      {/* Qual aula: a próxima vem marcada, dá para olhar as seguintes */}
      {targets.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {targets.map((t, i) => (
            <Chip key={planKey(t)} selected={i === sel} onClick={() => { setSel(i); setRoll(0); }}
              label={`${i === 0 ? 'próxima' : t.when} · ${t.item.start} · ${t.subject.name.split(' ').slice(0, 2).join(' ')}`} />
          ))}
        </div>
      )}

      <div className={cx('flex flex-col overflow-hidden rounded-2xl sm:flex-row', h.box)}>
        {memes && (
          <button onClick={() => setRoll(roll + 1)} aria-label="Outra resposta" className="relative shrink-0 bg-black sm:w-[42%] sm:max-w-80">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.img key={meme + key} src={memeSrc(meme)} alt={MEMES[meme]} decoding="async"
                initial={{ opacity: 0, scale: 1.1, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={spring}
                className="max-h-64 w-full object-contain sm:h-full sm:max-h-80" />
            </AnimatePresence>
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 md:p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="rounded-full bg-white/50 px-2.5 py-0.5 dark:bg-black/25">{h.tag}</span>
            <span className="min-w-0 truncate opacity-80">faltar {decision.target.subject.name}, {decision.target.when} às {decision.target.item.start}?</span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.p key={line} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EMPHASIZED }}
              className="text-[24px] leading-8 font-semibold tracking-tight md:text-[30px] md:leading-9">
              {plan ? reply(plan, decision.verdict, key) : line}
            </m.p>
          </AnimatePresence>

          {/* Os motivos de verdade por trás da resposta */}
          <ul className="flex flex-wrap gap-1.5">
            {decision.factors.slice(0, 5).map((f) => (
              <li key={f.reason} className="flex items-center gap-1 rounded-full bg-white/45 px-2.5 py-1 text-xs font-medium dark:bg-black/25">
                <Icon name={f.weight > 0 ? 'check' : 'priority_high'} size={14} weight={600} />{f.label}
              </li>
            ))}
          </ul>

          <p className="text-sm opacity-80 tabular">
            {facts.used} de {facts.limit} faltas usadas
            {decision.verdict !== 'estourou' && <> · faltando essa ({facts.cost} {facts.cost === 1 ? 'aula' : 'aulas'}) {facts.after < 0 ? `estoura em ${-facts.after}` : `sobram ${facts.after}`}</>}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {plan ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1.5 text-sm font-medium dark:bg-black/25">
                  <Icon name={plan === 'faltar' ? 'weekend' : 'school'} size={18} fill />{plan === 'faltar' ? 'você vai faltar' : 'você vai pra aula'}
                </span>
                <Button variant="text" size="sm" onClick={() => choose(null)} className="!text-current">mudei de ideia</Button>
              </>
            ) : (
              <>
                <Button size="sm" icon="weekend" onClick={() => choose('faltar')}>vou faltar</Button>
                <Button size="sm" variant="tonal" icon="school" onClick={() => choose('aula')}>vou pra aula</Button>
                <Button size="sm" variant="text" icon="refresh" onClick={() => setRoll(roll + 1)} className="!text-current">outra</Button>
              </>
            )}
            <span className="flex-1" />
            <Link to={`/disciplinas/${decision.target.subject.code}`} label={`Abrir ${decision.target.subject.name}`} className="state flex size-9 items-center justify-center rounded-full"><Icon name="arrow_outward" size={20} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
