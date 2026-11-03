import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { BackgroundEffects, ToastProvider } from './components/gaming/GamingUI';
import './styles.css';
import './modern-design.css';
import './tactical-ui.css';
import './visual-overhaul.css';
import './components/gaming/gaming-ui.css';
import './design-system/gaming-system.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // La app sigue funcionando aunque el navegador no permita registrar el service worker.
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <BackgroundEffects />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>,
);
