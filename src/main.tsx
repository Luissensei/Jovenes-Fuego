import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';

// Global foundation and structural layout.
import './styles/app.css';
import './styles/layout.css';
// Responsive behavior and isolated portal/admin enhancements.
import './styles/mobile-quality-system.css';
import './styles/mobile-spacing-and-instant-sidebar.css';
import './styles/admin-module-system.css';
import './styles/portal-complete-redesign.css';
import './styles/portal-mobile-fix.css';
// Single final visual contract: keep this last to avoid competing theme layers.
import './styles/product-design-system.css';
import './styles/navigation-performance-polish.css';
import './styles/navigation-modern-blue.css';
import './styles/brand-blue-refinement.css';
import './styles/app-quality-accessibility.css';
import './styles/admin-module-quality.css';
// Final brand palette: violet + forest green, shared by admin and youth portal.
import './styles/jdf-brand-palette.css';
// Final applied visual layer: overrides legacy blue/green theme declarations.
import './styles/jdf-applied-design.css';
// Final touch-device performance and layout-stability layer.
import './styles/mobile-runtime-stability.css';

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


