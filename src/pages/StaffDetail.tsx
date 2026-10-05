import { useMemo, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useCampus, useCurrentSubjects, useEu, useServidor, useTransparencia, useTurmas, useUnidades, useViagens } from '../lib/data';
import { back } from '../lib/router';
import { semAcento, subjectTone, titleCase, type Folha, type Projeto, type Servidor, type Subject, type Transparencia, type Viagem } from '../lib/suap';
import { anosDesde, campusNome, cargoLabel, categoriaLabel, fotoGrande, funcaoLabel, ocupacao, pretty } from '../lib/staff';
import { daysBetween, longMonth, parseDay } from '../lib/dates';
import { TONES } from '../lib/tones';
import { Link } from '../components/Link';
import { ShapedPhoto } from '../components/Turma';
import { Badge, Button, Card, CountUp, cx, EMPHASIZED, Empty, Icon, IconButton, Item, SectionHeader, Shape, Skeleton, Stagger } from '../components/ui';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dayMonth = (iso: string) => parseDay(iso)?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '') ?? '';
const fullDate = (iso: string) => parseDay(iso)?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '';
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Página de um servidor: o que o SUAP sabe (setor, função, matérias com você) e o que o Portal da Transparência publica. */
export function StaffDetail({ matricula }: { matricula: string }) {
  const { data: found, loading, error } = useServidor(matricula);
  const { data: subjects } = useCurrentSubjects();
  const { data: turmas } = useTurmas(subjects?.map((s) => s.code));

  // Se for professor seu, a turma já traz nome, foto e e-mail, mesmo que a consulta de servidores falhe
  const teacher = useMemo(() => Object.values(turmas ?? {}).flatMap((t) => t.professores).find((p) => p.matricula === matricula), [turmas, matricula]);
  const shared = useMemo(() => (subjects ?? []).filter((s) => turmas?.[s.code]?.professores.some((p) => p.matricula === matricula)), [subjects, turmas, matricula]);

  const person: Servidor | null = found ?? (teacher
    ? { matricula, nome: teacher.nome, foto: teacher.foto, campus: '', setor: '', cargo: '', jornada: '', categoria: 'docente', funcoes: [], disciplina: '', lattes: '', telefones: [] }
    : null);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/servidores')} />
        <span className="text-sm font-medium text-on-surface-variant">Servidores</span>
      </div>
      {person ? <Profile s={person} email={teacher?.email} shared={shared} />
        : loading && !error ? <Skeleton className="h-80 rounded-3xl" />
          : <Card className="rounded-2xl"><Empty icon="search_off" title="Servidor não encontrado">Não achei ninguém com a matrícula {matricula} entre os servidores ativos do IFRN.</Empty></Card>}
    </>
  );
}

function Profile({ s, email, shared }: { s: Servidor; email?: string; shared: Subject[] }) {
  const { data: eu } = useEu();
  const { data: unidades } = useUnidades();
  // Estagiário não é servidor: não está no Portal da Transparência
  const lookup = s.categoria === 'estagiario' ? undefined : s;
  const portal = useTransparencia(lookup);
  const info = portal.data?.encontrado ? portal.data : null;
  const trips = useViagens(info ? s : undefined);
  const campus = s.campus || eu?.campus;
  const { data: campusData } = useCampus(campus);
  const projects = useMemo(() => (campusData?.projetos ?? []).filter((p) => semAcento(p.coordenador) === semAcento(s.nome)), [campusData, s.nome]);

  const campusLabel = s.campus ? campusNome(unidades?.find((u) => u.sigla === s.campus)?.nome ?? s.campus) : '';
  const years = anosDesde(info?.ingressoOrgao);
  const portalDown = !!lookup && !!portal.error && !portal.data;

  return (
    <Stagger className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Item className="xl:col-span-12"><Hero s={s} info={info} email={email} campusLabel={campusLabel} /></Item>

      <Item className="xl:col-span-12">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Fact icon="workspace_premium" tone="bg-primary-container text-on-primary-container" shape="sunny" loading={portal.loading}
            value={years} label={years === 1 ? 'ano de IFRN' : 'anos de IFRN'} empty="tempo de casa" />
          <Fact icon="payments" tone="bg-tertiary-container text-on-tertiary-container" shape="cookie" loading={portal.loading}
            value={info?.remuneracao ? Math.round(info.remuneracao.bruto) : null} prefix="R$" label="remuneração bruta" empty="remuneração" />
          <Fact icon="flight_takeoff" tone="bg-secondary-container text-on-secondary-container" shape="flower" loading={portal.loading || trips.loading}
            value={trips.data ? trips.data.viagens.length : null} label={trips.data?.viagens.length === 1 ? 'viagem a serviço' : 'viagens a serviço'} empty="viagens a serviço" />
          <Fact icon="school" tone="bg-surface-container-highest" shape="clover"
            value={shared.length || projects.length || null} label={shared.length ? (shared.length === 1 ? 'matéria com você' : 'matérias com você') : projects.length === 1 ? 'projeto coordenado' : 'projetos coordenados'} empty="matérias com você" />
        </div>
      </Item>

      {shared.length > 0 && <Item className="xl:col-span-5"><WithYou shared={shared} /></Item>}
      <Item className={shared.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12'}><Bond s={s} info={info} campusLabel={campusLabel} loading={portal.loading} /></Item>

      {lookup && !portalDown && (
        <>
          <Item className="xl:col-span-6"><Pay portal={portal.data} loading={portal.loading} /></Item>
          <Item className="xl:col-span-6"><Trips data={trips.data} loading={portal.loading || trips.loading} failed={!!trips.error && !trips.data} hidden={!!portal.data && !info} /></Item>
        </>
      )}
      {portalDown && (
        <Item className="xl:col-span-12">
          <p className="flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
            <Icon name="cloud_off" size={20} />Remuneração e viagens vêm do Portal da Transparência, que não respondeu agora.
          </p>
        </Item>
      )}

      {projects.length > 0 && <Item className="xl:col-span-12"><Projects list={projects} /></Item>}
    </Stagger>
  );
}

// ---------- Cabeçalho ----------

function Hero({ s, info, email, campusLabel }: { s: Servidor; info: Extract<Transparencia, { encontrado: true }> | null; email?: string; campusLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(s.matricula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const role = info?.funcao?.atividade ? pretty(info.funcao.atividade) : s.funcoes[0] ? funcaoLabel(s.funcoes[0]).tipo : null;
  const chip = 'bg-white/50 !text-current dark:bg-black/25';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-secondary-container p-6 text-on-secondary-container md:p-8">
      <Shape shape="sunny" size={340} spin className="pointer-events-none absolute -top-28 -right-24 opacity-10" />
      <Shape shape="clover" size={180} className="pointer-events-none absolute -bottom-20 left-1/3 opacity-[0.07] max-md:hidden" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
        <m.div initial={{ scale: 0.9, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="shrink-0 self-start md:self-center">
          <ShapedPhoto src={fotoGrande(s.foto)} name={s.nome} shape="flower" size={156} still />
        </m.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge className={chip}>{categoriaLabel(s.categoria)}</Badge>
            {campusLabel && <Badge className={chip}><Icon name="apartment" size={14} />{campusLabel}</Badge>}
            {s.setor && <Badge className={cx(chip, 'tabular')}>{s.setor}</Badge>}
            {info?.afastado && <Badge tone="warning">Afastado</Badge>}
          </div>
          <h1 className="mt-3 text-[34px] leading-[42px] font-semibold tracking-tight md:text-[48px] md:leading-[56px]">{titleCase(s.nome)}</h1>
          <p className="mt-2 max-w-2xl text-base opacity-90">
            {ocupacao(s)}{role && ` · ${role}`}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {email && <Button icon="mail" href={`mailto:${email}`}>Enviar e-mail</Button>}
            {s.lattes && <Button variant="tonal" icon="history_edu" href={s.lattes}>Currículo Lattes</Button>}
            <button onClick={copy} className="state inline-flex h-10 items-center gap-2 rounded-full border border-current/25 px-4 text-sm font-medium tabular">
              <Icon name={copied ? 'check' : 'content_copy'} size={18} />{copied ? 'Matrícula copiada' : `Matrícula ${s.matricula}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, tone, shape, value, prefix, label, empty, loading }: {
  icon: string; tone: string; shape: 'sunny' | 'cookie' | 'flower' | 'clover'; value: number | null; prefix?: string; label: string; empty: string; loading?: boolean;
}) {
  return (
    <div className={cx('relative overflow-hidden rounded-2xl p-4 md:p-5', tone)}>
      <Shape shape={shape} size={120} className="pointer-events-none absolute -top-8 -right-8 opacity-15" />
      <Icon name={icon} fill className="relative" />
      <p className="relative mt-6 text-[30px] leading-none font-semibold tracking-tight tabular md:text-[38px]">
        {loading ? <span className="inline-block h-[1em] w-20 animate-pulse rounded-lg bg-current/15 align-bottom" /> : value === null ? '–' : <span className="whitespace-nowrap">{prefix && <span className="mr-1 text-[0.6em] font-medium">{prefix}</span>}<CountUp value={value} /></span>}
      </p>
      <p className="relative mt-1 text-xs leading-4 opacity-85 md:text-sm">{value === null ? empty : label}</p>
    </div>
  );
}

// ---------- Com você ----------

function WithYou({ shared }: { shared: Subject[] }) {
  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Com você" icon="school" action={<span className="text-sm text-on-surface-variant">{plural(shared.length, 'matéria', 'matérias')}</span>} />
      <ul className="flex flex-col gap-1.5">
        {shared.map((s) => (
          <li key={s.code}>
            <Link to={`/disciplinas/${s.code}`} label={s.name}
              className="state group flex items-center gap-3 rounded-xl bg-surface-container-highest px-3.5 py-3 text-sm">
              <span className={cx('size-2.5 shrink-0 rounded-full', TONES[subjectTone(s)].color)} />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <Icon name="chevron_right" size={20} className="text-on-surface-variant transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- Vínculo ----------

function Bond({ s, info, campusLabel, loading }: { s: Servidor; info: Extract<Transparencia, { encontrado: true }> | null; campusLabel: string; loading: boolean }) {
  const since = (iso: string | null | undefined) => {
    if (!iso) return null;
    const y = anosDesde(iso);
    return `${fullDate(iso)}${y ? ` · há ${plural(y, 'ano', 'anos')}` : ''}`;
  };
  const cargo = cargoLabel(info?.cargo ?? s.cargo);
  const funcoes = s.funcoes.map(funcaoLabel).map((f) => [f.tipo, f.setor].filter(Boolean).join(' · '));
  const rows: [string, string, string | null | undefined][] = [
    ['badge', 'Cargo', [cargo, info?.classe && `classe ${info.classe}`, info?.nivel && /^\d+$/.test(info.nivel) && `nível ${+info.nivel}`].filter(Boolean).join(', ')],
    ['menu_book', 'Área de ingresso', s.disciplina],
    ['schedule', 'Jornada', pretty(info?.jornada ?? s.jornada)],
    ['workspace_premium', 'Função', info?.funcao?.atividade
      ? `${pretty(info.funcao.atividade)}${info.funcao.desde ? `, desde ${fullDate(info.funcao.desde)}` : ''}`
      : funcoes.join('; ')],
    ['apartment', 'Lotação', [campusLabel && `Campus ${campusLabel}`, s.setor].filter(Boolean).join(' · ')],
    ['event_available', 'No IFRN desde', since(info?.ingressoOrgao)],
    ['history', 'No serviço público desde', info?.ingressoServico !== info?.ingressoOrgao ? since(info?.ingressoServico) : null],
    ['verified', 'Situação', info?.situacao && [pretty(info.situacao), info.regime && pretty(info.regime)].filter(Boolean).join(' · ')],
    ['event_busy', 'Afastamentos', info?.afastamentos.join('; ')],
    ['call', 'Telefone', s.telefones.join(' · ')],
  ];
  const filled = rows.filter(([, , v]) => v);

  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Vínculo" icon="badge" />
      {filled.length === 0 && !loading ? (
        <p className="px-1 text-sm text-on-surface-variant">O SUAP não trouxe dados de cargo ou setor para esta pessoa.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
          {filled.map(([icon, label, value]) => (
            <div key={label} className="flex items-start gap-3 rounded-xl px-1 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name={icon} size={20} /></span>
              <div className="min-w-0">
                <dt className="text-xs text-on-surface-variant">{label}</dt>
                <dd className="text-sm font-medium break-words">{value}</dd>
              </div>
            </div>
          ))}
          {loading && [0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </dl>
      )}
    </Card>
  );
}

// ---------- Remuneração ----------

function Pay({ portal, loading }: { portal: Transparencia | undefined; loading: boolean }) {
  const pay = portal?.encontrado ? portal.remuneracao : null;
  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Remuneração" icon="payments" action={pay && <span className="text-sm text-on-surface-variant">{longMonth(pay.mes)}</span>} />
      {loading ? <Skeleton className="h-52 rounded-xl" />
        : !pay ? <p className="px-1 text-sm text-on-surface-variant">{portal?.encontrado ? 'Nenhuma folha publicada nos últimos meses.' : 'Não achei este nome entre os servidores do IFRN no Portal da Transparência.'}</p>
          : <PayBreakdown pay={pay} link={portal!.encontrado ? portal!.link : ''} />}
    </Card>
  );
}

function PayBreakdown({ pay, link }: { pay: Folha; link: string }) {
  const parts = [
    { label: 'Recebe após deduções', value: pay.liquido, color: 'bg-primary' },
    { label: 'Imposto de renda', value: pay.irrf, color: 'bg-[var(--c-orange)]' },
    { label: 'Previdência', value: pay.previdencia, color: 'bg-[var(--c-sky)]' },
    { label: 'Outros descontos', value: pay.outrosDescontos, color: 'bg-[var(--c-lilac)]' },
  ].filter((p) => p.value > 0);
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const extras = [pay.ferias > 0 && `${money.format(pay.ferias)} de férias`, pay.natalina > 0 && `${money.format(pay.natalina)} de 13º`, pay.eventuais > 0 && `${money.format(pay.eventuais)} de eventuais`].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1">
        <div>
          <p className="text-[40px] leading-none font-semibold tracking-tight tabular">{money.format(pay.liquido)}</p>
          <p className="mt-1.5 text-sm text-on-surface-variant">após deduções</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium tabular">{money.format(pay.bruto)}</p>
          <p className="text-sm text-on-surface-variant">remuneração bruta</p>
        </div>
      </div>

      <div className="mt-5 flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Para onde vai a remuneração bruta">
        {parts.map((p, i) => (
          <m.span key={p.label} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: EMPHASIZED }}
            style={{ width: `${(p.value / total) * 100}%` }} className={cx('h-full origin-left', p.color)} />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5 px-1 text-sm">
            <span className={cx('size-2.5 shrink-0 rounded-full', p.color)} />
            <span className="flex-1 text-on-surface-variant">{p.label}</span>
            <span className="font-medium tabular">{money.format(p.value)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-1 border-t border-outline-variant px-1 pt-3 text-xs text-on-surface-variant">
        {extras.length > 0 && <p>Este mês inclui {extras.join(' e ')}.</p>}
        {pay.indenizacoes > 0 && <p>Mais {money.format(pay.indenizacoes)} em auxílios e indenizações, pagos à parte.</p>}
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start font-medium text-primary hover:underline">
          Fonte: Portal da Transparência<Icon name="open_in_new" size={14} />
        </a>
      </div>
    </>
  );
}

// ---------- Viagens ----------

function Trips({ data, loading, failed, hidden }: { data: { meses: string[]; viagens: Viagem[] } | undefined; loading: boolean; failed: boolean; hidden: boolean }) {
  const [all, setAll] = useState(false);
  const list = data?.viagens ?? [];
  const total = list.reduce((a, v) => a + v.total, 0);
  const months = data?.meses.length ?? 0;
  const since = months ? longMonth(data!.meses[months - 1]) : '';

  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Viagens a serviço" icon="flight_takeoff" action={months > 0 && <span className="shrink-0 text-sm text-on-surface-variant">{plural(months, 'mês', 'meses')}</span>} />
      {hidden ? <p className="px-1 text-sm text-on-surface-variant">Sem o cadastro no Portal da Transparência não dá para ligar viagens a esta pessoa.</p>
        : loading ? (
          <>
            <Skeleton className="h-40 rounded-xl" />
            <p className="mt-2 px-1 text-xs text-on-surface-variant">Conferindo mês a mês no Portal da Transparência…</p>
          </>
        ) : failed ? <p className="px-1 text-sm text-on-surface-variant">O Portal da Transparência não respondeu agora. Tente de novo mais tarde.</p>
          : list.length === 0 ? <p className="px-1 text-sm text-on-surface-variant">Nenhuma viagem a serviço paga pelo IFRN desde {since}.</p>
            : (
              <>
                <p className="mb-3 px-1 text-sm text-on-surface-variant">
                  {plural(list.length, 'viagem', 'viagens')}, <span className="font-medium text-on-surface tabular">{money.format(total)}</span> em diárias e passagens.
                </p>
                <ul className="flex flex-col gap-1.5">
                  {(all ? list : list.slice(0, 4)).map((v) => <Trip key={v.id} v={v} />)}
                </ul>
                {list.length > 4 && (
                  <Button variant="text" size="sm" icon={all ? undefined : 'expand_more'} onClick={() => setAll(!all)} className="mt-2">{all ? 'Mostrar menos' : `Ver as ${list.length} viagens`}</Button>
                )}
              </>
            )}
    </Card>
  );
}

function Trip({ v }: { v: Viagem }) {
  const [open, setOpen] = useState(false);
  const start = parseDay(v.inicio);
  const end = parseDay(v.fim);
  const days = start && end ? daysBetween(start, end) + 1 : null;
  return (
    <li>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="state flex w-full items-start gap-3 rounded-xl bg-surface-container-highest px-3.5 py-3 text-left">
        <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary-container py-1.5 leading-none text-on-secondary-container">
          <span className="text-lg font-semibold tabular">{start?.getDate() ?? '–'}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase">{start?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') ?? ''}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx('text-sm', open ? 'block' : 'line-clamp-2')}>{v.motivo || 'Motivo não informado'}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
            <span>{dayMonth(v.inicio)}{v.fim !== v.inicio && ` a ${dayMonth(v.fim)}`}{days && days > 1 ? ` · ${days} dias` : ''}</span>
            {v.internacional && <Badge tone="primary">Internacional</Badge>}
            {open && v.passagens > 0 && <span>· {money0.format(v.passagens)} em passagens</span>}
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium tabular">{money0.format(v.total)}</span>
      </button>
    </li>
  );
}

// ---------- Projetos ----------

const monthYear = (s: string | null) => parseDay(s)?.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' ') ?? '';

function Projects({ list }: { list: Projeto[] }) {
  return (
    <Card variant="filled" className="rounded-2xl p-5">
      <SectionHeader title="Projetos" icon="science" action={<span className="shrink-0 text-sm text-on-surface-variant">coordena {list.length}</span>} />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {list.map((p) => <ProjectCard key={p.id} p={p} />)}
      </div>
    </Card>
  );
}

function ProjectCard({ p }: { p: Projeto }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} aria-expanded={open} className="state rounded-xl bg-surface-container-highest p-4 text-left">
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge tone={p.tipo === 'pesquisa' ? 'primary' : 'neutral'} className={p.tipo === 'pesquisa' ? '' : '!bg-surface-container'}>
          <Icon name={p.tipo === 'pesquisa' ? 'science' : 'diversity_3'} size={14} />{p.tipo === 'pesquisa' ? 'Pesquisa' : 'Extensão'}
        </Badge>
        <span className="ml-auto text-xs text-on-surface-variant">{monthYear(p.inicio)}{p.fim && ` – ${monthYear(p.fim)}`}</span>
      </span>
      <span className="mt-2 block font-medium leading-6">{p.titulo}</span>
      {p.resumo && <span className={cx('mt-1.5 text-sm text-on-surface-variant', open ? 'block' : 'line-clamp-3')}>{p.resumo}</span>}
    </button>
  );
}
