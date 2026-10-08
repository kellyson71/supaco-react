import { useEffect, useState, useSyncExternalStore } from 'react';
import { onSessionChange, session } from './api';
import { SITE_URL } from './seo';

export { SITE_URL };

/** Tem alguém logado neste aparelho. No HTML gerado no build, ninguém está. */
export const useLoggedIn = () => useSyncExternalStore(onSessionChange, () => session.isLoggedIn, () => false);

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

// ---------- Instalar como app (PWA) ----------

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const installSubs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; installSubs.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; installSubs.forEach((f) => f()); });
}

/** Já está aberto como app instalado (sem a barra do navegador). */
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// O iPadOS se apresenta como Mac; o toque é o que denuncia
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstall() {
  const canInstall = useSyncExternalStore((cb) => { installSubs.add(cb); return () => { installSubs.delete(cb); }; }, () => !!deferred, () => false);
  // O iOS não tem prompt de instalação: a pessoa precisa usar o menu Compartilhar do Safari
  const iosHint = typeof window !== 'undefined' && !canInstall && isIOS() && !isStandalone();
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    installSubs.forEach((f) => f());
  };
  return { canInstall, install, iosHint };
}

export async function shareSite() {
  const data = { title: 'Supaco', text: 'Notas, faltas e horários do SUAP/IFRN num só lugar', url: SITE_URL };
  if (navigator.share) { try { await navigator.share(data); return 'shared'; } catch { return 'cancel'; } }
  await navigator.clipboard?.writeText(SITE_URL);
  return 'copied';
}
