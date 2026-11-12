import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^firebase\/functions$/,
        replacement: fileURLToPath(new URL('./src/services/firebase/functionsShim.ts', import.meta.url)),
      },
    ],
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/html5-qrcode/')) return 'qr-scanner';
          if (id.includes('/node_modules/echarts/')) return 'charts-vendor';
          if (id.includes('/node_modules/motion/') || id.includes('/node_modules/framer-motion/')) return 'motion-vendor';
          if (id.includes('/node_modules/qrcode.react/')) return 'qr-renderer';
          if (
            id.includes('/node_modules/@firebase/firestore/') ||
            id.includes('/node_modules/firebase/firestore/')
          ) return 'firebase-firestore';
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
