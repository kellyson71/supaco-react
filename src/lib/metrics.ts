// Métricas de uso: conta acessos por tela com o Vercel Web Analytics (sem cookies, sem identificar ninguém).
import { inject } from '@vercel/analytics';

export function startMetrics() {
  if (!import.meta.env.PROD) return;
  inject({
    mode: 'production',
    // A contagem é por tela: a matrícula do servidor e o código da disciplina não saem do aparelho
    beforeSend: (event) => {
      const url = new URL(event.url);
      url.pathname = url.pathname.replace(/^\/(servidores|disciplinas)\/.+/, '/$1/[id]');
      return { ...event, url: url.toString() };
    },
  });
}
