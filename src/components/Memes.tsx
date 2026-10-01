import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAulas, useAvaliacoes, useCalendario, useParciais, usePeriod, useTasks } from '../lib/data';
import { classroom } from '../lib/classroom';
import { dayTargets, decideDay, linesFor, loadPlans, MEMES, memeSrc, memesFor, planKey, REASONS, reply, savePlans, say, verdictOf, type Choice, type DayDecision, type Reason, type Verdict } from '../lib/memes';
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

const HERO: Record<Verdict, { box: string; tag: string; dot: string }> = {
  pode: { box: 'bg-success-container text-on-success-container', tag: 'pode', dot: 'bg-success' },
  depende: { box: 'bg-warning-container text-on-warning-container', tag: 'depende', dot: 'bg-warning' },
  'melhor-nao': { box: 'bg-error-container text-on-error-container', tag: 'melhor não', dot: 'bg-error' },
  zerou: { box: 'bg-error-container text-on-error-container', tag: 'não', dot: 'bg-error' },
  estourou: { box: 'bg-error-container text-on-error-container', tag: 'já era', dot: 'bg-error' },
};

const short = (name: string) => name.split(' ').slice(0, 2).join(' ');

/**
 * Topo da Hoje no modo zueira: dá para faltar o dia? O veredito vale para todas as aulas que restam
 * (o pior caso manda), e dá para olhar cada matéria sozinha para ver se dá para gazear só ela.
 */
export function SkipHero({ subjects, now, holiday }: { subjects: Subject[]; now: Date; holiday?: boolean }) {
  const vibe = useVibe();
  const { current } = usePeriod();
  const { data: aulas } = useAulas(current);
  const { data: cal } = useCalendario(current);
  const { data: avaliacoes } = useAvaliacoes();
  const { data: parciais } = useParciais(current);
  const { data: tasks } = useTasks(classroom.linked && classroom.tokenValid);
  /** -1 = o dia todo; senão, o índice da aula. */
  const [sel, setSel] = useState(-1);
  const [roll, setRoll] = useState(0);
  const [plans, setPlans] = useState(loadPlans);
  const [debug, setDebug] = useState(false);
  const [forced, setForced] = useState<{ reason: Reason; line: number } | null>(null);

  const targets = useMemo(() => dayTargets(subjects, now, holiday), [subjects, now, holiday]);
  const day = useMemo(() => decideDay(targets, { subjects, now, aulas, cal, avaliacoes, parciais, tasks }), [targets, subjects, now, aulas, cal, avaliacoes, parciais, tasks]);

  if (vibe.tone !== 'zueira' || !day) return null;
  const memes = memesOn(vibe);
  const single = sel >= 0 ? day.decisions[Math.min(sel, day.decisions.length - 1)] : null;
  const decision = single ?? day.pivot;
  const verdict = forced ? verdictOf(forced.reason) : single ? single.verdict : day.verdict;
  const h = HERO[verdict];
  const said = forced
    ? { line: linesFor(forced.reason)[forced.line], meme: memesFor(forced.reason)[(forced.line + roll) % memesFor(forced.reason).length] }
    : say(decision, now, roll);
  const scope = single ? [single.target] : targets;
  const keys = scope.map(planKey);
  const plan = keys.every((k) => plans[k] === plans[keys[0]]) ? plans[keys[0]] : undefined;
  const { facts } = decision;
  const when = targets[0].when;

  const choose = (choice: Choice | null) => {
    const next = { ...plans };
    keys.forEach((k) => { if (choice) next[k] = choice; else delete next[k]; });
    setPlans(next);
    savePlans(next);
    if (choice === 'faltar' && verdict === 'pode') {
      import('canvas-confetti').then(({ default: confetti }) => confetti({ particleCount: 60, spread: 60, origin: { y: 0.25 }, disableForReducedMotion: true }));
    }
  };
  const pick = (i: number) => { setSel(i); setRoll(0); setForced(null); };

  return (
    <div className="mb-4">
      {/* O dia todo, ou gazear só uma matéria */}
      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Chip selected={sel === -1 && !forced} onClick={() => pick(-1)} label={`${when} inteiro · ${day.lessons} ${day.lessons === 1 ? 'aula' : 'aulas'}`} />
        {day.decisions.length > 1 && day.decisions.map((d, i) => (
          <button key={planKey(d.target)} onClick={() => pick(i)} aria-pressed={sel === i}
            className={cx('state flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium', sel === i && !forced ? 'border-transparent bg-secondary-container text-on-secondary-container' : 'border-outline-variant text-on-surface-variant')}>
            <span className={cx('size-2 rounded-full', HERO[d.verdict].dot)} />
            gazear {short(d.target.subject.name)} · {d.target.item.start}
          </button>
        ))}
      </div>

      <div className={cx('flex flex-col overflow-hidden rounded-2xl sm:flex-row', h.box)}>
        {memes && (
          <button onClick={() => setRoll(roll + 1)} aria-label="Outra resposta" className="relative shrink-0 bg-black sm:w-[42%] sm:max-w-80">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.img key={said.meme + sel} src={memeSrc(said.meme)} alt={MEMES[said.meme]} decoding="async"
                initial={{ opacity: 0, scale: 1.1, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={spring}
                className="max-h-64 w-full object-contain sm:h-full sm:max-h-80" />
            </AnimatePresence>
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 md:p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="rounded-full bg-white/50 px-2.5 py-0.5 dark:bg-black/25">{forced ? 'prévia' : h.tag}</span>
            <span className="min-w-0 truncate opacity-80">
              {forced ? `situação: ${forced.reason}` : single ? `gazear ${single.target.subject.name}, ${when} às ${single.target.item.start}?` : `faltar ${when} inteiro?`}
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.p key={said.line + String(plan)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EMPHASIZED }}
              className="text-[24px] leading-8 font-semibold tracking-tight md:text-[30px] md:leading-9">
              {plan && !forced ? reply(plan, verdict, keys[0]) : said.line}
            </m.p>
          </AnimatePresence>

          {!forced && (single || day.decisions.length === 1 ? (
            <>
              {/* Os motivos de verdade por trás da resposta */}
              <ul className="flex flex-wrap gap-1.5">
                {decision.factors.slice(0, 6).map((f) => (
                  <li key={f.reason} className="flex items-center gap-1 rounded-full bg-white/45 px-2.5 py-1 text-xs font-medium dark:bg-black/25">
                    {f.weight !== 0 && <Icon name={f.weight > 0 ? 'check' : 'priority_high'} size={14} weight={600} />}{f.label}
                  </li>
                ))}
              </ul>
              <p className="text-sm opacity-80 tabular">
                {facts.used} de {facts.limit} faltas usadas
                {decision.verdict !== 'estourou' && <> · faltando essa ({facts.cost} {facts.cost === 1 ? 'aula' : 'aulas'}) {facts.after < 0 ? `estoura em ${-facts.after}` : `sobram ${facts.after}`}</>}
              </p>
            </>
          ) : (
            // Dia todo: o veredito de cada matéria, com o motivo que mais pesa em cada uma
            <ul className="flex flex-col gap-1.5">
              {day.decisions.map((d, i) => (
                <li key={planKey(d.target)}>
                  <button onClick={() => pick(i)} className="state flex w-full items-center gap-2.5 rounded-xl bg-white/45 px-3 py-2 text-left text-sm dark:bg-black/25">
                    <span className={cx('size-2.5 shrink-0 rounded-full', HERO[d.verdict].dot)} />
                    <span className="min-w-0 flex-1 truncate"><b className="font-semibold">{short(d.target.subject.name)}</b> <span className="opacity-75">· {d.target.item.start} · {d.factors[0]?.label}</span></span>
                    <span className="shrink-0 font-medium">{HERO[d.verdict].tag}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {forced ? (
              <Button size="sm" variant="tonal" icon="close" onClick={() => setForced(null)}>sair da prévia</Button>
            ) : plan ? (
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
            <button onClick={() => setDebug(true)} aria-label="Ver como a decisão foi tomada" title="Ver como a decisão foi tomada" className="state flex size-9 items-center justify-center rounded-full"><Icon name="troubleshoot" size={20} /></button>
            <Link to={`/disciplinas/${decision.target.subject.code}`} label={`Abrir ${decision.target.subject.name}`} className="state flex size-9 items-center justify-center rounded-full"><Icon name="arrow_outward" size={20} /></Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {debug && <SkipDebug day={day} onClose={() => setDebug(false)} onPreview={(reason, line) => { setForced({ reason, line }); setRoll(0); setDebug(false); }} />}
      </AnimatePresence>
    </div>
  );
}

/** Depuração: a conta de cada aula do dia e todas as situações possíveis, com frases e memes. */
function SkipDebug({ day, onClose, onPreview }: { day: DayDecision; onClose: () => void; onPreview: (reason: Reason, line: number) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Como a decisão foi tomada">
      <m.div className="absolute inset-0 bg-black/50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <m.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.3, ease: EMPHASIZED }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-container-high text-on-surface sm:max-w-2xl sm:rounded-xl">
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <h2 className="flex-1 text-xl font-semibold tracking-tight">Como a decisão foi tomada</h2>
          <button onClick={onClose} aria-label="Fechar" className="state flex size-10 items-center justify-center rounded-full"><Icon name="close" /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <section>
            <p className="mb-2 text-sm font-medium text-on-surface-variant">Aulas do dia · veredito do dia: {HERO[day.verdict].tag} (vale o pior caso)</p>
            <div className="flex flex-col gap-2">
              {day.decisions.map((d) => (
                <div key={planKey(d.target)} className="rounded-xl bg-surface-container-highest p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium"><span className={cx('size-2.5 rounded-full', HERO[d.verdict].dot)} />{d.target.subject.name} · {d.target.item.start}
                    <span className="ml-auto tabular">{HERO[d.verdict].tag} · soma {d.score > 0 ? '+' : ''}{d.score} · motivo: {d.main}</span></p>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {d.factors.map((f) => (
                        <tr key={f.reason} className="border-t border-outline-variant/40">
                          <td className={cx('w-10 py-1 font-semibold tabular', f.weight > 0 ? 'text-success' : f.weight < 0 ? 'text-error' : 'text-on-surface-variant')}>{f.weight > 0 ? '+' : ''}{f.weight}</td>
                          <td className="w-32 py-1 text-on-surface-variant">{f.reason}</td>
                          <td className="py-1">{f.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-on-surface-variant">pode: soma ≥ 1 · depende: de −2 a 0 · melhor não: ≤ −3</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-on-surface-variant">Todas as situações · toque numa frase para ver no topo da Hoje (com dados de exemplo)</p>
            <div className="flex flex-col gap-2">
              {REASONS.map((r) => (
                <div key={r} className="rounded-xl bg-surface-container-highest p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cx('size-2.5 rounded-full', HERO[verdictOf(r)].dot)} />
                    <p className="flex-1 text-sm font-medium">{r}</p>
                    {memesFor(r).map((id) => <img key={id} src={memeSrc(id)} alt={MEMES[id]} loading="lazy" className="size-10 rounded-md object-cover" />)}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {linesFor(r).map((line, i) => (
                      <li key={i}><button onClick={() => onPreview(r, i)} className="state w-full rounded-lg bg-surface-container px-3 py-1.5 text-left text-sm">{line}</button></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </m.div>
    </div>,
    document.body,
  );
}
