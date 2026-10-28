import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '';
const hasMinimumConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY?.trim() &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() &&
  rawProjectId &&
  import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
);

/**
 * No inicializamos Firebase si faltan variables: permite revisar la interfaz
 * sin conectarse a ninguna base. Si hay configuración, bloqueamos el ID de producción.
 */
if (rawProjectId === 'jovenes-de-fuego') {
  throw new Error('Bloqueado: el frontend de desarrollo no puede conectarse a producción.');
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (hasMinimumConfig) {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: rawProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  app = getApps()[0] ?? initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const firebaseConfigured = Boolean(app && authInstance && dbInstance);
export const firebaseProjectId = rawProjectId || null;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
