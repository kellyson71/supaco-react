// Peças das páginas abertas a quem não entrou: a inicial e as calculadoras.
import type { ReactNode } from 'react';
import { SUAP } from '../lib/api';
import { useLoggedIn } from '../lib/hooks';
import type { Faq } from '../lib/seo';
import { Button, cx, Icon } from './ui';
import { Link } from './Link';
import { Logo } from './Logo';
import { ThemeButton } from './ThemeButton';

const LINKS = [
  { to: '/calculadora', label: 'Calculadora de notas' },
  { to: '/faltas', label: 'Calculadora de faltas' },
];

export const Wrap = ({ children, className }: { children: ReactNode; className?: string }) =>
  <div className={cx('mx-auto w-full max-w-[1200px] px-5 lg:px-8', className)}>{children}</div>;

/** Topo das páginas abertas. `current` é a rota da página, para não ligar para ela mesma. */
export function PublicHeader({ current }: { current: string }) {
  const loggedIn = useLoggedIn();
  return (
    <Wrap>
      <header className="flex h-[72px] items-center gap-1">
        <Link to="/" label="Supaco: página inicial" className="flex items-center gap-3 rounded-full pr-2">
          <Logo size={44} />
          <span className="text-[26px] font-semibold tracking-tight">Supaco</span>
        </Link>
        <span className="flex-1" />
        <nav aria-label="Calculadoras" className="mr-1 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={cx('state rounded-full px-4 py-2 text-sm font-medium', current === l.to ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant')}>{l.label}</Link>
          ))}
        </nav>
        <ThemeButton />
        {current !== '/' && <Button to="/" size="sm" icon={loggedIn ? 'arrow_forward' : 'login'} className="ml-1">{loggedIn ? 'Abrir o Supaco' : 'Entrar'}</Button>}
      </header>
    </Wrap>
  );
}

export function SectionTitle({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('max-w-2xl', className)}>
      <h2 className="text-[32px] leading-10 font-semibold tracking-tight lg:text-[40px] lg:leading-[48px]">{title}</h2>
      {children && <p className="mt-3 text-lg text-on-surface-variant">{children}</p>}
    </div>
  );
}

/** Link para o SUAP do IFRN, onde a pessoa confere os dados oficiais. Abre em outra aba. */
export function SuapLink({ children = 'Abrir o SUAP', className }: { children?: ReactNode; className?: string }) {
  return (
    <a href={`${SUAP}/`} target="_blank" rel="noopener noreferrer" className={cx('inline-flex items-center gap-1 rounded-md font-medium text-primary underline-offset-4 hover:underline', className)}>
      {children}<Icon name="open_in_new" size={16} />
    </a>
  );
}

/** Perguntas e respostas. Usa <details>, então o texto está na página mesmo fechado (para a busca e para quem navega sem JS). */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((f) => (
        <details key={f.q} className="group rounded-2xl bg-surface-container px-5 py-4 open:bg-surface-container-high">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg text-[17px] font-medium [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{f.q}</span>
            <Icon name="expand_more" className="shrink-0 text-on-surface-variant transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-3 max-w-3xl text-on-surface-variant">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-outline-variant/60 py-10 lg:mt-32">
      <Wrap className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2"><Logo size={28} /><span className="text-lg font-semibold tracking-tight">Supaco</span></div>
          <p className="mt-4 flex items-start gap-2 text-[15px] leading-6 font-medium">
            <Icon name="lock" size={20} fill className="mt-0.5 shrink-0 text-primary" />
            <span>É seguro: todas as informações vêm direto do SUAP e ficam só no seu aparelho. Nós não armazenamos nada.</span>
          </p>
          <p className="mt-3 text-sm text-on-surface-variant">
            Projeto independente feito por estudante, sem vínculo oficial com o IFRN.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm font-medium">
          <Link to="/" className="rounded-md text-on-surface-variant hover:text-primary">Entrar no Supaco</Link>
          {LINKS.map((l) => <Link key={l.to} to={l.to} className="rounded-md text-on-surface-variant hover:text-primary">{l.label} do IFRN</Link>)}
          <SuapLink className="!font-medium !text-on-surface-variant hover:!text-primary">SUAP do IFRN</SuapLink>
        </nav>
      </Wrap>
    </footer>
  );
}
