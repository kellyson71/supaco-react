// Service worker: guarda o app inteiro no aparelho para abrir na hora e sem internet.
// Os dados do SUAP não passam por aqui; eles vêm do cache local do próprio app.

// Preenchidos no build (plugin sw-precache do vite.config.ts) com os arquivos e a versão daquele deploy
const VERSION = '__SW_VERSION__';
const PRECACHE = self.__SW_PRECACHE__ || ['/'];

const SHELL = `supaco-shell-${VERSION}`;
const RUNTIME = 'supaco-runtime';
const FONTS = 'supaco-fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  // Tudo ou nada: se um arquivo falhar, a versão anterior continua valendo e o navegador tenta de novo depois
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL, RUNTIME, FONTS];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// A versão nova só assume quando a pessoa aceita atualizar (ou quando o app é fechado e aberto de novo)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isAsset = (res) => res.ok && !(res.headers.get('content-type') || '').includes('text/html');

async function put(cacheName, request, res) {
  const cache = await caches.open(cacheName);
  await cache.put(request, res);
}

/** Responde do cache e atualiza por trás, para a próxima abertura. */
async function staleWhileRevalidate(event, cacheName, request, load = () => fetch(request)) {
  const hit = await caches.match(request, { cacheName });
  const fresh = load().then((res) => {
    if (isAsset(res)) event.waitUntil(put(cacheName, request, res.clone()));
    return res;
  });
  if (!hit) return fresh;
  event.waitUntil(fresh.catch(() => {}));
  return hit;
}

async function cacheFirst(event, cacheName, request, load = () => fetch(request)) {
  const hit = await caches.match(request, { cacheName });
  if (hit) return hit;
  const res = await load();
  if (isAsset(res)) event.waitUntil(put(cacheName, request, res.clone()));
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Fontes do Google (texto e ícones). Pedidas com CORS para a resposta não ser opaca,
  // que ocuparia vários MB da cota de armazenamento cada uma.
  if (FONT_HOSTS.includes(url.hostname)) {
    const load = () => fetch(request.url, { mode: 'cors', credentials: 'omit' });
    event.respondWith(url.hostname === 'fonts.gstatic.com'
      ? cacheFirst(event, FONTS, request.url, load)
      : staleWhileRevalidate(event, FONTS, request.url, load));
    return;
  }

  // A API e o script de métricas do Vercel vão direto para a rede
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

  // Navegação: o app é uma página só, então toda rota abre o index já guardado (instantâneo, com ou sem rede)
  if (request.mode === 'navigate' && !/\.[a-z0-9]+$/i.test(url.pathname)) {
    event.respondWith(
      caches.match('/', { cacheName: SHELL }).then((hit) => hit || fetch(request)),
    );
    return;
  }

  // Arquivos do build têm hash no nome e nunca mudam
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event, SHELL, request));
    return;
  }

  // O resto (ícones, memes) mantém o mesmo nome entre deploys
  event.respondWith(staleWhileRevalidate(event, RUNTIME, request));
});
