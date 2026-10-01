import { useMemo, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useAluno, useAulas, useCalendario, useEu, useFrequencia, useMensagens, usePeriod, usePeriodos, useRequisitos } from '../lib/data';
import { graduationForecast, presenceByDay, streaks, type Forecast } from '../lib/semester';
import { daysBetween, isoDay, parseDay } from '../lib/dates';
import { PresenceCalendar } from '../components/PresenceCalendar';
import { SUAP_URL } from '../lib/suap';
import { classroom, connectClassroom } from '../lib/classroom';
import { session } from '../lib/api';
import { clearCache, refreshAll } from '../lib/store';
import { SEEDS, setMode, setSeed, useThemeState, type Mode } from '../lib/theme';
import { shareSite, SITE_URL, useInstall } from '../lib/hooks';
import { Badge, Button, Card, CountUp, cx, Icon, Item, Ring, SectionHeader, Segmented, Shape, Skeleton, spring, Stagger, Switch, Tap, WavyProgress } from '../components/ui';
import { Avatar } from '../components/Avatar';

const REQ_LABELS: Record<string, string> = {
  regulares_obrigatorios: 'Disciplinas obrigatórias',
  regulares_optativos: 'Optativas',
  eletivos: 'Eletivas',
  seminarios: 'Seminários',
  pratica_profissional: 'Prática profissional',
  pratica_profissional_estagio: 'Estágio',
  atividades_pratica_profissional: 'Atividades de prática profissional',
  extensao_componentes: 'Extensão (componentes)',
  extensao_outras_atividades: 'Extensão (outras atividades)',
  extensao_outros_componentes: 'Extensão (outros componentes)',
  atividades_aprofundamento: 'Atividades de aprofundamento',
  atividades_complementares: 'Atividades complementares',
  tcc: 'TCC',
  pratica_componente: 'Prática como componente',
  visita_tecnica: 'Visita técnica',
};

export function Me() {
  const { data: eu } = useEu();
  const { data: aluno } = useAluno();
  const { data: periodos } = usePeriodos();
  const { data: msgs } = useMensagens();
  const unread = msgs?.filter((x) => !x.registro_leitura).length ?? 0;
  // O SUAP costuma errar periodo_referencia (fica travado desde o ingresso), então
  // preferimos contar quantos períodos letivos o aluno já teve diário/matrícula.
  const periodoAtual = periodos?.length || aluno?.periodo_referencia;
  const ira = aluno ? Number(String(aluno.ira).replace(',', '.')) : null;
  const { canInstall, install } = useInstall();
  const [shareMsg, setShareMsg] = useState('');

  const logout = () => {
    classroom.unlink();
    clearCache();
    session.clear();
  };

  const share = async () => {
    const r = await shareSite();
    if (r === 'copied') { setShareMsg('Link copiado!'); setTimeout(() => setShareMsg(''), 2500); }
  };

  return (
    <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Item className="lg:col-span-12">
        <Card variant="primary" className="flex flex-col gap-5 rounded-2xl p-6 md:flex-row md:items-center">
          <Avatar size={88} link={false} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[32px] leading-10 font-semibold tracking-tight">{eu?.nome_usual ?? ' '}</h1>
            <p className="mt-1 text-sm opacity-85 tabular">{eu?.identificacao}{eu?.campus && ` · Campus ${eu.campus}`}</p>
            {aluno && <p className="mt-2 text-base font-medium">{aluno.curso}</p>}
            {aluno && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-white/50 !text-current dark:bg-black/25">{aluno.situacao}</Badge>
                <Badge className="bg-white/50 !text-current dark:bg-black/25">Ingresso {aluno.ingresso}</Badge>
                <Badge className="bg-white/50 !text-current dark:bg-black/25">{periodoAtual}º período{aluno.qtd_periodos ? ` de ${aluno.qtd_periodos}` : ''}</Badge>
              </div>
            )}
          </div>
          {aluno && (
            <Ring value={(ira ?? 0) / 100} size={112} stroke={10} color="currentColor" track="rgb(0 0 0 / .1)">
              <div className="text-center leading-none">
                <CountUp value={ira} decimals={1} className="text-3xl font-semibold" />
                <p className="mt-1 text-xs font-medium opacity-80">IRA</p>
              </div>
            </Ring>
          )}
        </Card>
      </Item>

      <Item className="lg:col-span-12"><Presence /></Item>
      <Item className="lg:col-span-6"><Completion /></Item>
      <Item className="lg:col-span-6"><Appearance /></Item>

      <Item className="lg:col-span-6">
        <SectionHeader title="Atalhos" icon="bolt" />
        <List>
          <Row to="/mensagens" icon="mail" label="Mensagens do SUAP" sub={unread ? `${unread} não ${unread === 1 ? 'lida' : 'lidas'}` : 'Caixa de entrada'}
            right={unread > 0 ? <Badge tone="error">{unread}</Badge> : <Icon name="chevron_right" />} />
          <Row to="/retrospectiva" icon="auto_awesome" label="Retrospectiva do semestre" sub="Seus números, pronta para compartilhar" right={<Icon name="chevron_right" />} />
          <Row to="/campus" icon="apartment" label="Campus" sub="Eventos, projetos e o IFRN em números" right={<Icon name="chevron_right" />} />
          <Row href={SUAP_URL} icon="open_in_new" label="Abrir o SUAP" sub="suap.ifrn.edu.br" right={<Icon name="chevron_right" />} />
          {canInstall && <Row onClick={install} icon="install_mobile" label="Instalar o Supaco" sub="Abre como app, direto da tela inicial" right={<Icon name="download" />} />}
          <Row onClick={share} icon="share" label="Compartilhar com a turma" sub={shareMsg || SITE_URL.replace('https://', '')} right={<Icon name="chevron_right" />} />
          <Row to="/diagnostico" icon="troubleshoot" label="Diagnóstico" sub="Ver o que o SUAP está respondendo" right={<Icon name="chevron_right" />} />
        </List>
      </Item>

      <Item className="lg:col-span-6">
        <SectionHeader title="Conta" icon="manage_accounts" />
        <List>
          <ClassroomRow />
          <Row onClick={logout} icon="logout" label="Sair da conta" sub="Apaga os dados salvos neste aparelho" danger />
        </List>
      </Item>
    </Stagger>
  );
}

function List({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1 overflow-hidden rounded-2xl">{children}</div>;
}

function Row({ icon, label, sub, right, to, href, onClick, danger }: { icon: string; label: string; sub?: string; right?: ReactNode; to?: string; href?: string; onClick?: () => void; danger?: boolean }) {
  return (
    <Tap to={to} href={href} onClick={onClick} className="flex min-h-[72px] items-center gap-4 rounded-sm bg-surface-container px-4 py-3">
      <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container')}>
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx('text-base', danger && 'text-error')}>{label}</p>
        {sub && <p className="truncate text-sm text-on-surface-variant">{sub}</p>}
      </div>
      <span className="text-on-surface-variant">{right}</span>
    </Tap>
  );
}

function Appearance() {
  const { mode, seed } = useThemeState();
  return (
    <>
      <SectionHeader title="Aparência" icon="palette" />
      <Card variant="filled" className="rounded-2xl p-5">
        <p className="mb-2 text-sm font-medium text-on-surface-variant">Modo</p>
        <Segmented<Mode> value={mode} onChange={setMode} className="w-full"
          options={[{ value: 'light', label: 'Claro', icon: 'light_mode' }, { value: 'dark', label: 'Escuro', icon: 'dark_mode' }, { value: 'system', label: 'Sistema', icon: 'brightness_auto' }]} />
        <p className="mt-5 mb-3 text-sm font-medium text-on-surface-variant">Cor do tema</p>
        <div className="flex flex-wrap gap-3">
          {SEEDS.map((s) => (
            <button key={s.id} onClick={() => setSeed(s.id)} aria-label={s.label} title={s.label} aria-pressed={seed === s.id}
              className="flex flex-col items-center gap-1.5">
              <span className="relative flex size-14 items-center justify-center rounded-full" style={{ background: s.hex }}>
                {seed === s.id && (
                  <m.span layoutId="seed-check" transition={spring} className="flex size-7 items-center justify-center rounded-full bg-white text-black">
                    <Icon name="check" size={18} weight={700} />
                  </m.span>
                )}
              </span>
              <span className="text-xs text-on-surface-variant">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

function Completion() {
  const { data } = useRequisitos();
  const { data: periodos } = usePeriodos();
  const { data: aluno } = useAluno();
  const f = data && periodos ? graduationForecast(data, periodos, aluno) : null;
  const pct = data ? Math.round(Number(data.percentual_cumprida) || 0) : 0;
  const pending = data ? Object.entries(data)
    .filter(([k, v]) => REQ_LABELS[k] && typeof v === 'object' && v && (v as { ch_pendente: number }).ch_pendente > 0)
    .map(([k, v]) => ({ label: REQ_LABELS[k], ...(v as { ch_pendente: number }) })) : [];

  return (
    <>
      <SectionHeader title="Conclusão do curso" icon="workspace_premium" />
      <Card variant="filled" className="rounded-2xl p-5">
        {!data ? <Skeleton className="h-32" /> : (
          <>
            <div className="flex items-end justify-between gap-4">
              <p className="text-[57px] leading-none font-semibold tracking-tight"><CountUp value={pct} suffix="%" /></p>
              <p className="mb-1 text-right text-sm text-on-surface-variant">{data.totais.ch_cumprida} de {data.totais.ch_esperada} h</p>
            </div>
            <WavyProgress value={pct / 100} className="mt-4" />
            {f && <ForecastBox f={f} />}
            {pending.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {pending.map((p) => (
                  <li key={p.label} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3.5 py-2.5 text-sm">
                    <span>{p.label}</span>
                    <span className="shrink-0 font-medium text-tertiary">faltam {p.ch_pendente} h</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </>
  );
}

function ForecastBox({ f }: { f: Forecast }) {
  const onTime = f.lateBy === 0;
  return (
    <div className={cx('mt-4 flex items-center gap-4 rounded-xl p-4', onTime ? 'bg-success-container text-on-success-container' : 'bg-tertiary-container text-on-tertiary-container')}>
      <Shape shape={onTime ? 'flower' : 'clover'} size={56} className={onTime ? 'text-success' : 'text-tertiary'}>
        <Icon name="workspace_premium" className={onTime ? 'text-on-success' : 'text-on-tertiary'} fill />
      </Shape>
      <div className="min-w-0 flex-1">
        <p className="text-sm opacity-85">Formatura prevista</p>
        <p className="text-[28px] leading-8 font-semibold tracking-tight tabular">{f.remaining === 0 ? 'Carga completa!' : f.forecast}</p>
        <p className="mt-1 text-sm opacity-85">
          {f.remaining === 0 ? 'Todas as horas do curso já foram cumpridas.'
            : onTime ? `No seu ritmo (${f.pace} h por semestre) você fecha no prazo${f.nominal ? ` da matriz (${f.nominal})` : ''}.`
            : `No seu ritmo (${f.pace} h por semestre). ${f.nominal ? `Para terminar em ${f.nominal}, seriam ~${f.paceForNominal} h por semestre.` : ''}`}
        </p>
      </div>
    </div>
  );
}

function Presence() {
  const { current } = usePeriod();
  const { data: cal } = useCalendario(current);
  const { data: freq } = useFrequencia(current);
  const { data: aulas, loading } = useAulas(current);
  const days = useMemo(() => (aulas ? presenceByDay(aulas) : []), [aulas]);
  const s = streaks(days);
  const start = parseDay(cal?.data_inicio);
  const end = parseDay(cal?.data_fim);
  const weeksLeft = end ? Math.max(0, Math.ceil(daysBetween(new Date(), end) / 7)) : null;
  const pct = freq?.percentual_frequencia ?? null;

  return (
    <>
      <SectionHeader title="Presença no semestre" icon="calendar_month"
        action={<Button variant="text" size="sm" icon="auto_awesome" to="/retrospectiva">Retrospectiva</Button>} />
      <Card variant="filled" className="rounded-2xl p-5">
        {loading ? <Skeleton className="h-48" /> : days.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhuma aula lançada ainda neste semestre.</p>
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1"><PresenceCalendar aulas={aulas} days={days} from={start ? isoDay(start) : null} to={end ?? undefined} /></div>
            <div className="flex flex-col gap-3 lg:w-72 lg:shrink-0 lg:border-l lg:border-outline-variant lg:pl-5">
              {pct !== null && freq && (
                <div className="flex items-center gap-4">
                  <Ring value={pct / 100} size={76} stroke={8} color={pct < 75 ? 'var(--md-error)' : 'var(--c-success)'}>
                    <span className="text-lg font-semibold tabular">{pct}%</span>
                  </Ring>
                  <div className="text-sm">
                    <p className="font-medium">{pct < 75 ? 'Abaixo dos 75%' : 'Frequência em dia'}</p>
                    <p className="text-on-surface-variant tabular">{freq.total_aulas - freq.total_faltas} de {freq.total_aulas} aulas · {freq.total_faltas} faltas</p>
                    {weeksLeft !== null && <p className="text-on-surface-variant">{weeksLeft ? `${weeksLeft} ${weeksLeft === 1 ? 'semana' : 'semanas'} até o fim` : 'última semana'}</p>}
                  </div>
                </div>
              )}
              <StreakPill icon="local_fire_department" value={s.current} label={s.current === 1 ? 'dia seguido sem faltar' : 'dias seguidos sem faltar'} hot={s.current >= 5} />
              <StreakPill icon="workspace_premium" value={s.best} label="melhor sequência" />
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function StreakPill({ icon, value, label, hot }: { icon: string; value: number; label: string; hot?: boolean }) {
  return (
    <div className={cx('flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5', hot ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest')}>
      <m.span animate={hot ? { scale: [1, 1.15, 1] } : undefined} transition={{ repeat: Infinity, duration: 1.6 }}
        className={cx('flex size-8 items-center justify-center rounded-full', hot ? 'bg-tertiary text-on-tertiary' : 'bg-secondary-container text-on-secondary-container')}>
        <Icon name={icon} size={18} fill />
      </m.span>
      <span className="text-lg font-semibold tabular">{value}</span>
      <span className="text-sm opacity-80">{label}</span>
    </div>
  );
}

function ClassroomRow() {
  const [linked, setLinked] = useState(classroom.linked);
  const [busy, setBusy] = useState(false);
  const toggle = async (on: boolean) => {
    if (!on) { classroom.unlink(); setLinked(false); refreshAll(); return; }
    setBusy(true);
    try { await connectClassroom(); setLinked(true); refreshAll(); } catch { /* popup fechado */ } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-[72px] items-center gap-4 rounded-sm bg-surface-container px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name="assignment" size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-base">Google Classroom</p>
        <p className="text-sm text-on-surface-variant">{busy ? 'Conectando…' : linked ? 'Conectado · tarefas na Agenda' : 'Desconectado'}</p>
      </div>
      <Switch on={linked} onChange={toggle} label="Conectar Google Classroom" />
    </div>
  );
}
