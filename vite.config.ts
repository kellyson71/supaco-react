import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
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

/** Preenche o service worker com os arquivos do build (para abrir offline) e uma versão que muda a cada deploy. */
const swPrecache = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(config) { outDir = join(config.root, config.build.outDir); },
    closeBundle() {
      const assets = readdirSync(join(outDir, 'assets')).filter((f) => !f.endsWith('.map')).sort().map((f) => `/assets/${f}`);
      const sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
      // O index aponta para os chunks pelo hash, então qualquer mudança no app muda a versão
      const version = createHash('sha256').update(readFileSync(join(outDir, 'index.html'))).update(sw).digest('hex').slice(0, 10);
      writeFileSync(join(outDir, 'sw.js'), sw
        .replace('__SW_VERSION__', version)
        .replace('self.__SW_PRECACHE__', JSON.stringify(['/', ...assets])));
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApi(), swPrecache()],
  server: { port: 5173, host: true },
  build: { target: 'es2022' },
});
