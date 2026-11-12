import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/app.css';
import './styles/layout.css';
import './styles/refinement.css';
import './styles/xr-glass-dashboard.css';
import './styles/portal-theme-fixes.css';
import './styles/mobile-quality-system.css';
import './styles/portal-mobile-fix.css';
import './styles/portal-complete-redesign.css';
import './styles/admin-module-system.css';
import './styles/theme-performance-fix.css';
import './styles/mobile-spacing-and-instant-sidebar.css';
import './styles/unified-module-theme.css';

try {
  const initialTheme = window.localStorage.getItem('jf-theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = initialTheme;
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.style.colorScheme = initialTheme;
} catch {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // La app sigue funcionando aunque el navegador no permita registrar el service worker.
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
import './styles/portal-polish.css';

import './styles/theme-final-overrides.css';
