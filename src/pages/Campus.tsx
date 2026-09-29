import { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { useCampus, useCurrentSubjects, useEstatisticas, useEu, useMyTeachers } from '../lib/data';
import { titleCase, type Estatisticas, type Evento, type Projeto } from '../lib/suap';
import { daysBetween, parseDay, relativeDay } from '../lib/dates';
import { downloadEventIcs } from '../lib/ics';
import { Badge, Button, Card, Chip, CountUp, cx, EMPHASIZED, Empty, ErrorNote, Icon, IconButton, Segmented, Shape, Skeleton, Stagger, Item, Tap } from '../components/ui';

type Tab = 'eventos' | 'projetos' | 'numeros';

const campusName = (nome?: string) => (nome ? titleCase(nome.replace(/^campus\s+/i, '')) : '');
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();

export function Campus() {
  const { data: eu } = useEu();
  const { data: stats } = useEstatisticas();
  const [tab, setTab] = useState<Tab>('eventos');
  const sigla = eu?.campus;
  const mine = stats?.estatisticas_por_campus.find((c) => c.campus_sigla === sigla);

  return (
    <>
      <header className="mb-5">
        <p className="text-sm font-medium text-on-surface-variant">Campus</p>
        <h1 className="text-[36px] leading-[44px] font-semibold tracking-tight md:text-[45px] md:leading-[52px]">{campusName(mine?.campus_nome) || sigla || ' '}</h1>
      </header>
      <Segmented<Tab> value={tab} onChange={setTab} className="mb-5 w-full max-w-lg"
        options={[{ value: 'eventos', label: 'Eventos', icon: 'event' }, { value: 'projetos', label: 'Projetos', icon: 'science' }, { value: 'numeros', label: 'Números', icon: 'bar_chart' }]} />
      <m.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EMPHASIZED }}>
        {tab === 'eventos' && <Events sigla={sigla} />}
        {tab === 'projetos' && <Projects sigla={sigla} />}
        {tab === 'numeros' && <Numbers stats={stats} sigla={sigla} />}
      </m.div>
    </>
  );
}

// ---------- Eventos ----------

function Events({ sigla }: { sigla?: string }) {
  const { data, loading, error, refresh } = useCampus(sigla);
  const now = new Date();
  if (loading || !sigla) return <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>;
  if (error && !data) return <ErrorNote error={error} onRetry={refresh} />;
  const list = data?.eventos ?? [];
  if (!list.length) return <Card className="rounded-2xl"><Empty icon="event_available" title="Nenhum evento marcado no campus">Quando o campus divulgar eventos no SUAP, eles aparecem aqui.</Empty></Card>;

  const live = list.filter((e) => (parseDay(e.inicio) ?? now) <= now);
  const soon = list.filter((e) => !live.includes(e));

  return (
    <div className="flex flex-col gap-6">
      {live.length > 0 && <EventGroup title="Acontecendo agora" list={live} />}
      {soon.length > 0 && <EventGroup title="Em breve" list={soon} />}
    </div>
  );
}

function EventGroup({ title, list }: { title: string; list: Evento[] }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-sm font-medium text-on-surface-variant">{title}</h2>
      <Stagger className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((e) => <Item key={e.id}><EventCard e={e} /></Item>)}
      </Stagger>
    </section>
  );
}

function EventCard({ e }: { e: Evento }) {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(!!e.imagem);
  const start = parseDay(e.inicio);
  const end = parseDay(e.fim);
  const now = new Date();
  const days = start ? daysBetween(now, start) : null;
  const when = start && days !== null && days > 0 ? relativeDay(start, now) : end && daysBetween(now, end) > 0 ? `até ${relativeDay(end, now)}` : 'hoje';
  const closing = e.inscricoes.map((i) => parseDay(i.ate)).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0];

  return (
    <Card variant="filled" className="flex h-full flex-col overflow-hidden rounded-2xl">
      {imgOk && e.imagem ? (
        <img src={e.imagem} alt="" loading="lazy" decoding="async" onError={() => setImgOk(false)} className="aspect-[16/9] w-full bg-surface-container-highest object-cover" />
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {start && (
            <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-container leading-none text-on-primary-container">
              <span className="text-xl font-semibold tabular">{start.getDate()}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase">{start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 font-medium leading-6">{e.nome}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="primary">{when}</Badge>
              {closing && <Badge tone="success"><Icon name="how_to_reg" size={14} />inscrições até {relativeDay(closing, now)}</Badge>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-sm text-on-surface-variant">
          {e.periodo && <span className="flex items-start gap-1.5"><Icon name="schedule" size={18} className="mt-px shrink-0" />{e.periodo}</span>}
          {e.local && <span className="flex items-start gap-1.5"><Icon name="location_on" size={18} className="mt-px shrink-0" /><span className="line-clamp-2">{e.local}</span></span>}
        </div>
        {e.resumo && (
          <button onClick={() => setOpen(!open)} className="mt-3 text-left text-sm" aria-expanded={open}>
            <span className={cx(!open && 'line-clamp-3')}>{e.resumo}</span>
            {e.resumo.length > 140 && <span className="mt-1 block font-medium text-primary">{open ? 'Mostrar menos' : 'Ler mais'}</span>}
          </button>
        )}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button variant={closing ? 'filled' : 'tonal'} size="sm" icon={closing ? 'how_to_reg' : 'open_in_new'} href={e.link}>{closing ? 'Inscrever-se' : 'Ver no SUAP'}</Button>
          <IconButton icon="calendar_add_on" label="Adicionar à agenda" onClick={() => downloadEventIcs(e)} />
          {e.site && <IconButton icon="link" label="Site do evento" onClick={() => window.open(e.site!, '_blank', 'noopener')} />}
        </div>
      </div>
    </Card>
  );
}

// ---------- Projetos ----------

type Filter = 'todos' | 'meus' | 'pesquisa' | 'extensao';

function Projects({ sigla }: { sigla?: string }) {
  const { data, loading, error, refresh } = useCampus(sigla);
  const { data: subjects } = useCurrentSubjects();
  const { data: teachers } = useMyTeachers(subjects?.map((s) => s.code));
  const [filter, setFilter] = useState<Filter>('todos');

  const mineSet = useMemo(() => new Set((teachers ?? []).map(norm)), [teachers]);
  const isMine = (p: Projeto) => mineSet.has(norm(p.coordenador));
  const all = data?.projetos ?? [];
  const mineCount = all.filter(isMine).length;
  const list = all
    .filter((p) => filter === 'todos' || (filter === 'meus' ? isMine(p) : p.tipo === filter))
    .sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  if (loading || !sigla) return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>;
  if (error && !data) return <ErrorNote error={error} onRetry={refresh} />;

  return (
    <>
      <p className="mb-3 max-w-2xl px-1 text-sm text-on-surface-variant">Projetos de pesquisa e extensão concluídos recentemente no campus. Um bom jeito de descobrir o que cada professor pesquisa e achar um orientador.</p>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Chip label="Todos" selected={filter === 'todos'} onClick={() => setFilter('todos')} />
        {mineCount > 0 && <Chip label={`Dos meus professores (${mineCount})`} icon="school" selected={filter === 'meus'} onClick={() => setFilter('meus')} />}
        <Chip label="Pesquisa" selected={filter === 'pesquisa'} onClick={() => setFilter('pesquisa')} />
        <Chip label="Extensão" selected={filter === 'extensao'} onClick={() => setFilter('extensao')} />
      </div>
      {list.length === 0 ? (
        <Card className="rounded-2xl"><Empty icon="science" title="Nenhum projeto por aqui" /></Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((p) => <Item key={p.id}><ProjectCard p={p} mine={isMine(p)} /></Item>)}
        </Stagger>
      )}
    </>
  );
}

const monthYear = (s: string | null) => parseDay(s)?.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' ') ?? '';

function ProjectCard({ p, mine }: { p: Projeto; mine: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Tap onClick={() => setOpen(!open)} label={p.titulo} className={cx('h-full rounded-2xl p-4', mine ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={p.tipo === 'pesquisa' ? 'primary' : 'neutral'}><Icon name={p.tipo === 'pesquisa' ? 'science' : 'diversity_3'} size={14} />{p.tipo === 'pesquisa' ? 'Pesquisa' : 'Extensão'}</Badge>
        {mine && <Badge tone="success"><Icon name="school" size={14} />seu professor</Badge>}
        <span className="ml-auto text-xs opacity-75">{monthYear(p.inicio)}{p.fim && ` – ${monthYear(p.fim)}`}</span>
      </div>
      <p className="mt-2 font-medium leading-6">{p.titulo}</p>
      {p.coordenador && <p className="mt-1 flex items-center gap-1 text-sm opacity-80"><Icon name="person" size={16} />{titleCase(p.coordenador)}</p>}
      {p.resumo && <p className={cx('mt-2 text-sm opacity-85', !open && 'line-clamp-3')}>{p.resumo}</p>}
    </Tap>
  );
}

// ---------- Números ----------

function Numbers({ stats, sigla }: { stats?: Estatisticas; sigla?: string }) {
  if (!stats) return <Skeleton className="h-96 rounded-2xl" />;
  const ranked = [...stats.estatisticas_por_campus].filter((c) => c.alunos_ativos > 0).sort((a, b) => b.alunos_ativos - a.alunos_ativos);
  const pos = ranked.findIndex((c) => c.campus_sigla === sigla);
  const mine = ranked[pos];
  const max = ranked[0]?.alunos_ativos ?? 1;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 xl:col-span-12 xl:grid-cols-4">
        <BigStat icon="school" label="alunos ativos no IFRN" value={stats.alunos_ativos} tone="bg-primary-container text-on-primary-container" shape="sunny" />
        <BigStat icon="badge" label="servidores" value={stats.servidores_ativos} tone="bg-secondary-container text-on-secondary-container" shape="cookie" />
        <BigStat icon="science" label="projetos de pesquisa em andamento" value={stats.projetos_pesquisa_em_execucao} tone="bg-tertiary-container text-on-tertiary-container" shape="flower" />
        <BigStat icon="diversity_3" label="projetos de extensão em andamento" value={stats.projetos_extensao_em_execucao} tone="bg-surface-container-highest" shape="clover" />
      </div>

      {mine && (
        <Card variant="primary" className="relative overflow-hidden rounded-3xl p-6 xl:col-span-5">
          <Shape shape="sunny" size={240} spin className="pointer-events-none absolute -right-16 -bottom-20 opacity-15" />
          <p className="relative text-sm font-medium opacity-85">Seu campus</p>
          <p className="relative text-[28px] leading-9 font-semibold tracking-tight">{campusName(mine.campus_nome)}</p>
          <div className="relative mt-6 flex items-end gap-2">
            <span className="text-[72px] leading-none font-semibold tracking-tighter"><CountUp value={pos + 1} />º</span>
            <span className="mb-2 text-sm opacity-85">maior de {ranked.length} campi</span>
          </div>
          <div className="relative mt-6 grid grid-cols-3 gap-3 text-sm">
            <MiniStat value={mine.alunos_ativos.toLocaleString('pt-BR')} label="alunos" />
            <MiniStat value={mine.servidores_ativos.toLocaleString('pt-BR')} label="servidores" />
            <MiniStat value={`${((mine.alunos_ativos / stats.alunos_ativos) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} label="do IFRN" />
          </div>
        </Card>
      )}

      <Card variant="filled" className={cx('rounded-3xl p-5', mine ? 'xl:col-span-7' : 'xl:col-span-12')}>
        <p className="mb-4 flex items-center gap-2 text-lg font-medium"><Icon name="bar_chart" className="text-primary" fill /> Alunos por campus</p>
        <ol className="flex flex-col gap-1.5">
          {ranked.map((c, i) => {
            const me = c.campus_sigla === sigla;
            return (
              <li key={c.campus_sigla} className="flex items-center gap-3 text-sm">
                <span className={cx('w-24 shrink-0 truncate md:w-40', me ? 'font-semibold text-primary' : 'text-on-surface-variant')} title={campusName(c.campus_nome)}>{campusName(c.campus_nome)}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                  <m.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: Math.min(i * 0.03, 0.6), ease: EMPHASIZED }}
                    style={{ width: `${Math.max((c.alunos_ativos / max) * 100, 2)}%` }}
                    className={cx('h-full origin-left rounded-full', me ? 'bg-primary' : 'bg-secondary')} />
                </div>
                <span className={cx('w-14 shrink-0 text-right tabular', me && 'font-semibold text-primary')}>{c.alunos_ativos.toLocaleString('pt-BR')}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

function BigStat({ icon, label, value, tone, shape }: { icon: string; label: string; value: number; tone: string; shape: 'sunny' | 'cookie' | 'flower' | 'clover' }) {
  return (
    <div className={cx('relative overflow-hidden rounded-2xl p-4 md:p-5', tone)}>
      <Shape shape={shape} size={120} className="pointer-events-none absolute -top-8 -right-8 opacity-15" />
      <Icon name={icon} fill className="relative" />
      <p className="relative mt-6 text-[32px] leading-none font-semibold tracking-tight tabular md:text-[40px]"><CountUp value={value} /></p>
      <p className="relative mt-1 text-xs leading-4 opacity-85 md:text-sm">{label}</p>
    </div>
  );
}

const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-xl bg-white/40 px-3 py-2 dark:bg-black/20">
    <p className="text-lg font-semibold tabular">{value}</p>
    <p className="text-xs opacity-80">{label}</p>
  </div>
);
