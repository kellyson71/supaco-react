import { useState, type FormEvent } from 'react';
import { m } from 'motion/react';
import { login } from '../lib/api';
import { shareSite, SITE_URL, useInstall } from '../lib/hooks';
import { Button, cx, EMPHASIZED, Icon, IconButton, Shape, TextField, type ShapeName } from '../components/ui';
import { Logo } from '../components/Logo';
import { ThemeButton } from '../components/Shell';

const FEATURES: { icon: string; title: string; text: string; shape: ShapeName; color: string }[] = [
  { icon: 'help', title: 'Posso faltar hoje?', text: 'Resposta na hora, matéria por matéria.', shape: 'flower', color: 'text-[var(--c-teal-container)] [--fg:var(--c-teal-on-container)]' },
  { icon: 'target', title: 'Quanto preciso tirar', text: 'Nota mínima para passar e simulador.', shape: 'cookie', color: 'text-[var(--c-pink-container)] [--fg:var(--c-pink-on-container)]' },
  { icon: 'schedule', title: 'Aula de agora', text: 'Sala, horário e o que vem depois.', shape: 'clover', color: 'text-[var(--c-yellow-container)] [--fg:var(--c-yellow-on-container)]' },
  { icon: 'event_note', title: 'Provas e tarefas', text: 'SUAP e Google Classroom juntos.', shape: 'sunny', color: 'text-[var(--c-lilac-container)] [--fg:var(--c-lilac-on-container)]' },
];

export function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { canInstall, install } = useInstall();
  const [copied, setCopied] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user.trim() || !pass) return setError('Preencha matrícula e senha.');
    setBusy(true);
    setError('');
    try {
      await login(user, pass);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const share = async () => {
    if ((await shareSite()) === 'copied') { setCopied(true); setTimeout(() => setCopied(false), 2500); }
  };

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-4 lg:p-4">
      {/* Apresentação */}
      <section className="relative overflow-hidden px-5 pt-4 pb-8 lg:flex lg:flex-col lg:rounded-3xl lg:bg-surface-container-low lg:p-12">
        <Shape shape="sunny" size={520} spin className="pointer-events-none absolute -top-40 -right-40 hidden text-primary-container/60 lg:inline-flex" />
        <Shape shape="flower" size={260} spin className="pointer-events-none absolute -bottom-24 -left-20 hidden text-tertiary-container/60 lg:inline-flex" />

        <div className="relative flex items-center gap-3">
          <Logo size={48} />
          <span className="text-[28px] font-semibold tracking-tight">Supaco</span>
          <span className="flex-1" />
          <ThemeButton />
        </div>

        <m.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EMPHASIZED }} className="relative mt-8 max-w-xl lg:mt-auto">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container px-3 py-1.5 text-sm font-medium text-on-secondary-container">
            <Icon name="school" size={18} fill /> Para estudantes do IFRN
          </span>
          <h1 className="mt-4 text-[40px] leading-[48px] font-semibold tracking-tight lg:text-[57px] lg:leading-[64px]">
            Seu SUAP, <span className="text-primary">rápido</span> e sem enrolação.
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant">
            O Supaco reúne notas, faltas, horários e prazos num app leve que abre na hora, até sem internet.
            Entre com a mesma matrícula e senha do SUAP.
          </p>
        </m.div>

        <div className="relative mt-8 hidden grid-cols-2 gap-3 lg:grid">
          {FEATURES.map((f, i) => <Feature key={f.title} f={f} i={i} />)}
        </div>
      </section>

      {/* Formulário */}
      <section className="flex flex-col items-center justify-center px-5 pb-10 lg:px-10">
        <m.form onSubmit={submit} initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EMPHASIZED, delay: 0.1 }}
          className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgb(0_0_0/0.12),0_4px_16px_rgb(0_0_0/0.06)] lg:p-8">
          <h2 className="text-[28px] leading-9 font-semibold tracking-tight">Entrar</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Use sua conta do suap.ifrn.edu.br</p>

          <div className="mt-6 flex flex-col gap-4">
            <TextField id="user" label="Matrícula" value={user} onChange={setUser} inputMode="numeric" autoComplete="username" autoFocus error={!!error && !user} />
            <TextField id="pass" label="Senha" value={pass} onChange={setPass} type={show ? 'text' : 'password'} autoComplete="current-password" error={!!error && !pass}
              trailing={<IconButton icon={show ? 'visibility_off' : 'visibility'} label={show ? 'Esconder senha' : 'Mostrar senha'} onClick={() => setShow(!show)} />} />
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
            A senha vai direto para o SUAP e não fica salva. O Supaco guarda só o token de acesso neste aparelho.
          </p>
        </m.form>

        <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3 lg:hidden">
          {FEATURES.map((f, i) => <Feature key={f.title} f={f} i={i} />)}
        </div>

        <div className="mt-8 flex w-full max-w-md flex-col items-center gap-3 text-center">
          <p className="text-sm text-on-surface-variant">Acesse de qualquer lugar em</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={share} className="state inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant px-4 text-sm font-medium text-primary">
              <Icon name={copied ? 'check' : 'link'} size={18} />{copied ? 'Link copiado' : SITE_URL.replace('https://', '')}
            </button>
            {canInstall && <Button variant="tonal" icon="install_mobile" onClick={install}>Instalar app</Button>}
          </div>
          <p className="mt-2 max-w-sm text-xs text-on-surface-variant">
            Projeto independente feito por estudante, sem vínculo oficial com o IFRN. Usa a API pública do SUAP.
          </p>
        </div>
      </section>
    </div>
  );
}

function Feature({ f, i }: { f: (typeof FEATURES)[number]; i: number }) {
  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EMPHASIZED, delay: 0.25 + i * 0.07 }}
      className="flex flex-col gap-3 rounded-2xl bg-surface-container p-4">
      <Shape shape={f.shape} size={44} className={f.color}><Icon name={f.icon} size={22} fill className="text-[var(--fg)]" /></Shape>
      <div>
        <p className="font-medium">{f.title}</p>
        <p className="text-sm text-on-surface-variant">{f.text}</p>
      </div>
    </m.div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('size-5 animate-spin', className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 60" />
    </svg>
  );
}
