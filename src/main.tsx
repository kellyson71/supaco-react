import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig } from 'motion/react';
import App from './App';
import { applyTheme, useThemeState } from './lib/theme';
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={() => import('./motion-features').then((r) => r.default)} strict>
      <Motion><App /></Motion>
    </LazyMotion>
  </StrictMode>,
);
