import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/app.css';
import './styles/layout.css';
import './styles/premium-motion.css';
import './styles/theme-system.css';






try {
  const savedTheme = window.localStorage.getItem('jf-theme');
  document.documentElement.dataset.theme = savedTheme === 'light' || savedTheme === 'royal' ? savedTheme : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
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