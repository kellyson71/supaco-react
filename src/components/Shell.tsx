import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { usePath } from '../lib/router';
import { refreshAll, useIsRefreshing } from '../lib/store';
import { forceRecheck, recheckPending } from '../lib/attendance';
import { useCurrentSubjects, useMensagens } from '../lib/data';
import { useOnline } from '../lib/hooks';
import { toggleDark, useThemeState } from '../lib/theme';
import { cx, EMPHASIZED, Icon, IconButton, spring } from './ui';
import { Link } from './Link';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { GlobalSearch, openSearch, SearchBar, SearchPanel, useIsWide, useSearchOpen } from './Search';

export { Link };

const NAV = [
  { to: '/', label: 'Hoje', icon: 'today' },
  { to: '/disciplinas', label: 'Matérias', icon: 'school' },
  { to: '/horario', label: 'Horário', icon: 'calendar_view_week' },
  { to: '/agenda', label: 'Agenda', icon: 'event_note' },
  // No celular a barra já está no limite de cinco destinos: lá os servidores ficam dentro de "Você"
  { to: '/servidores', label: 'Servidores', icon: 'badge', railOnly: true },
  { to: '/voce', label: 'Você', icon: 'person' },
];

const isActive = (path: string, to: string) =>
  to === '/' ? path === '/' : path.startsWith(to) || (to === '/voce' && ['/mensagens', '/diagnostico', '/campus', '/retrospectiva'].includes(path));

/** Botão de tema com o ícone girando entre sol e lua. */
export function ThemeButton({ variant = 'standard' }: { variant?: 'standard' | 'tonal' }) {
  const { dark } = useThemeState();
  return (
    <m.span key={dark ? 'd' : 'l'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.35, ease: EMPHASIZED }} className="inline-flex">
      <IconButton icon={dark ? 'dark_mode' : 'light_mode'} fill label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'} onClick={toggleDark} variant={variant} />
    </m.span>
  );
}

export function SyncButton() {
  const refreshing = useIsRefreshing();
  const online = useOnline();
  const { data: subjects } = useCurrentSubjects();
  if (!online) return <span className="flex h-8 items-center gap-1 rounded-lg bg-warning-container px-3 text-sm font-medium text-on-warning-container"><Icon name="cloud_off" size={18} />Offline</span>;
  const sync = () => {
    refreshAll();
    forceRecheck();
    if (subjects) recheckPending(subjects);
  };
  return (
    <span className={cx('inline-flex', refreshing && '[&_.msr]:animate-spin')}>
      <IconButton icon="sync" label="Atualizar dados do SUAP" onClick={sync} />
    </span>
  );
}

function NavItem({ to, label, icon, active, unread, rail }: { to: string; label: string; icon: string; active: boolean; unread: boolean; rail?: boolean }) {
  return (
    <Link to={to} label={label} className={cx('group flex flex-col items-center gap-1 outline-none', rail ? 'w-full py-1' : 'flex-1 pt-3 pb-4')}>
      <span className="state relative flex h-8 w-14 items-center justify-center rounded-full text-on-surface-variant">
        {active && <m.span layoutId={rail ? 'rail-ind' : 'bar-ind'} transition={spring} className="absolute inset-0 rounded-full bg-secondary-container" />}
        <Icon name={icon} fill={active} className={cx('relative', active && 'text-on-secondary-container')} />
        {unread && <span className="absolute top-0.5 right-3 size-2 rounded-full bg-error" />}
      </span>
      <span className={cx('text-xs font-medium tracking-wide', active ? 'text-on-surface' : 'text-on-surface-variant')}>{label}</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePath();
  const { data: msgs } = useMensagens();
  const unreadCount = msgs?.filter((x) => !x.registro_leitura).length ?? 0;
  const unread = unreadCount > 0;
  // No app instalado, as mensagens não lidas aparecem como contador no ícone
  useEffect(() => {
    if (!msgs || !navigator.setAppBadge) return;
    (unreadCount ? navigator.setAppBadge(unreadCount) : navigator.clearAppBadge()).catch(() => { /* sem permissão */ });
  }, [msgs, unreadCount]);
  // No celular a busca toma o lugar da barra superior; em telas maiores ela vive na barra do topo
  const searchOpen = useSearchOpen();
  const isWide = useIsWide();
  const searching = searchOpen && !isWide;
  const pageKey = path.startsWith('/disciplinas/') || path.startsWith('/servidores/') ? 'detail' : path;

  return (
    <div className="min-h-dvh bg-surface">
      {/* Trilho de navegação (telas médias e grandes) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center bg-surface py-5 md:flex">
        <Link to="/" label="Início" className="mb-8 rounded-full"><Logo size={52} /></Link>
        <nav className="flex w-full flex-col gap-3">
          {NAV.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} active={isActive(path, n.to)} unread={n.to === '/voce' && unread} rail />)}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <SyncButton />
          <ThemeButton variant="tonal" />
        </div>
      </aside>

      <div className="md:pl-24">
        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-1 bg-surface/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          {searching ? <SearchPanel variant="mobile" /> : (
            <>
              <Link to="/" label="Início" className="flex items-center gap-2 rounded-full px-2">
                <Logo size={36} />
                <span className="text-[22px] font-semibold tracking-tight">Supaco</span>
              </Link>
              <span className="flex-1" />
              <IconButton icon="search" label="Buscar" onClick={openSearch} />
              <SyncButton />
              <ThemeButton />
              <Avatar size={32} />
            </>
          )}
        </header>

        {/* Busca global (telas médias e grandes) */}
        <div className="sticky top-0 z-20 hidden bg-surface/90 px-8 py-3 backdrop-blur-md md:block">
          <div className="mx-auto flex w-full max-w-[1440px] justify-center"><SearchBar /></div>
        </div>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 md:px-8 md:pt-3 md:pb-12">
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={pageKey}
              initial={{ opacity: 0, scale: 0.985, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.3, ease: EMPHASIZED }}>
              {children}
            </m.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Barra de navegação (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex bg-surface-container pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.filter((n) => !n.railOnly).map((n) => (
          <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} unread={n.to === '/voce' && unread}
            active={isActive(path, n.to) || (n.to === '/voce' && path.startsWith('/servidores'))} />
        ))}
      </nav>

      <GlobalSearch />
    </div>
  );
}
