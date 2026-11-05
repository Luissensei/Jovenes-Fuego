import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/html5-qrcode/')) return 'qr-scanner';
          if (
            id.includes('/node_modules/@firebase/firestore/') ||
            id.includes('/node_modules/firebase/firestore/')
          ) return 'firebase-firestore';
          if (
            id.includes('/node_modules/@firebase/auth/') ||
            id.includes('/node_modules/firebase/auth/')
          ) return 'firebase-auth';
          if (
            id.includes('/node_modules/@firebase/functions/') ||
            id.includes('/node_modules/firebase/functions/')
          ) return 'firebase-functions';
          if (
            id.includes('/node_modules/@firebase/') ||
            id.includes('/node_modules/firebase/')
          ) return 'firebase-core';
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/react-router-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-vendor';
        },
      },
    },
  },
});
