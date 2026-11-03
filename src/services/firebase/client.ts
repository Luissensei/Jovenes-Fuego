import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

// Firebase original: respaldo de lectura cuando no se proporciona un entorno.
const originalConfig = {
  apiKey: 'AIzaSyA3jQcyTX6q1D5ior7j3zJUfaQy_31RQ88',
  authDomain: 'jovenes-de-fuego.firebaseapp.com',
  projectId: 'jovenes-de-fuego',
  storageBucket: 'jovenes-de-fuego.firebasestorage.app',
  messagingSenderId: '222344810816',
  appId: '1:222344810816:web:91898b0e914ce5f40b6aa5',
};

const env = import.meta.env;
const hasCompleteEnvironmentConfig = Boolean(
  env.VITE_FIREBASE_API_KEY?.trim()
  && env.VITE_FIREBASE_AUTH_DOMAIN?.trim()
  && env.VITE_FIREBASE_PROJECT_ID?.trim()
  && env.VITE_FIREBASE_APP_ID?.trim(),
);

const config = hasCompleteEnvironmentConfig
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || originalConfig.storageBucket,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || originalConfig.messagingSenderId,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  : originalConfig;

// El proyecto original nunca acepta escrituras desde esta aplicación.
// Staging puede habilitarlas de forma explícita en sus variables de entorno.
const isOriginalProject = config.projectId === originalConfig.projectId;
export const firebaseReadOnlyMode = isOriginalProject
  || env.VITE_FIREBASE_READ_ONLY_PRODUCTION === 'true';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

app = getApps()[0] ?? initializeApp(config);
authInstance = getAuth(app);
dbInstance = getFirestore(app);

// Las funciones callable no se inicializan desde este frontend.
functionsInstance = null;

export const firebaseConfigured = Boolean(app && authInstance && dbInstance);
export const firebaseProjectId = config.projectId;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;

/**
 * El cliente impide escrituras en producción. Firestore Rules siguen siendo
 * la autoridad final también cuando se habilita el proyecto de Staging.
 */
export function assertFirebaseWritesAllowed(): void {
  if (firebaseReadOnlyMode) {
    throw new Error(
      'La base original está protegida en modo de solo lectura. Conecta Staging y habilita sus escrituras para probar esta función.',
    );
  }
}
