import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig } from 'motion/react';
import App, { preloadPublic } from './App';
import { session } from './lib/api';
import { applyTheme, useThemeState } from './lib/theme';
import { registerServiceWorker } from './lib/pwa';
import { startMetrics } from './lib/metrics';
import './index.css';

// Limpa chaves do app antigo (tokens, caches criptografados, configurações de wallpaper etc.)
try {
  if (!localStorage.getItem('supaco:v3')) {
    // Mantém o login de quem já usava a versão anterior
    const refresh = localStorage.getItem('suap_refresh_token');
    const user = localStorage.getItem('suap_username');
    if (refresh && user) {
      localStorage.setItem('supaco:refresh', refresh);
      localStorage.setItem('supaco:user', user);
    }
    Object.keys(localStorage).filter((k) => !k.startsWith('supaco:')).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('supaco:v3', '1');
  }
} catch { /* storage indisponível */ }

registerServiceWorker();
startMetrics();

// Deploy novo troca os nomes dos chunks: se a aba antiga não achar um, recarrega uma vez para pegar a versão atual
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    if (sessionStorage.getItem('supaco:reloaded')) return;
    sessionStorage.setItem('supaco:reloaded', '1');
  } catch { /* sem sessionStorage: recarrega mesmo assim */ }
  window.location.reload();
});

// Passou do carregamento sem erro: libera um novo recarregamento no próximo deploy
window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('supaco:reloaded'); } catch { /* ok */ } }, 10_000));

applyTheme();

/** Animações do motion seguem o sistema, ou ficam reduzidas se a pessoa pedir no app. */
function Motion({ children }: { children: ReactNode }) {
  const { prefs } = useThemeState();
  return <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>;
}

// Ferramentas para o assistente do navegador (WebMCP): só baixa o código onde a API existe
if ('modelContext' in document || 'modelContext' in navigator) void import('./lib/webmcp').then((m) => m.startWebMCP());

const root = document.getElementById('root')!;
const mount = () => {
  root.removeAttribute('data-prerender');
  createRoot(root).render(
    <StrictMode>
      <LazyMotion features={() => import('./motion-features').then((r) => r.default)} strict>
        <Motion><App /></Motion>
      </LazyMotion>
    </StrictMode>,
  );
};

// O build grava a página inicial e as calculadoras já prontas no HTML (`data-prerender` diz qual)
const prerendered = root.dataset.prerender;
if (!prerendered) mount();
// Logado, a rota "/" é o app: a página inicial que veio no HTML (escondida pelo CSS do index.html) sai de cena
else if (prerendered === '/' && session.isLoggedIn) { root.replaceChildren(); mount(); }
// Senão espera o código da página para o React assumir o lugar sem a tela piscar
else preloadPublic(window.location.pathname).then(mount, mount);
