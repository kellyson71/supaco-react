import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { login } from '../lib/api';

export function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand p-12 text-white md:flex md:flex-col">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/30" />
          <span className="font-display text-2xl font-semibold">supaco</span>
        </div>
        <div className="mt-auto max-w-md">
          <TallyArt />
          <h1 className="mt-10 font-display text-5xl leading-[1.02] font-semibold tracking-tight">
            Quantas faltas ainda dá pra ter?
          </h1>
          <p className="mt-4 text-lg text-white/75">
            Notas, faltas e horário do SUAP numa tela só. Abre na hora, mesmo sem internet.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 md:hidden">
            <img src="/icon.svg" alt="" className="size-8" />
            <span className="font-display text-2xl font-semibold">supaco</span>
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Entrar com o SUAP</h2>
          <p className="mt-2 text-sm text-muted">Use a mesma matrícula e senha do suap.ifrn.edu.br.</p>

          <label className="mt-8 block text-sm font-medium" htmlFor="user">Matrícula</label>
          <input
            id="user"
            inputMode="numeric"
            autoComplete="username"
            autoFocus
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-[15px] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder="20231014040001"
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="pass">Senha</label>
          <div className="relative mt-1.5">
            <input
              id="pass"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 pr-12 text-[15px] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink"
              aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{error}</p>}

          <button
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-brand-ink transition hover:brightness-110 disabled:opacity-70"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {busy ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Lock size={13} className="mt-0.5 shrink-0" />
            A senha vai direto para o SUAP e não fica salva. O Supaco guarda só o token de acesso neste aparelho.
          </p>
        </form>
      </section>
    </div>
  );
}

/** Marcas de chamada: 4 traços e o corte, como no diário. */
function TallyArt() {
  return (
    <svg viewBox="0 0 280 90" className="w-72" aria-hidden>
      <g stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none">
        {[0, 1].map((g) => (
          <g key={g} transform={`translate(${g * 130} 0)`} opacity={g ? 0.45 : 1}>
            {[0, 1, 2, 3].map((i) => <path key={i} d={`M${14 + i * 24} 12v66`} />)}
            <path d="M4 66 96 22" />
          </g>
        ))}
        <path d="M268 12v66" opacity="0.2" />
      </g>
    </svg>
  );
}
