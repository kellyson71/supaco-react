// Página inicial de quem não entrou: apresenta o Supaco, deixa testar a conta de nota e tem o login no topo.
import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { m } from 'motion/react';
import { login, session } from '../lib/api';
import { shareSite, SITE_URL, useInstall } from '../lib/hooks';
import { PAGES } from '../lib/seo';
import { Button, cx, Icon, IconButton, Shape, Switch, TextField } from '../components/ui';
import { GradeCalculator } from '../components/Calculators';
import { FaqList, PublicFooter, PublicHeader, SectionTitle, SuapLink, Wrap } from '../components/Public';

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

function Hero() {
  return (
    <section>
      <Wrap className="grid items-center gap-10 pt-6 pb-4 lg:grid-cols-[1.1fr_minmax(380px,440px)] lg:gap-16 lg:pt-16 lg:pb-8">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container px-3 py-1.5 text-sm font-medium text-on-secondary-container">
            <Icon name="school" size={18} fill /> Para estudantes do IFRN
          </p>
          <h1 className="mt-4 text-[40px] leading-[46px] font-semibold tracking-tight sm:text-[52px] sm:leading-[58px] lg:text-[68px] lg:leading-[72px]">
            Seu SUAP, <span className="text-primary">rápido</span> e sem enrolação.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-on-surface-variant lg:text-xl lg:leading-8">
            Notas, faltas e horários do IFRN num app que abre na hora e já diz quanto falta para passar.
          </p>
          <p className="mt-6 text-[15px] font-medium text-on-surface-variant">Grátis · sem cadastro · abre sem internet</p>
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
        <p className="mt-1 text-sm text-on-surface-variant">Com a matrícula e a senha do <SuapLink>SUAP</SuapLink></p>

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
            ? 'A senha vai direto para o SUAP. Uma cópia cifrada fica só neste aparelho e some quando você sai da conta.'
            : 'A senha vai direto para o SUAP e não fica salva. O SUAP pode pedir a senha de novo de tempos em tempos.'}
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

// Entre uma seção e outra sobra espaço: cada uma diz uma coisa só
const SECTION = 'py-16 lg:py-28';

// ---------- A conta de nota, funcionando ----------

function Demo() {
  return (
    <section className={SECTION}>
      <Wrap>
        <SectionTitle title="Quanto eu preciso tirar para passar?">Teste sem entrar. É a conta que o Supaco faz com o seu boletim.</SectionTitle>
        <div className="mt-10 rounded-3xl bg-surface-container-low p-4 sm:p-6 lg:p-8"><GradeCalculator /></div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="tonal" to="/calculadora" icon="target">Calculadora de notas</Button>
          <Button variant="outlined" to="/faltas" icon="event_busy">Calculadora de faltas</Button>
        </div>
      </Wrap>
    </section>
  );
}

// ---------- O que tem dentro ----------

/** Cartão com um pedaço do app desenhado com dados de exemplo. */
function Example({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <article className={cx('flex flex-col gap-6 rounded-3xl p-6 text-[var(--fg)] lg:p-7', color)}>
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <div className="flex flex-1 flex-col justify-end">
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--fg)_9%,transparent)] p-4">{children}</div>
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

function Inside() {
  return (
    <section className={SECTION}>
      <Wrap>
        <SectionTitle title="Abriu, a resposta já está na tela." />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Example title="Posso faltar hoje?" color="bg-[var(--c-teal-container)] [--fg:var(--c-teal-on-container)]">
            <div className="mb-2 flex items-center gap-3">
              <Shape shape="flower" size={48} className="text-success"><Icon name="check" size={24} weight={600} className="text-on-success" /></Shape>
              <p className="text-lg leading-6 font-semibold">Pode faltar</p>
            </div>
            <Row first left="Matemática" right="sobram 6" />
            <Row left="Química" right="sobram 9" />
            <Row left="Física" right="sobram 3" />
          </Example>

          <Example title="Aula de agora" color="bg-[var(--c-yellow-container)] [--fg:var(--c-yellow-on-container)]">
            <p className="text-sm font-medium opacity-80">Agora · até 10:20</p>
            <p className="mt-1 text-2xl leading-8 font-semibold tracking-tight">Química</p>
            <p className="flex items-center gap-1.5 text-sm opacity-80"><Icon name="location_on" size={18} />Sala 16 · Bloco 10</p>
            <div className="mt-3 mb-2 flex h-1.5 gap-1">
              <span className="w-3/5 rounded-full bg-current" />
              <span className="flex-1 rounded-full bg-current opacity-25" />
            </div>
            <Row left="Depois: Matemática" right="10:30" />
          </Example>

          <Example title="Provas e tarefas" color="bg-[var(--c-lilac-container)] [--fg:var(--c-lilac-on-container)]">
            <Row first left="Prova de Física" right="amanhã" />
            <Row left="Lista · Classroom" right="sexta" />
            <Row left="Seminário de História" right="dia 21" />
          </Example>
        </div>

        <p className="mt-8 max-w-2xl text-lg text-on-surface-variant">
          E mais: horário da semana, notas antes de a etapa fechar, retrospectiva do semestre, servidores do IFRN e temas.
        </p>
      </Wrap>
    </section>
  );
}

// ---------- Privacidade ----------

function Privacy() {
  return (
    <section className={SECTION}>
      <Wrap>
        <div className="rounded-3xl bg-surface-container-low px-6 py-12 lg:px-14 lg:py-20">
          <SectionTitle title="Sua senha não passa pelo Supaco.">
            Matrícula e senha vão do seu navegador direto para o SUAP. Suas notas ficam só no seu aparelho, e o Supaco não usa cookies nem sabe quem você é.
          </SectionTitle>
        </div>
      </Wrap>
    </section>
  );
}

// ---------- Dúvidas e chamada final ----------

function Questions() {
  return (
    <section className={SECTION}>
      <Wrap className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-16">
        <SectionTitle title="Antes de entrar" />
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
    <section className="pt-4">
      <Wrap>
        <div className="relative overflow-hidden rounded-3xl bg-primary-container px-6 py-14 text-on-primary-container lg:px-14 lg:py-20">
          <Shape shape="flower" size={300} spin className="pointer-events-none absolute -right-20 -bottom-28 text-primary/15" />
          <h2 className="relative max-w-2xl text-[32px] leading-10 font-semibold tracking-tight lg:text-[44px] lg:leading-[52px]">
            Você já tem a conta. É só entrar.
          </h2>
          <a href="#entrar" onClick={toLogin}
            className="state relative mt-8 inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-7 text-base font-medium text-on-primary transition-[border-radius] duration-200 active:rounded-xl">
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
