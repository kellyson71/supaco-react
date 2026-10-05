// Service worker: registro, aviso de versão nova e pedido de armazenamento persistente.
import { useSyncExternalStore } from 'react';

const HOUR = 3_600_000;

let waiting: ServiceWorker | null = null;
const subs = new Set<() => void>();
const setWaiting = (sw: ServiceWorker | null) => { waiting = sw; subs.forEach((fn) => fn()); };

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const sw = navigator.serviceWorker;

  // Na primeira instalação o worker assume a página sem trocar nada; só recarrega quando uma versão substitui outra
  const hadController = !!sw.controller;
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await sw.register('/sw.js');
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const check = () => { if (worker.state === 'installed' && sw.controller) setWaiting(worker); };
        check();
        worker.addEventListener('statechange', check);
      };
      track(reg.waiting);
      reg.addEventListener('updatefound', () => track(reg.installing));

      // App instalado fica aberto por dias: procura versão nova quando a pessoa volta para ele
      let checkedAt = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - checkedAt < HOUR) return;
        checkedAt = Date.now();
        reg.update().catch(() => { /* offline */ });
      });
    } catch { /* sem service worker o app segue funcionando online */ }
  });
}

/** Há uma versão nova baixada, esperando para assumir. */
export const useUpdateReady = () =>
  useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => !!waiting);

/** Ativa a versão nova; a página recarrega sozinha quando ela assume. */
export const applyUpdate = () => waiting?.postMessage('SKIP_WAITING');

/** Pede ao navegador para não apagar os dados do app (login e cache) quando faltar espaço. */
export async function persistStorage() {
  try {
    if (!navigator.storage?.persist || await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch { /* navegador sem suporte */ }
}
