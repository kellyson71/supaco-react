import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useAulas, useCalendario, useDisciplinas, useEu, useFrequencia, usePeriod } from '../lib/data';
import { presenceByDay, retrospective, type Retro } from '../lib/semester';
import { subjectTone } from '../lib/suap';
import { TONES } from '../lib/tones';
import { WEEKDAYS } from '../lib/schedule';
import { isoDay, parseDay } from '../lib/dates';
import { back } from '../lib/router';
import { PresenceCalendar } from '../components/PresenceCalendar';
import { Button, Card, CountUp, cx, EMPHASIZED, Empty, Icon, IconButton, Ring, Shape, Skeleton, type ShapeName } from '../components/ui';

export function Retrospective() {
  const { current } = usePeriod();
  const { data: cal } = useCalendario(current);
  const { data: subjects } = useDisciplinas(current);
  const { data: aulas, loading } = useAulas(current);
  const { data: freq } = useFrequencia(current);
  const r = useMemo(() => (aulas && subjects ? retrospective(aulas, subjects, freq) : null), [aulas, subjects, freq]);
  const days = useMemo(() => (aulas ? presenceByDay(aulas) : []), [aulas]);

  useEffect(() => {
    if (!r || r.presence < 0.85 || sessionStorage.getItem('supaco:retro-confetti')) return;
    sessionStorage.setItem('supaco:retro-confetti', '1');
    import('canvas-confetti').then(({ default: confetti }) => confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, disableForReducedMotion: true }));
  }, [r]);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/voce')} />
        <span className="text-sm font-medium text-on-surface-variant">Você</span>
      </div>
      <header className="mb-6">
        <p className="text-sm font-medium text-on-surface-variant">Semestre {current?.label ?? ''} · até agora</p>
        <h1 className="text-[36px] leading-[44px] font-semibold tracking-tight md:text-[57px] md:leading-[64px]">Sua retrospectiva</h1>
      </header>

      {loading || !subjects ? <Skeleton className="h-96 rounded-3xl" /> : !r || r.lessons === 0 ? (
        <Card className="rounded-2xl"><Empty icon="history_edu" title="Ainda não há aulas lançadas">Assim que os professores lançarem as aulas no SUAP, sua retrospectiva aparece aqui.</Empty></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Slide className="md:col-span-2 xl:col-span-2" color="bg-primary-container text-on-primary-container" shape="sunny">
            <p className="text-lg font-medium opacity-85">Você esteve em</p>
            <p className="mt-1 text-[72px] leading-none font-semibold tracking-tighter md:text-[96px]"><CountUp value={r.lessons - r.absences} /></p>
            <p className="mt-2 text-xl">de <b className="font-semibold tabular">{r.lessons}</b> aulas, em {r.days} dias de aula{r.firstDay && ` desde ${fmt(r.firstDay)}`}.</p>
            <div className="mt-6 flex items-center gap-4">
              <Ring value={r.presence} size={88} stroke={9} color="currentColor" track="rgb(0 0 0 / .12)">
                <span className="text-xl font-semibold tabular">{Math.round(r.presence * 100)}%</span>
              </Ring>
              <p className="max-w-xs text-sm opacity-85">{r.presence >= 0.9 ? 'Presença de dar inveja. Continua assim!' : r.presence >= 0.75 ? 'Acima dos 75% que o IFRN exige.' : 'Abaixo dos 75%: bora recuperar nas próximas semanas.'}</p>
            </div>
          </Slide>

          <Slide color="bg-tertiary-container text-on-tertiary-container" shape="flower">
            <Icon name="local_fire_department" size={40} fill />
            <p className="mt-3 text-lg font-medium opacity-85">Maior sequência sem faltar</p>
            <p className="mt-1 text-[64px] leading-none font-semibold tracking-tighter"><CountUp value={r.streak.best} /><span className="ml-2 text-2xl font-medium tracking-normal">dias</span></p>
            <p className="mt-3 text-sm opacity-85">{r.streak.current > 0 ? `Sequência atual: ${r.streak.current} ${r.streak.current === 1 ? 'dia' : 'dias'} seguidos.` : 'A sequência atual zerou. Amanhã é um novo começo.'}</p>
          </Slide>

          <Card variant="filled" className="rounded-3xl p-6 md:col-span-2 xl:col-span-3">
            <p className="mb-4 flex items-center gap-2 text-lg font-medium"><Icon name="calendar_month" className="text-primary" fill /> Cada dia do semestre</p>
            <PresenceCalendar days={days} from={cal?.data_inicio ? isoOf(cal.data_inicio) : null} to={parseDay(cal?.data_fim) ?? undefined} />
          </Card>

          <div className="flex flex-wrap gap-4 md:col-span-2 xl:col-span-3 [&>*]:min-w-[260px] [&>*]:flex-1">
            {r.best && (
              <Slide color={cx(TONES[subjectTone(r.best.s)].container, TONES[subjectTone(r.best.s)].onContainer)} shape="clover">
                <p className="text-lg font-medium opacity-85">Matéria mais fiel</p>
                <p className="mt-2 text-[28px] leading-9 font-semibold tracking-tight">{r.best.s.name}</p>
                <p className="mt-3 text-sm opacity-85">{Math.round(r.best.presence * 100)}% de presença nas aulas lançadas.</p>
              </Slide>
            )}
            {r.worst && (
              <Slide color="bg-error-container text-on-error-container" shape="cookie">
                <p className="text-lg font-medium opacity-85">Onde você mais faltou</p>
                <p className="mt-2 text-[28px] leading-9 font-semibold tracking-tight">{r.worst.s.name}</p>
                <p className="mt-3 text-sm opacity-85">{r.worst.absences} {r.worst.absences === 1 ? 'falta' : 'faltas'} até agora.</p>
              </Slide>
            )}
            {r.weekday && (
              <Slide color="bg-secondary-container text-on-secondary-container" shape="soft">
                <p className="text-lg font-medium opacity-85">Dia mais difícil</p>
                <p className="mt-2 text-[40px] leading-none font-semibold tracking-tight">{WEEKDAYS[r.weekday.day]}</p>
                <p className="mt-3 text-sm opacity-85">{r.weekday.absences} faltas caíram nesse dia da semana.</p>
              </Slide>
            )}
            {r.topGrade && (
              <Slide color="bg-primary-container text-on-primary-container" shape="sunny">
                <p className="text-lg font-medium opacity-85">Melhor nota</p>
                <p className="mt-1 text-[64px] leading-none font-semibold tracking-tighter"><CountUp value={r.topGrade.grade} /></p>
                <p className="mt-3 text-sm opacity-85">em {r.topGrade.s.name}.</p>
              </Slide>
            )}
          </div>

          {r.words.length > 0 && (
            <Card variant="filled" className="rounded-3xl p-6 md:col-span-2 xl:col-span-3">
              <p className="mb-4 flex items-center gap-2 text-lg font-medium"><Icon name="menu_book" className="text-primary" fill /> O semestre foi sobre</p>
              <div className="flex flex-wrap items-baseline gap-2">
                {r.words.map((w, i) => (
                  <m.span key={w.word} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                    className={cx('rounded-full px-4 py-1.5 font-medium', i === 0 ? 'bg-primary text-on-primary' : i < 3 ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest')}
                    style={{ fontSize: `${Math.max(14, 30 - i * 2.5)}px` }}>
                    {w.word}
                  </m.span>
                ))}
              </div>
            </Card>
          )}

          <div className="md:col-span-2 xl:col-span-3"><ShareCard r={r} label={current?.label ?? ''} /></div>
        </div>
      )}
    </>
  );
}

const isoOf = (s: string) => { const d = parseDay(s); return d ? isoDay(d) : null; };
const fmt = (iso: string) => parseDay(iso)?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) ?? '';

function Slide({ children, color, shape, className }: { children: ReactNode; color: string; shape: ShapeName; className?: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease: EMPHASIZED }}
      className={cx('relative overflow-hidden rounded-3xl p-6 md:p-8', color, className)}>
      <Shape shape={shape} size={220} spin className="pointer-events-none absolute -right-14 -bottom-16 opacity-15" />
      <div className="relative">{children}</div>
    </m.div>
  );
}

/** Card em formato de story, exportado como imagem para compartilhar. */
function ShareCard({ r, label }: { r: Retro; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: eu } = useEu();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const share = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toBlob, getFontEmbedCSS } = await import('html-to-image');
      // O card não usa ícones: embute só a fonte do texto (a de ícones pesa ~1 MB)
      const fonts = (await getFontEmbedCSS(ref.current)).split(/(?=@font-face)/).filter((f) => !/Material Symbols/i.test(f)).join('');
      const blob = await toBlob(ref.current, { pixelRatio: 3, fontEmbedCSS: fonts });
      if (!blob) throw new Error('imagem');
      const file = new File([blob], `supaco-${label}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Meu ${label} no IFRN` }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        setMsg('Imagem salva');
      }
    } catch {
      setMsg('Não deu para gerar a imagem');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 2500);
    }
  };

  return (
    <Card variant="filled" className="flex flex-col items-center gap-5 rounded-3xl p-6 md:flex-row md:items-center md:gap-10 md:p-8">
      <div ref={ref} className="relative flex aspect-[4/5] w-full max-w-[320px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-primary p-7 text-on-primary">
        <Shape shape="sunny" size={260} className="pointer-events-none absolute -top-20 -right-24 opacity-20" />
        <Shape shape="flower" size={180} className="pointer-events-none absolute -bottom-16 -left-14 opacity-15" />
        <p className="relative text-sm font-medium opacity-85">Meu {label} no IFRN</p>
        <p className="relative mt-1 text-2xl font-semibold tracking-tight">{eu?.nome_usual ?? ''}</p>
        <div className="relative mt-auto grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat value={`${Math.round(r.presence * 100)}%`} label="de presença" />
          <Stat value={String(r.lessons - r.absences)} label="aulas assistidas" />
          <Stat value={String(r.streak.best)} label="dias seguidos sem faltar" />
          {r.topGrade ? <Stat value={String(r.topGrade.grade)} label="melhor nota" /> : <Stat value={String(r.days)} label="dias de aula" />}
        </div>
        {r.words.length > 0 && <p className="relative mt-5 line-clamp-2 text-sm opacity-90">Foi sobre {r.words.slice(0, 3).map((w) => w.word).join(', ')}.</p>}
        <p className="relative mt-5 text-xs font-semibold tracking-wide opacity-75">supaco.vercel.app</p>
      </div>
      <div className="text-center md:text-left">
        <p className="text-[28px] leading-9 font-semibold tracking-tight">Mostra pra turma</p>
        <p className="mt-2 max-w-sm text-on-surface-variant">Gera uma imagem com o resumo do seu semestre, pronta para os stories ou o grupo da sala.</p>
        <div className="mt-5 flex items-center justify-center gap-3 md:justify-start">
          <Button icon={busy ? 'progress_activity' : 'share'} onClick={share} disabled={busy}>{busy ? 'Gerando…' : 'Compartilhar imagem'}</Button>
          {msg && <span className="text-sm text-on-surface-variant">{msg}</span>}
        </div>
      </div>
    </Card>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-[40px] leading-none font-semibold tracking-tighter tabular">{value}</p>
    <p className="mt-1 text-xs leading-4 opacity-85">{label}</p>
  </div>
);
