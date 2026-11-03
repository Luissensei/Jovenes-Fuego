import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '';
const productionReadOnlyEnabled =
  import.meta.env.VITE_FIREBASE_READ_ONLY_PRODUCTION === 'true';
const originalProjectId = rawProjectId === 'jovenes-de-fuego';

if (originalProjectId && !productionReadOnlyEnabled) {
  throw new Error(
    'El proyecto original solo puede conectarse con el modo de solo lectura habilitado.',
  );
}

if (productionReadOnlyEnabled && !originalProjectId) {
  throw new Error(
    'El modo de solo lectura requiere VITE_FIREBASE_PROJECT_ID=jovenes-de-fuego.',
  );
}

const hasMinimumConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY?.trim() &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() &&
  rawProjectId &&
  import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

if (hasMinimumConfig) {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: rawProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = getApps()[0] ?? initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  // Production read-only mode never initializes callable Functions.
  if (!productionReadOnlyEnabled) {
    functionsInstance = getFunctions(app);
  }
}

export const firebaseConfigured = Boolean(
  app && authInstance && dbInstance,
);

export const firebaseProjectId = rawProjectId || null;
export const firebaseReadOnlyMode = productionReadOnlyEnabled;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;

/**
 * Stops client-side writes when the app is connected to the original project.
 */
export function assertFirebaseWritesAllowed(): void {
  if (firebaseReadOnlyMode) {
    throw new Error(
      'La conexión con producción está en modo de solo lectura. Esta operación está deshabilitada.',
    );
  }
}
