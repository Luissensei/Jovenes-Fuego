import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/app.css';
import './styles/layout.css';
import './styles/command-center.css';
import './styles/quality-overhaul.css';
import './styles/glass-blue-system.css';
import './styles/refinement.css';

try {
  const initialTheme = window.localStorage.getItem('jf-theme') === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = initialTheme;
  document.documentElement.style.colorScheme = initialTheme;
} catch {
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.style.colorScheme = 'dark';
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
