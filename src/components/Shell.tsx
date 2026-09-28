import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, House, ListChecks, RefreshCw, UserRound, WifiOff } from 'lucide-react';
import { navigate, usePath } from '../lib/router';
import { refreshAll, useIsRefreshing } from '../lib/store';
import { useEu, useMensagens } from '../lib/data';
import { photoUrl } from '../lib/suap';
import { useOnline } from '../lib/hooks';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Hoje', icon: House },
  { to: '/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { to: '/horario', label: 'Horário', icon: CalendarDays },
  { to: '/agenda', label: 'Agenda', icon: ListChecks },
  { to: '/voce', label: 'Você', icon: UserRound },
];

const isActive = (path: string, to: string) => (to === '/' ? path === '/' : path.startsWith(to) || (to === '/voce' && path === '/mensagens'));

function Link({ to, className, children, label }: { to: string; className?: string; children: ReactNode; label?: string }) {
  return (
    <a
      href={to}
      aria-label={label}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      className={className}
    >
      {children}
    </a>
  );
}

export { Link };

function SyncButton() {
  const refreshing = useIsRefreshing();
  const online = useOnline();
  if (!online) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-xs font-semibold text-warn">
        <WifiOff size={13} /> Offline
      </span>
    );
  }
  return (
    <button
      onClick={() => refreshAll()}
      disabled={refreshing}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-100"
      aria-label="Atualizar dados do SUAP"
    >
      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
      {refreshing ? 'Atualizando' : 'Atualizar'}
    </button>
  );
}

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const path = usePath();
  const { data: eu } = useEu();
  const { data: msgs } = useMensagens();
  const unread = msgs?.filter((m) => !m.registro_leitura).length ?? 0;

  return (
    <div className="min-h-dvh md:flex">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <img src="/icon.svg" alt="" className="size-7" />
          <span className="font-display text-xl font-semibold tracking-tight">supaco</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                isActive(path, to) ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="flex-1">{label}</span>
              {to === '/voce' && unread > 0 && <span className="rounded-full bg-bad px-1.5 text-[11px] font-bold text-white">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2">
          {eu?.foto && <img src={photoUrl(eu.foto)} alt="" className="size-9 rounded-full object-cover" />}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{eu?.nome_usual}</p>
            <p className="truncate font-mono text-xs text-muted">{eu?.identificacao}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex justify-end bg-bg/85 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-1 backdrop-blur md:px-8">
          <SyncButton />
        </div>
        <main className={cx('mx-auto px-4 pb-28 md:px-8 md:pb-16', wide ? 'max-w-5xl' : 'max-w-3xl')}>{children}</main>
      </div>

      {/* Abas inferiores (mobile) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(path, to);
            return (
              <Link key={to} to={to} className={cx('relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium', active ? 'text-brand' : 'text-muted')}>
                <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-brand-soft')}>
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
                {to === '/voce' && unread > 0 && <span className="absolute top-2 left-1/2 ml-3 size-2 rounded-full bg-bad" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
