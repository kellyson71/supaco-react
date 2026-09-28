import type { ReactNode } from 'react';
import { navigate } from '../lib/router';

export function Link({ to, className, children, label }: { to: string; className?: string; children: ReactNode; label?: string }) {
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
