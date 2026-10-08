// Usado só no build (plugin `prerender` do vite.config.ts): monta o HTML das páginas abertas, para buscadores,
// prévias de link e assistentes lerem o conteúdo sem rodar JavaScript, e para a página aparecer antes de o app carregar.
import './prerender-env';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { headTags, PAGES, SITE_URL } from './lib/seo';
import { Login } from './pages/Login';
import { AbsenceTool, GradeTool } from './pages/Tools';

const VIEWS: Record<string, ComponentType> = { '/': Login, '/calculadora': GradeTool, '/faltas': AbsenceTool };

export const routes = Object.keys(VIEWS);

/** O `<head>` e o corpo de uma página aberta. */
export function render(path: string) {
  const View = VIEWS[path];
  return { head: headTags(PAGES[path]), html: renderToStaticMarkup(<View />) };
}

/** `day` em "aaaa-mm-dd": o dia do build. */
export const sitemap = (day: string) => [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((path) => `  <url><loc>${SITE_URL}${path === '/' ? '/' : path}</loc><lastmod>${day}</lastmod></url>`),
  '</urlset>',
  '',
].join('\n');
