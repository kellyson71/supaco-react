import { useMemo, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useAluno, useAulas, useCampus, useEu, useFrequencia, useMensagens, useMyTeachers, usePeriod, usePeriodos, useRequisitos } from '../lib/data';
import { graduationForecast, presenceByDay, streaks } from '../lib/semester';
import { shortName, type Subject } from '../lib/suap';
import { parseDay, relativeDay } from '../lib/dates';
import { cx, EMPHASIZED, Icon, Ring, SectionHeader, Shape, Tap, type ShapeName } from './ui';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

/** Carrossel do M3 com o que vale olhar hoje: mensagem, evento, sequência, retrospectiva, formatura. */
export function Highlights({ subjects }: { subjects: Subject[] }) {
  const { data: eu } = useEu();
  const { current } = usePeriod();
  const { data: aulas } = useAulas(current);
  const { data: msgs } = useMensagens();
  const { data: campus } = useCampus(eu?.campus);
  const { data: req } = useRequisitos();
  const { data: periodos } = usePeriodos();
  const { data: aluno } = useAluno();
  const { data: teachers } = useMyTeachers(subjects.map((s) => s.code));

  const days = useMemo(() => (aulas ? presenceByDay(aulas) : []), [aulas]);
  const s = streaks(days);
  const { data: freq } = useFrequencia(current);
  // Totais oficiais do SUAP; a soma das aulas lançadas é só para a sequência
  const lessons = freq?.total_aulas ?? 0;
  const presence = freq && lessons ? freq.percentual_frequencia / 100 : null;
  const unread = msgs?.filter((x) => !x.registro_leitura) ?? [];
  const event = campus?.eventos[0];
  const eventDay = parseDay(event?.inicio);
  const forecast = req && periodos ? graduationForecast(req, periodos, aluno) : null;
  const mine = useMemo(() => new Set((teachers ?? []).map(norm)), [teachers]);
  const project = campus?.projetos.find((p) => mine.has(norm(p.coordenador)));

  const cards: ReactNode[] = [];

  if (unread.length) {
    const msg = unread[0];
    cards.push(
      <Slide key="msg" to="/mensagens" tone="bg-primary-container text-on-primary-container" shape="clover" icon="mail"
        kicker={unread.length > 1 ? `${unread.length} mensagens não lidas` : 'Mensagem não lida'}>
        <p className="line-clamp-2 text-lg leading-6 font-medium">{msg.assunto || 'Sem assunto'}</p>
        <p className="mt-auto truncate text-sm opacity-80">de {shortName(msg.remetente?.nome ?? '')}</p>
      </Slide>,
    );
  }

  if (event) {
    cards.push(
      <Slide key="ev" to="/campus" tone="bg-tertiary-container text-on-tertiary-container" shape="sunny" icon="event"
        kicker={`No campus · ${eventDay ? relativeDay(eventDay) : ''}${event.horaInicio ? ` às ${event.horaInicio}` : ''}`}>
        <p className="line-clamp-2 text-lg leading-6 font-medium">{event.nome}</p>
        <p className="mt-auto truncate text-sm opacity-80">
          {event.inscricoes.length ? 'Inscrições abertas' : event.local ?? 'Ver detalhes'}
          {campus!.eventos.length > 1 && ` · +${campus!.eventos.length - 1} ${campus!.eventos.length === 2 ? 'evento' : 'eventos'}`}
        </p>
      </Slide>,
    );
  }

  if (days.length) {
    const hot = s.current >= 3;
    cards.push(
      <Slide key="streak" to="/retrospectiva" tone={hot ? 'bg-warning-container text-on-warning-container' : 'bg-surface-container-highest'} shape="flower" icon="local_fire_department"
        kicker={hot ? 'Tá pegando fogo' : 'Sequência sem faltar'}>
        <p className="flex items-baseline gap-1.5"><span className="text-[40px] leading-none font-semibold tracking-tight tabular">{s.current}</span><span className="text-sm">{s.current === 1 ? 'dia seguido' : 'dias seguidos'}</span></p>
        <div className="mt-auto flex gap-1" aria-hidden>
          {days.slice(-14).map((d) => (
            <span key={d.date} className={cx('h-5 flex-1 rounded-sm', d.absences === 0 ? 'bg-success' : d.absences >= d.lessons ? 'bg-error' : 'bg-warning')} />
          ))}
        </div>
        <p className="text-xs opacity-75">recorde: {s.best} · últimos {Math.min(days.length, 14)} dias de aula</p>
      </Slide>,
    );
  }

  if (presence !== null) {
    cards.push(
      <Slide key="retro" to="/retrospectiva" tone="bg-secondary-container text-on-secondary-container" shape="cookie" icon="auto_awesome" kicker="Sua retrospectiva">
        <div className="flex items-center gap-3">
          <Ring value={presence} size={56} stroke={6} color="currentColor" track="rgb(0 0 0 / .12)"><span className="text-sm font-semibold tabular">{Math.round(presence * 100)}%</span></Ring>
          <p className="text-sm leading-5">de presença em <b className="font-semibold tabular">{lessons}</b> aulas</p>
        </div>
        <p className="mt-auto flex items-center gap-1 text-sm font-medium">Ver o semestre <Icon name="arrow_forward" size={18} /></p>
      </Slide>,
    );
  }

  if (project) {
    cards.push(
      <Slide key="proj" to="/campus" tone="bg-surface-container-highest" shape="soft" icon="science" kicker={`Projeto de ${shortName(project.coordenador)}`}>
        <p className="line-clamp-3 text-base leading-6 font-medium">{project.titulo}</p>
        <p className="mt-auto text-sm opacity-80">Seu professor · {project.tipo === 'pesquisa' ? 'pesquisa' : 'extensão'}</p>
      </Slide>,
    );
  }

  if (forecast && forecast.remaining > 0) {
    cards.push(
      <Slide key="grad" to="/voce" tone={forecast.lateBy === 0 ? 'bg-success-container text-on-success-container' : 'bg-surface-container-highest'} shape="sunny" icon="workspace_premium" kicker="Formatura prevista">
        <p className="text-[40px] leading-none font-semibold tracking-tight tabular">{forecast.forecast}</p>
        <p className="mt-auto text-sm opacity-80">{forecast.lateBy === 0 ? 'no prazo da matriz' : `no seu ritmo · matriz: ${forecast.nominal}`}</p>
      </Slide>,
    );
  }

  if (!cards.length) return null;

  return (
    <section>
    <SectionHeader title="Mais pra você" icon="auto_awesome" />
    <div className="no-scrollbar -mx-4 mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:mx-0 md:scroll-px-0 md:px-0">
      {cards.map((c, i) => (
        <m.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.4, ease: EMPHASIZED }}
          className={cx('shrink-0 snap-start', i === 0 ? 'w-[78%] sm:w-80' : 'w-[62%] sm:w-64', 'xl:min-w-56 xl:flex-1')}>
          {c}
        </m.div>
      ))}
    </div>
    </section>
  );
}

function Slide({ to, tone, shape, icon, kicker, children }: { to: string; tone: string; shape: ShapeName; icon: string; kicker: string; children: ReactNode }) {
  return (
    <Tap to={to} className={cx('flex h-44 flex-col gap-2 rounded-3xl p-4', tone)}>
      <Shape shape={shape} size={120} className="pointer-events-none absolute -top-8 -right-8 opacity-15" />
      <p className="relative flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase opacity-80"><Icon name={icon} size={16} fill />{kicker}</p>
      <div className="relative flex min-h-0 flex-1 flex-col gap-1.5">{children}</div>
    </Tap>
  );
}
