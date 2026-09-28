import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
