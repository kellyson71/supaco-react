// Página inicial de quem não entrou: apresenta o Supaco, deixa testar a conta de nota e tem o login no topo.
import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { m } from 'motion/react';
import { login, session } from '../lib/api';
import { shareSite, SITE_URL, useInstall } from '../lib/hooks';
import { PAGES } from '../lib/seo';
import { Button, cx, Icon, IconButton, Shape, Switch, TextField, type ShapeName } from '../components/ui';
import { GradeCalculator } from '../components/Calculators';
import { FaqList, PublicFooter, PublicHeader, SectionTitle, Wrap } from '../components/Public';

export function Login() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface">
      {/* A forma do fundo passa por trás do cabeçalho e do topo */}
      <Shape shape="sunny" size={620} spin className="pointer-events-none absolute -top-56 -left-56 text-primary-container/45 max-lg:hidden" />
      <div className="relative"><PublicHeader current="/" /></div>
      <main className="relative">
        <Hero />
        <Demo />
        <Inside />
        <Privacy />
        <Questions />
        <Closing />
      </main>
      <PublicFooter />
    </div>
  );
}

// ---------- Topo: a promessa e o login ----------

const TRUST = ['Grátis e sem anúncio', 'Sem cadastro: é a sua conta do SUAP', 'Abre até sem internet'];

function Hero() {
  return (
    <section>
      <Wrap className="grid items-center gap-8 pt-4 pb-6 lg:grid-cols-[1.1fr_minmax(380px,440px)] lg:gap-14 lg:pt-12 lg:pb-10">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container px-3 py-1.5 text-sm font-medium text-on-secondary-container">
            <Icon name="school" size={18} fill /> Para estudantes do IFRN
          </p>
          <h1 className="mt-4 text-[40px] leading-[46px] font-semibold tracking-tight sm:text-[52px] sm:leading-[58px] lg:text-[68px] lg:leading-[72px]">
            Seu SUAP, <span className="text-primary">rápido</span> e sem enrolação.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-on-surface-variant lg:text-xl lg:leading-8">
            Notas, faltas, horários e prazos do IFRN num app leve, que já abre respondendo o que você quer saber:
            quanto precisa tirar para passar e se dá para faltar hoje.
          </p>
          <ul className="mt-6 flex flex-col gap-2 text-[15px] font-medium sm:flex-row sm:flex-wrap sm:gap-x-6">
            {TRUST.map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check_circle" size={20} fill className="text-primary" />{t}</li>)}
          </ul>
        </div>
        <LoginCard />
      </Wrap>
    </section>
  );
}

function LoginCard() {
  // Quem já entrou neste aparelho volta com a matrícula preenchida
  const [returning] = useState(() => !!session.lastUser);
  const [user, setUser] = useState(() => session.lastUser);
  const [pass, setPass] = useState('');
  const [keep, setKeep] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { canInstall, install, iosHint } = useInstall();
  const [copied, setCopied] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user.trim() || !pass) return setError('Preencha matrícula e senha.');
    setBusy(true);
    setError('');
    try {
      await login(user, pass, keep);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const share = async () => {
    if ((await shareSite()) === 'copied') { setCopied(true); setTimeout(() => setCopied(false), 2500); }
  };

  return (
    <div id="entrar" className="flex scroll-mt-6 flex-col items-center">
      <form onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgb(0_0_0/0.12),0_4px_16px_rgb(0_0_0/0.06)] lg:p-8">
        <h2 className="text-[28px] leading-9 font-semibold tracking-tight">Entrar</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Com a mesma matrícula e senha do suap.ifrn.edu.br</p>

        <div className="mt-6 flex flex-col gap-4">
          {/* Só quem está voltando ganha o foco: para quem chega agora, o teclado esconderia a página */}
          <TextField id="user" label="Matrícula" value={user} onChange={setUser} inputMode="numeric" autoComplete="username" error={!!error && !user} />
          <TextField id="pass" label="Senha" value={pass} onChange={setPass} type={show ? 'text' : 'password'} autoComplete="current-password" autoFocus={returning} error={!!error && !pass}
            trailing={<IconButton icon={show ? 'visibility_off' : 'visibility'} label={show ? 'Esconder senha' : 'Mostrar senha'} onClick={() => setShow(!show)} />} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Manter conectado</p>
            <p className="text-xs text-on-surface-variant">Não pede a senha de novo neste aparelho</p>
          </div>
          <Switch on={keep} onChange={setKeep} label="Manter conectado" />
        </div>

        {error && (
          <m.p role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [8, -5, 3, 0] }} transition={{ duration: 0.35 }}
            className="mt-4 flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
            <Icon name="error" size={20} fill />{error}
          </m.p>
        )}

        <Button type="submit" size="lg" disabled={busy} icon={busy ? undefined : 'login'} className="mt-6 w-full">
          {busy ? <span className="flex items-center gap-2"><Spinner />Entrando…</span> : 'Entrar com o SUAP'}
        </Button>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-on-surface-variant">
          <Icon name="lock" size={16} className="mt-px shrink-0" />
          {keep
            ? 'A senha vai direto para o SUAP. Uma cópia cifrada fica só neste aparelho, para o Supaco renovar seu acesso sozinho; ela some quando você sai da conta.'
            : 'A senha vai direto para o SUAP e não fica salva. O Supaco guarda só o token de acesso neste aparelho, e o SUAP pode pedir a senha de novo de tempos em tempos.'}
        </p>
      </form>

      <div className="mt-5 flex w-full max-w-md flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={share} className="state inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant px-4 text-sm font-medium text-primary">
            <Icon name={copied ? 'check' : 'link'} size={18} />{copied ? 'Link copiado' : SITE_URL.replace('https://', '')}
          </button>
          {canInstall && <Button variant="tonal" icon="install_mobile" onClick={install}>Instalar app</Button>}
        </div>
        {iosHint && (
          <p className="flex max-w-sm items-start gap-2 rounded-lg bg-surface-container px-4 py-3 text-left text-sm text-on-surface-variant">
            <Icon name="ios_share" size={20} className="mt-px shrink-0 text-primary" />
            <span>Para instalar no iPhone, abra no Safari, toque em <b className="font-medium text-on-surface">Compartilhar</b> e depois em <b className="font-medium text-on-surface">Adicionar à Tela de Início</b>.</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- A conta de nota, funcionando ----------

function Demo() {
  return (
    <section className="py-14 lg:py-20">
      <Wrap>
        <SectionTitle eyebrow="Teste agora, sem entrar" title="Quanto eu preciso tirar para passar?">
          Mexa nas notas. É a mesma conta que o Supaco faz com o seu boletim, com os pesos das etapas e a regra da prova final do IFRN.
        </SectionTitle>
        <div className="mt-8 rounded-3xl bg-surface-container-low p-4 sm:p-6 lg:p-8"><GradeCalculator /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="tonal" to="/calculadora" icon="target">Calculadora de notas do IFRN</Button>
          <Button variant="outlined" to="/faltas" icon="event_busy">Calculadora de faltas</Button>
        </div>
      </Wrap>
    </section>
  );
}

// ---------- O que tem dentro ----------

/** Cartão com um pedaço do app desenhado com dados de exemplo. */
function Example({ title, text, color, children }: { title: string; text: string; color: string; children: ReactNode }) {
  return (
    <article className={cx('flex flex-col rounded-3xl p-6 text-[var(--fg)]', color)}>
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 opacity-85">{text}</p>
      <div className="mt-6 flex flex-1 flex-col justify-end">
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--fg)_9%,transparent)] p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase opacity-60">Exemplo</p>
          {children}
        </div>
      </div>
    </article>
  );
}

const Row = ({ left, right, first }: { left: ReactNode; right: ReactNode; first?: boolean }) => (
  <div className={cx('flex items-center justify-between gap-3 py-2 text-sm', !first && 'border-t border-[color-mix(in_srgb,var(--fg)_14%,transparent)]')}>
    <span className="min-w-0 truncate font-medium">{left}</span>
    <span className="shrink-0 tabular opacity-80">{right}</span>
  </div>
);

const MORE: { icon: string; title: string; text: string; shape: ShapeName }[] = [
  { icon: 'calendar_view_week', shape: 'clover', title: 'Horário da semana', text: 'A grade completa com sala e bloco, no computador e no celular.' },
  { icon: 'grade', shape: 'cookie', title: 'Nota antes de fechar a etapa', text: 'Cada avaliação lançada já entra na média, sem esperar o boletim.' },
  { icon: 'auto_awesome', shape: 'sunny', title: 'Retrospectiva do semestre', text: 'Presença, sequências e médias num resumo pronto para compartilhar.' },
  { icon: 'badge', shape: 'soft', title: 'Servidores do IFRN', text: 'Quem é o professor, de qual setor, e os dados públicos da transparência.' },
  { icon: 'palette', shape: 'flower', title: 'Do seu jeito', text: 'Claro ou escuro, temas prontos como Dracula e Nord, ou as suas cores.' },
  { icon: 'install_mobile', shape: 'cookie', title: 'Vira app', text: 'Instala no Android, no iPhone e no computador, e abre sem internet.' },
];

function Inside() {
  return (
    <section className="py-14 lg:py-20">
      <Wrap>
        <SectionTitle eyebrow="O que tem dentro" title="Abriu, a resposta já está na tela.">
          O Supaco lê seus dados no SUAP e faz as contas que você faria de cabeça.
        </SectionTitle>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Example title="Posso faltar hoje?" text="Simula faltar o dia inteiro e mostra quanto sobra em cada matéria."
            color="bg-[var(--c-teal-container)] [--fg:var(--c-teal-on-container)]">
            <div className="mb-2 flex items-center gap-3">
              <Shape shape="flower" size={48} className="text-success"><Icon name="check" size={24} weight={600} className="text-on-success" /></Shape>
              <div>
                <p className="text-lg leading-6 font-semibold">Pode faltar</p>
                <p className="text-sm opacity-80">Quarta-feira · 3 matérias</p>
              </div>
            </div>
            <Row first left="Matemática" right="sobram 6" />
            <Row left="Química" right="sobram 9" />
            <Row left="Física" right="sobram 3" />
          </Example>

          <Example title="Aula de agora" text="A sala, o horário e o que vem depois, sem procurar na grade."
            color="bg-[var(--c-yellow-container)] [--fg:var(--c-yellow-on-container)]">
            <p className="text-sm font-medium opacity-80">Agora · até 10:20</p>
            <p className="mt-1 text-2xl leading-8 font-semibold tracking-tight">Química</p>
            <p className="flex items-center gap-1.5 text-sm opacity-80"><Icon name="location_on" size={18} />Sala 16 · Bloco 10</p>
            <div className="mt-3 mb-2 flex h-1.5 gap-1">
              <span className="w-3/5 rounded-full bg-current" />
              <span className="flex-1 rounded-full bg-current opacity-25" />
            </div>
            <Row left="Depois: Matemática" right="10:30" />
          </Example>

          <Example title="Provas e tarefas" text="As avaliações do SUAP e as tarefas do Google Classroom na mesma agenda."
            color="bg-[var(--c-lilac-container)] [--fg:var(--c-lilac-on-container)]">
            <Row first left="Prova de Física" right="amanhã" />
            <Row left="Lista de exercícios · Classroom" right="sexta" />
            <Row left="Seminário de História" right="dia 21" />
            <Row left="Trabalho de Português" right="dia 28" />
          </Example>
        </div>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MORE.map((f) => (
            <li key={f.title} className="flex gap-4 rounded-2xl bg-surface-container p-5">
              <Shape shape={f.shape} size={44} className="text-secondary-container"><Icon name={f.icon} size={22} fill className="text-on-secondary-container" /></Shape>
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-0.5 text-sm text-on-surface-variant">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  );
}

// ---------- Privacidade ----------

const PRIVACY = [
  { icon: 'key', title: 'Direto para o SUAP', text: 'Matrícula e senha saem do seu navegador direto para suap.ifrn.edu.br. Não existe servidor do Supaco no meio do caminho.' },
  { icon: 'lock', title: 'Guardado só no seu aparelho', text: 'Notas e faltas ficam no seu navegador. A senha só é guardada se você pedir, cifrada, e some quando você sai da conta.' },
  { icon: 'visibility_off', title: 'Sem rastreio', text: 'O Supaco só conta quantas vezes cada tela é aberta, sem cookies e sem saber quem você é.' },
];

function Privacy() {
  return (
    <section className="py-14 lg:py-20">
      <Wrap>
        <div className="rounded-3xl bg-surface-container-low p-6 lg:p-12">
          <SectionTitle eyebrow="Privacidade" title="Sua senha não passa pelo Supaco." />
          <ul className="mt-8 grid gap-8 md:grid-cols-3">
            {PRIVACY.map((p) => (
              <li key={p.title}>
                <Icon name={p.icon} size={32} fill className="text-primary" />
                <h3 className="mt-3 text-xl font-medium">{p.title}</h3>
                <p className="mt-2 text-on-surface-variant">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  );
}

// ---------- Dúvidas e chamada final ----------

function Questions() {
  return (
    <section className="py-14 lg:py-20">
      <Wrap className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-16">
        <SectionTitle eyebrow="Dúvidas" title="Antes de entrar" />
        <FaqList items={PAGES['/'].faq} />
      </Wrap>
    </section>
  );
}

function Closing() {
  // Leva ao formulário do topo e já deixa o campo pronto para digitar
  const toLogin = (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById('entrar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById(session.lastUser ? 'pass' : 'user')?.focus({ preventScroll: true });
  };
  return (
    <section className="pt-6">
      <Wrap>
        <div className="relative overflow-hidden rounded-3xl bg-primary-container px-6 py-12 text-on-primary-container lg:px-14 lg:py-16">
          <Shape shape="flower" size={300} spin className="pointer-events-none absolute -right-20 -bottom-28 text-primary/15" />
          <h2 className="relative max-w-2xl text-[32px] leading-10 font-semibold tracking-tight lg:text-[44px] lg:leading-[52px]">
            Você já tem a conta. É só entrar.
          </h2>
          <p className="relative mt-3 max-w-xl text-lg">A mesma matrícula e senha do SUAP, e suas notas e faltas aparecem em segundos.</p>
          <a href="#entrar" onClick={toLogin}
            className="state relative mt-7 inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-7 text-base font-medium text-on-primary transition-[border-radius] duration-200 active:rounded-xl">
            <Icon name="login" size={22} />Entrar com o SUAP
          </a>
        </div>
      </Wrap>
    </section>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('size-5 animate-spin', className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 60" />
    </svg>
  );
}
