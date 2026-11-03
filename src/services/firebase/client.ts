import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

// Firebase original de Jóvenes de Fuego.
// La conexión está configurada en modo de lectura desde la interfaz.
const originalConfig = {
  apiKey: 'AIzaSyA3jQcyTX6q1D5ior7j3zJUfaQy_31RQ88',
  authDomain: 'jovenes-de-fuego.firebaseapp.com',
  projectId: 'jovenes-de-fuego',
  storageBucket: 'jovenes-de-fuego.firebasestorage.app',
  messagingSenderId: '222344810816',
  appId: '1:222344810816:web:91898b0e914ce5f40b6aa5',
};

const rawProjectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || originalConfig.projectId;
const productionReadOnlyEnabled =
  import.meta.env.VITE_FIREBASE_READ_ONLY_PRODUCTION !== 'false';
const originalProjectId = rawProjectId === originalConfig.projectId;

if (originalProjectId && !productionReadOnlyEnabled) {
  throw new Error(
    'La conexión con Firebase original debe permanecer en modo de solo lectura.',
  );
}

if (!originalProjectId) {
  throw new Error(
    'Esta versión está preparada para la base original. No se permite conectar otro proyecto.',
  );
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || originalConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || originalConfig.authDomain,
  projectId: originalConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || originalConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    originalConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || originalConfig.appId,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

app = getApps()[0] ?? initializeApp(config);
authInstance = getAuth(app);
dbInstance = getFirestore(app);

// Do not initialize production callable Functions from this frontend.
functionsInstance = null;

export const firebaseConfigured = Boolean(app && authInstance && dbInstance);
export const firebaseProjectId = originalConfig.projectId;
export const firebaseReadOnlyMode = true;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;

/**
 * Frontend guard only. Firestore rules are still the final authority.
 * Do not remove this guard or add writes to the original project.
 */
export function assertFirebaseWritesAllowed(): void {
  throw new Error(
    'La base original está conectada en modo de solo lectura. No se permiten escrituras desde esta aplicación.',
  );
}
