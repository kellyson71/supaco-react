import { useEffect, useState, useSyncExternalStore } from 'react';

const onlineSub = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};
export const useOnline = () => useSyncExternalStore(onlineSub, () => navigator.onLine);

/** Data atual que se atualiza a cada `ms` (padrão 30s) para "agora/próxima aula". */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const THEME_KEY = 'supaco:theme';
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    setDark(next);
  };
  return { dark, toggle };
}
