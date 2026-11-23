import React from 'react';
// Tailwind CSS v4 utilities and shared design tokens.
import './styles/tailwind.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import RouteErrorBoundary from './app/components/RouteErrorBoundary';

// Base tokens and application shell.
import './styles/tokens.css';
import './styles/app.css';
import './styles/layout.css';

// Functional responsive layers and screen-specific layout support.
import './styles/mobile-quality-system.css';
import './styles/mobile-spacing-and-instant-sidebar.css';
import './styles/admin-module-system.css';
import './styles/admin-module-quality.css';
import './styles/portal-complete-redesign.css';
import './styles/portal-mobile-fix.css';
import './styles/navigation-performance-polish.css';
import './styles/app-quality-accessibility.css';
import './styles/mobile-runtime-stability.css';
import './styles/reference-dashboard-system.css';
import './styles/mobile-bottom-navigation.css';

// Single final visual layer. Legacy competing color systems are no longer loaded.
import './styles/jdf-visual-foundation.css';

try {
  const initialTheme = window.localStorage.getItem('jf-theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = initialTheme;
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.style.colorScheme = initialTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    initialTheme === 'dark' ? '#101010' : '#f7f4ef',
  );
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
    <RouteErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RouteErrorBoundary>
  </React.StrictMode>,
);
