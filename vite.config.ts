import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createServer, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Serve as funções de /api (Vercel) também no `vite dev`. */
const vercelApi = (): Plugin => ({
  name: 'vercel-api',
  configureServer(server) {
    server.middlewares.use('/api/', async (req, res, next) => {
      const name = (req.url ?? '').split('?')[0].replace(/^\/|\/$/g, '');
      if (!/^[a-z-]+$/.test(name)) return next();
      try {
        const mod = await server.ssrLoadModule(`/api/${name}.ts`);
        const handler = mod[req.method ?? 'GET'];
        if (!handler) return next();
        const headers = new Headers();
        Object.entries(req.headers).forEach(([k, v]) => typeof v === 'string' && headers.set(k, v));
        const r: Response = await handler(new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers }));
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        next(e);
      }
    });
  },
});

/** Páginas abertas gravadas pelo `prerender`: rota → arquivo, para o service worker guardar cada uma. */
const pages = new Map<string, string>();

/**
 * Grava a página inicial e as calculadoras já prontas no HTML (com título, descrição e dados estruturados de cada uma)
 * e gera o sitemap. O conteúdo vem de src/prerender.tsx: os mesmos componentes que o app usa.
 */
const prerender = (): Plugin => {
  let root = '';
  let outDir = 'dist';
  return {
    name: 'prerender',
    apply: 'build',
    configResolved(config) { root = config.root; outDir = join(config.root, config.build.outDir); },
    closeBundle: {
      sequential: true,
      order: 'pre',
      async handler() {
        const server = await createServer({
          root, configFile: false, mode: 'production', appType: 'custom', logLevel: 'error', plugins: [react()],
          server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true },
          // Pacote com imports sem extensão, que o Node não resolve sozinho
          ssr: { noExternal: ['@material/material-color-utilities'] },
        });
        try {
          const app: { routes: string[]; render: (path: string) => { head: string; html: string }; sitemap: (day: string) => string } =
            await server.ssrLoadModule('/src/prerender.tsx');
          const shell = readFileSync(join(outDir, 'index.html'), 'utf8');
          for (const path of app.routes) {
            const { head, html } = app.render(path);
            const file = path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
            mkdirSync(dirname(join(outDir, file)), { recursive: true });
            writeFileSync(join(outDir, file), shell
              .replace(/<!--seo-->[\s\S]*<!--\/seo-->/, () => head)
              .replace('<div id="root"></div>', () => `<div id="root" data-prerender="${path}">${html}</div>`));
            pages.set(path, `/${file}`);
          }
          writeFileSync(join(outDir, 'sitemap.xml'), app.sitemap(new Date().toISOString().slice(0, 10)));
        } finally {
          await server.close();
        }
      },
    },
  };
};

/** Preenche o service worker com os arquivos do build (para abrir offline) e uma versão que muda a cada deploy. */
const swPrecache = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(config) { outDir = join(config.root, config.build.outDir); },
    // Depois do `prerender`: as páginas prontas entram no cache e na versão
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const assets = readdirSync(join(outDir, 'assets')).filter((f) => !f.endsWith('.map')).sort().map((f) => `/assets/${f}`);
        const sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
        // A inicial sai do cache como "/"; as outras páginas abertas, pelo caminho do arquivo
        const extra = Object.fromEntries([...pages].filter(([path]) => path !== '/'));
        // O index aponta para os chunks pelo hash, então qualquer mudança no app muda a versão
        const hash = createHash('sha256').update(readFileSync(join(outDir, 'index.html'))).update(sw);
        Object.values(extra).forEach((file) => hash.update(readFileSync(join(outDir, file))));
        writeFileSync(join(outDir, 'sw.js'), sw
          .replace('__SW_VERSION__', hash.digest('hex').slice(0, 10))
          .replace('self.__SW_PRECACHE__', JSON.stringify(['/', ...Object.values(extra), ...assets]))
          .replace('self.__SW_PAGES__', JSON.stringify(extra)));
      },
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApi(), prerender(), swPrecache()],
  server: { port: 5173, host: true },
  build: { target: 'es2022' },
});
