import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};

export const usePath = () => useSyncExternalStore(subscribe, () => window.location.pathname);

export function navigate(to: string, replace = false) {
  if (to === window.location.pathname) return;
  const depth = (history.state?.depth ?? 0) + (replace ? 0 : 1);
  history[replace ? 'replaceState' : 'pushState']({ depth }, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

/** Volta se houver histórico interno, senão vai para `fallback`. */
export function back(fallback: string) {
  if (history.state?.depth > 0) history.back();
  else navigate(fallback, true);
}
