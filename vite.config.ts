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

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApi()],
  server: { port: 5173, host: true },
  build: { target: 'es2022' },
});
