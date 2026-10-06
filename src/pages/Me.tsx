import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAluno, useAulas, useCalendario, useEu, useFrequencia, useMensagens, usePeriod, usePeriodos, useRequisitos } from '../lib/data';
import { graduationForecast, presenceByDay, streaks, type Forecast } from '../lib/semester';
import { daysBetween, isoDay, parseDay } from '../lib/dates';
import { PresenceCalendar } from '../components/PresenceCalendar';
import { SUAP_URL } from '../lib/suap';
import { classroom, connectClassroom } from '../lib/classroom';
import { onSessionChange, session } from '../lib/api';
import { clearCache, refreshAll } from '../lib/store';
import { buildVars, DEFAULT_PREFS, FAMILIES, resetTheme, SEEDS, seedHex, setCustomColor, setMode, setPref, setSeed, STYLES, swatch, useThemeState, type Mode, type Palette, type Prefs } from '../lib/theme';
import { setVibe, useVibe } from '../lib/vibe';
import { shareSite, SITE_URL, useInstall } from '../lib/hooks';
import { Badge, Button, Card, Chip, CountUp, cx, EMPHASIZED, Icon, Item, Ring, SectionHeader, Segmented, Shape, Skeleton, spring, Stagger, Switch, Tap, WavyProgress } from '../components/ui';
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
  const { canInstall, install, iosHint } = useInstall();
  const [shareMsg, setShareMsg] = useState('');

  const logout = () => {
    classroom.unlink();
    clearCache();
    session.clear();
    navigator.clearAppBadge?.().catch(() => { /* sem permissão */ });
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
          <Row to="/servidores" icon="badge" label="Servidores do IFRN" sub="Professores e técnicos, com cargo, remuneração e viagens" right={<Icon name="chevron_right" />} />
          <Row to="/campus" icon="apartment" label="Campus" sub="Eventos, projetos e o IFRN em números" right={<Icon name="chevron_right" />} />
          <Row href={SUAP_URL} icon="open_in_new" label="Abrir o SUAP" sub="suap.ifrn.edu.br" right={<Icon name="chevron_right" />} />
          {canInstall && <Row onClick={install} icon="install_mobile" label="Instalar o Supaco" sub="Abre como app, direto da tela inicial" right={<Icon name="download" />} />}
          {iosHint && <InfoRow icon="ios_share" label="Instalar o Supaco" sub="No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”" />}
          <Row onClick={share} icon="share" label="Compartilhar com a turma" sub={shareMsg || SITE_URL.replace('https://', '')} right={<Icon name="chevron_right" />} />
          <Row to="/diagnostico" icon="troubleshoot" label="Diagnóstico" sub="Ver o que o SUAP está respondendo" right={<Icon name="chevron_right" />} />
        </List>
      </Item>

      <Item className="lg:col-span-6">
        <SectionHeader title="Conta" icon="manage_accounts" />
        <List>
          <ClassroomRow />
          <KeepLoginRow />
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

/** Miniatura de uma combinação de cores: primária em cima, secundária e terciária embaixo. */
function Swatch({ colors, size = 56 }: { colors: { primary: string; secondary: string; tertiary: string }; size?: number }) {
  return (
    <span className="relative block overflow-hidden rounded-full" style={{ width: size, height: size, background: colors.primary }}>
      <span className="absolute inset-x-0 bottom-0 flex h-1/2">
        <span className="flex-1" style={{ background: colors.secondary }} />
        <span className="flex-1" style={{ background: colors.tertiary }} />
      </span>
    </span>
  );
}

function Setting({ icon, label, hint, stack, off, children }: { icon?: string; label: string; hint?: string; stack?: boolean; off?: boolean; children: ReactNode }) {
  return (
    <div className={cx('flex gap-x-4 gap-y-2.5 py-3', stack ? 'flex-col' : 'flex-wrap items-center justify-between', off && 'pointer-events-none opacity-45')}>
      <div className="flex min-w-40 flex-1 items-center gap-3">
        {icon && <Icon name={icon} size={20} className="shrink-0 text-on-surface-variant" />}
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {hint && <p className="text-sm text-on-surface-variant">{hint}</p>}
        </div>
      </div>
      {/* O controle não encolhe: sem espaço ao lado do rótulo, desce para a linha de baixo */}
      {stack ? children : <div className="max-w-full shrink-0">{children}</div>}
    </div>
  );
}

/** Título de um bloco da aparência, com o valor atual à direita. */
function BlockLabel({ icon, children, aside }: { icon: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
      <Icon name={icon} size={18} className="text-primary" />
      <span className="flex-1">{children}</span>
      {aside && <span className="font-normal">{aside}</span>}
    </div>
  );
}

/** Grupo de ajustes que abre e fecha; fechado, o resumo mostra como cada ajuste está. */
function Group({ icon, title, summary, open, onToggle, children }: { icon: string; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-t border-outline-variant/60">
      <button onClick={onToggle} aria-expanded={open} className="state flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name={icon} size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-sm text-on-surface-variant first-letter:uppercase">{summary}</span>
        </span>
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={spring} className="inline-flex text-on-surface-variant"><Icon name="expand_more" /></m.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }} className="overflow-hidden">
            <div className="divide-y divide-outline-variant/40 px-1 pb-2">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Miniatura de um tema: fundo, uma linha de texto e os três destaques. */
function ThemeTile({ label, icon, pal, on, onClick }: { label: string; icon?: string; pal: { bg: string; fg: string; dots: string[] }; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cx('state flex flex-col gap-1.5 rounded-xl border p-1.5 text-left', on ? 'border-primary ring-1 ring-primary' : 'border-outline-variant')}>
      <span className="relative flex h-14 flex-col justify-between overflow-hidden rounded-lg p-2 ring-1 ring-black/10 dark:ring-white/10" style={{ background: pal.bg }}>
        <span className="flex gap-1">
          <span className="h-1.5 w-7 rounded-full" style={{ background: pal.fg }} />
          <span className="h-1.5 w-3 rounded-full opacity-45" style={{ background: pal.fg }} />
        </span>
        <span className="flex gap-1">{pal.dots.map((c, i) => <span key={i} className="size-3.5 rounded-full" style={{ background: c }} />)}</span>
        {on && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary"><Icon name="check" size={14} weight={700} /></span>}
      </span>
      <span className="flex items-center gap-1 px-0.5 text-xs leading-4 font-medium">{icon && <Icon name={icon} size={14} className="text-on-surface-variant" />}<span className="truncate">{label}</span></span>
    </button>
  );
}

/** Botão de uma cor pronta do tema. */
function SeedButton({ s, on }: { s: { id: string; label: string; colors: { primary: string; secondary: string; tertiary: string } }; on: boolean }) {
  return (
    <button onClick={() => setSeed(s.id)} aria-label={s.label} title={s.label} aria-pressed={on}>
      <m.span whileTap={{ scale: 0.9 }} transition={spring} className={cx('relative flex items-center justify-center rounded-full p-1 ring-2 transition-shadow', on ? 'ring-primary' : 'ring-transparent')}>
        <Swatch colors={s.colors} size={36} />
        {on && (
          <m.span layoutId="seed-check" transition={spring} className="absolute flex size-5 items-center justify-center rounded-full bg-white text-black shadow">
            <Icon name="check" size={14} weight={700} />
          </m.span>
        )}
      </m.span>
    </button>
  );
}

/** Amostra de cor que abre o seletor nativo (invisível por cima dela). */
function ColorWell({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="relative flex cursor-pointer flex-col items-center gap-1.5">
      <span className="block size-11 rounded-full ring-1 ring-outline-variant" style={{ background: value }} />
      <span className="text-xs text-on-surface-variant">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  );
}

const MODE_LABEL: Record<Mode, string> = { dark: 'escuro', light: 'claro', system: 'sistema' };
const SHAPE_LABEL: Record<Prefs['shape'], string> = { round: 'redondos', soft: 'suaves', sharp: 'retos' };
const TEXT_LABEL: Record<Prefs['text'], string> = { sm: 'menor', md: 'padrão', lg: 'maior' };
const SUBJECT_LABEL: Record<Prefs['subjects'], string> = { none: 'Sem cor', soft: 'Suaves', normal: 'Padrão', vivid: 'Vivas' };
// Classes literais para o Tailwind encontrar no build: cada opção aparece na própria fonte
const FONT_OPTIONS: { id: Prefs['font']; label: string; cls: string }[] = [
  { id: 'padrao', label: 'Padrão', cls: '' },
  { id: 'sistema', label: 'Do aparelho', cls: '[font-family:system-ui,sans-serif]' },
  { id: 'serifa', label: 'Serifa', cls: '[font-family:Georgia,serif]' },
  { id: 'mono', label: 'Mono', cls: '[font-family:ui-monospace,monospace]' },
];

type GroupId = 'cores' | 'forma' | 'clima';

/**
 * Aparência em três níveis: o modo (claro/escuro), o tema (o dinâmico do Supaco, um pronto ou o da pessoa) e,
 * recolhidos em grupos, os ajustes finos. Cada ajuste só aparece onde faz efeito.
 */
function Appearance() {
  const { mode, seed, dark, prefs } = useThemeState();
  const vibe = useVibe();
  const [open, setOpen] = useState<GroupId | null>(null);
  const toggle = (g: GroupId) => setOpen(open === g ? null : g);

  const dynamic = prefs.theme === 'dinamico';
  const own = prefs.theme === 'custom';
  const family = FAMILIES.find((f) => f.id === prefs.theme);
  const mono = dynamic && prefs.style === 'mono';
  const customSeed = seed.startsWith('#');
  const pure = dark ? 'Preto' : 'Branco';

  const seeds = useMemo(() => SEEDS.map((s) => ({ ...s, colors: swatch(s.id, dark, prefs.style) })), [dark, prefs.style]);
  const styles = useMemo(() => STYLES.map((st) => ({ ...st, colors: swatch(seed, dark, st.id) })), [seed, dark]);
  const tiles = useMemo(() => {
    const pal = (p: Palette) => ({ bg: p.bg, fg: p.fg, dots: [...p.accents] });
    // O dinâmico aparece como ficaria agora, com a cor, o estilo e o fundo escolhidos
    const v = buildVars(seedHex(seed), dark, { ...prefs, theme: 'dinamico' });
    const k = dark ? 'dark' : 'light';
    return [
      { id: 'dinamico', label: 'Supaco', icon: 'auto_awesome', pal: { bg: v['--md-surface'], fg: v['--md-on-surface'], dots: [v['--md-primary'], v['--md-secondary'], v['--md-tertiary']] } },
      ...FAMILIES.map((f) => ({ id: f.id, label: f.label, icon: undefined, pal: pal(f[k]) })),
      { id: 'custom', label: 'Seu tema', icon: 'edit', pal: pal(prefs.custom[k]) },
    ];
  }, [seed, dark, prefs]);

  const changed = seed !== SEEDS[0].id || (Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]).some((key) => JSON.stringify(prefs[key]) !== JSON.stringify(DEFAULT_PREFS[key]));
  const bgLabel = prefs.bg === 'pure' ? pure.toLowerCase() : prefs.bg === 'neutral' && dynamic ? 'neutro' : dynamic ? 'com cor' : 'do tema';
  const summary = {
    cores: [dynamic && STYLES.find((s) => s.id === prefs.style)?.label, !own && `fundo ${bgLabel}`, `matérias ${mono ? 'sem cor' : SUBJECT_LABEL[prefs.subjects].toLowerCase()}`].filter(Boolean).join(' · '),
    forma: `cantos ${SHAPE_LABEL[prefs.shape]} · texto ${TEXT_LABEL[prefs.text]} · fonte ${FONT_OPTIONS.find((f) => f.id === prefs.font)!.label.toLowerCase()}`,
    clima: vibe.tone === 'zueira' ? `zueira${vibe.memes ? ' · com memes' : ''}` : 'sério',
  };

  return (
    <>
      <SectionHeader title="Aparência" icon="palette" />
      <Card variant="filled" className="rounded-2xl p-5">
        <BlockLabel icon={dark ? 'dark_mode' : 'light_mode'}>Modo</BlockLabel>
        <Segmented<Mode> value={mode} onChange={setMode} className="w-full"
          options={[{ value: 'dark', label: 'Escuro', icon: 'dark_mode' }, { value: 'light', label: 'Claro', icon: 'light_mode' }, { value: 'system', label: 'Sistema', icon: 'brightness_auto' }]} />

        <div className="mt-6">
          <BlockLabel icon="brush" aside={`${tiles.find((t) => t.id === prefs.theme)?.label} ${MODE_LABEL[dark ? 'dark' : 'light']}`}>Tema</BlockLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
            {tiles.map((t) => <ThemeTile key={t.id} label={t.label} icon={t.icon} pal={t.pal} on={prefs.theme === t.id} onClick={() => setPref('theme', t.id)} />)}
          </div>
        </div>

        {/* O que dá para mexer no tema escolhido */}
        <div className="mt-4 rounded-xl bg-surface-container-high p-3.5">
          {dynamic && (
            <>
              <BlockLabel icon="colorize" aside={customSeed ? seed.toUpperCase() : SEEDS.find((s) => s.id === seed)?.label}>Cor do tema</BlockLabel>
              <div className={cx('flex flex-wrap gap-1', mono && 'opacity-45')}>
                {seeds.map((s) => <SeedButton key={s.id} s={s} on={seed === s.id} />)}
                {/* Qualquer cor: o seletor nativo fica invisível por cima da amostra */}
                <label className="relative cursor-pointer" title="Escolher outra cor">
                  <span className={cx('relative flex items-center justify-center rounded-full p-1 ring-2', customSeed ? 'ring-primary' : 'ring-transparent')}>
                    <span className="block size-9 rounded-full" style={{ background: customSeed ? seed : 'conic-gradient(#e64545, #e6c145, #4bc24b, #45bfe6, #6a5ae6, #e645b6, #e64545)' }} />
                    <span className="absolute flex size-5 items-center justify-center rounded-full bg-white text-black shadow"><Icon name={customSeed ? 'check' : 'colorize'} size={14} weight={700} /></span>
                  </span>
                  <input type="color" value={seedHex(seed)} onChange={(e) => setSeed(e.target.value)} aria-label="Escolher outra cor" className="absolute inset-0 size-full cursor-pointer opacity-0" />
                </label>
              </div>
              {mono && <p className="mt-2 text-xs text-on-surface-variant">No estilo monocromático a cor não aparece. Troque o estilo em “Cores e fundo”.</p>}
            </>
          )}
          {own && (
            <>
              <BlockLabel icon="edit" aside={`modo ${MODE_LABEL[dark ? 'dark' : 'light']}`}>Suas cores</BlockLabel>
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                <ColorWell label="Fundo" value={prefs.custom[dark ? 'dark' : 'light'].bg} onChange={(hex) => setCustomColor(dark, 'bg', hex)} />
                <ColorWell label="Texto" value={prefs.custom[dark ? 'dark' : 'light'].fg} onChange={(hex) => setCustomColor(dark, 'fg', hex)} />
                {(['Destaque', '2ª cor', '3ª cor'] as const).map((label, i) => (
                  <ColorWell key={label} label={label} value={prefs.custom[dark ? 'dark' : 'light'].accents[i]} onChange={(hex) => setCustomColor(dark, i as 0 | 1 | 2, hex)} />
                ))}
                <ColorWell label="Erro" value={prefs.custom[dark ? 'dark' : 'light'].error} onChange={(hex) => setCustomColor(dark, 'error', hex)} />
              </div>
              <p className="mt-2.5 text-xs text-on-surface-variant">O claro e o escuro têm cores separadas: troque o modo para ajustar o outro.</p>
            </>
          )}
          {family && (
            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Icon name="brush" size={18} className="shrink-0 text-primary" />
              <span><b className="font-medium text-on-surface">{family.label}</b> tem as cores fixas, na versão {MODE_LABEL[dark ? 'dark' : 'light']}. Para escolher a cor, use o tema Supaco ou monte o seu.</span>
            </p>
          )}
        </div>

        <div className="mt-4">
          <Group icon="format_color_fill" title="Cores e fundo" summary={summary.cores} open={open === 'cores'} onToggle={() => toggle('cores')}>
            {dynamic && (
              <Setting icon="style" label="Estilo da paleta" hint="Como a cor do tema vira as outras cores" stack>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {styles.map((st) => {
                    const on = prefs.style === st.id;
                    return (
                      <button key={st.id} onClick={() => setPref('style', st.id)} aria-pressed={on}
                        className={cx('state relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left', on ? 'border-transparent text-on-secondary-container' : 'border-outline-variant')}>
                        {on && <m.span layoutId="style-on" transition={spring} className="absolute inset-0 -z-10 rounded-xl bg-secondary-container" />}
                        <Swatch colors={st.colors} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{st.label}</span>
                          <span className={cx('block truncate text-xs', on ? 'opacity-80' : 'text-on-surface-variant')}>{st.hint}</span>
                        </span>
                        {on && <Icon name="check" size={18} />}
                      </button>
                    );
                  })}
                </div>
              </Setting>
            )}
            {!own && (
              <Setting icon="invert_colors" label="Fundo" hint={dark ? 'Preto puro poupa bateria em tela OLED' : 'Do tom do tema ao branco puro'}>
                {dynamic ? (
                  <Segmented<Prefs['bg']> value={prefs.bg} onChange={(v) => setPref('bg', v)}
                    options={[{ value: 'tinted', label: 'Com cor' }, { value: 'neutral', label: 'Neutro' }, { value: 'pure', label: pure }]} />
                ) : (
                  <Segmented<'tinted' | 'pure'> value={prefs.bg === 'pure' ? 'pure' : 'tinted'} onChange={(v) => setPref('bg', v)}
                    options={[{ value: 'tinted', label: 'Do tema' }, { value: 'pure', label: pure }]} />
                )}
              </Setting>
            )}
            {dynamic && (
              <Setting icon="contrast" label="Contraste" hint="Mais diferença entre texto e fundo">
                <Segmented value={String(prefs.contrast) as '0' | '1' | '2'} onChange={(v) => setPref('contrast', Number(v) as Prefs['contrast'])}
                  options={[{ value: '0', label: 'Padrão' }, { value: '1', label: 'Médio' }, { value: '2', label: 'Alto' }]} />
              </Setting>
            )}
            <Setting icon="category" label="Cores das matérias" hint={mono ? 'No estilo monocromático as matérias ficam em cinza' : 'O quanto cada matéria se destaca'} stack>
              <div className="flex flex-wrap items-center gap-2">
                <div className={cx('flex flex-wrap gap-2', mono && 'pointer-events-none opacity-45')}>
                  {(Object.keys(SUBJECT_LABEL) as Prefs['subjects'][]).map((v) => (
                    <Chip key={v} label={SUBJECT_LABEL[v]} selected={mono ? v === 'none' : prefs.subjects === v} onClick={() => setPref('subjects', v)} />
                  ))}
                </div>
                <span className="ml-auto flex gap-1.5" aria-hidden>
                  {(['teal', 'pink', 'yellow', 'lilac', 'orange', 'sky'] as const).map((t) => <span key={t} className="size-4 rounded-full" style={{ background: `var(--c-${t})` }} />)}
                </span>
              </div>
            </Setting>
          </Group>

          <Group icon="format_shapes" title="Forma e texto" summary={summary.forma} open={open === 'forma'} onToggle={() => toggle('forma')}>
            <Setting icon="rounded_corner" label="Cantos" hint="Formato de cartões e blocos">
              <Segmented<Prefs['shape']> value={prefs.shape} onChange={(v) => setPref('shape', v)}
                options={[{ value: 'round', label: 'Redondos' }, { value: 'soft', label: 'Suaves' }, { value: 'sharp', label: 'Retos' }]} />
            </Setting>
            <Setting icon="format_size" label="Tamanho do texto" hint="Aumenta ou diminui tudo junto">
              <Segmented<Prefs['text']> value={prefs.text} onChange={(v) => setPref('text', v)}
                options={[{ value: 'sm', label: 'Menor' }, { value: 'md', label: 'Padrão' }, { value: 'lg', label: 'Maior' }]} />
            </Setting>
            <Setting icon="font_download" label="Fonte" hint="A letra usada no app inteiro" stack>
              <div className="flex flex-wrap gap-2">
                {FONT_OPTIONS.map((f) => <Chip key={f.id} label={f.label} className={f.cls} selected={prefs.font === f.id} onClick={() => setPref('font', f.id)} />)}
              </div>
            </Setting>
          </Group>

          <Group icon="celebration" title="Clima do app" summary={summary.clima} open={open === 'clima'} onToggle={() => toggle('clima')}>
            <Setting icon="school" label="Tom" hint="Sério vai direto ao ponto; zueira brinca com você">
              <Segmented<'serio' | 'zueira'> value={vibe.tone} onChange={(tone) => setVibe({ tone, asked: true, ...(tone === 'zueira' && !vibe.asked ? { memes: true } : {}) })}
                options={[{ value: 'serio', label: 'Sério', icon: 'school' }, { value: 'zueira', label: 'Zueira', icon: 'celebration' }]} />
            </Setting>
            <Setting icon="image" label="Memes" hint={vibe.tone === 'serio' ? 'Disponível no modo zueira' : 'A resposta do “posso faltar?” vem com meme'} off={vibe.tone === 'serio'}>
              <Switch on={vibe.tone === 'zueira' && vibe.memes} onChange={(memes) => setVibe({ memes })} label="Mostrar memes" />
            </Setting>
          </Group>

          <div className="border-t border-outline-variant/60 px-1">
            <Setting icon="animation" label="Reduzir animações" hint="Desliga transições e movimentos">
              <Switch on={prefs.reduceMotion} onChange={(v) => setPref('reduceMotion', v)} label="Reduzir animações" />
            </Setting>
          </div>
        </div>

        {changed && <div className="mt-1 flex justify-end"><Button variant="text" size="sm" icon="refresh" onClick={resetTheme}>Restaurar padrão</Button></div>}
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

/** Linha só informativa (ou com um controle à direita): o texto de apoio quebra em vez de cortar. */
function InfoRow({ icon, label, sub, right }: { icon: string; label: string; sub: string; right?: ReactNode }) {
  return (
    <div className="flex min-h-[72px] items-center gap-4 rounded-sm bg-surface-container px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name={icon} size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-base">{label}</p>
        <p className="text-sm text-on-surface-variant">{sub}</p>
      </div>
      {right}
    </div>
  );
}

function KeepLoginRow() {
  const keeps = useSyncExternalStore(onSessionChange, () => session.keepsLogin);
  // Religar exige a senha, e ela só passa pelo app na tela de login
  if (!keeps) return <InfoRow icon="key" label="Manter conectado" sub="Desligado · para ligar, saia e entre de novo com a opção marcada" />;
  return (
    <InfoRow icon="key" label="Manter conectado" sub="Senha cifrada neste aparelho · o app entra de novo sozinho quando o SUAP encerra a sessão"
      right={<Switch on onChange={() => session.forgetPassword()} label="Manter conectado" />} />
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
