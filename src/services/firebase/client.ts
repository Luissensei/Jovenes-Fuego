import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

// Default to the dedicated Staging project when local environment variables
// are missing or blank. Never fall back to the production project.
const stagingConfig = {
  apiKey: 'AIzaSyAgVzJB3AHxRR30Yr0RRpts4ML5Oq49nEc',
  authDomain: 'jovenes-de-fuego-staging.firebaseapp.com',
  projectId: 'jovenes-de-fuego-staging',
  storageBucket: 'jovenes-de-fuego-staging.firebasestorage.app',
  messagingSenderId: '188361954175',
  appId: '1:188361954175:web:8dad8ca26b11967c6d004a',
};

const rawProjectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || stagingConfig.projectId;
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

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || stagingConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || stagingConfig.authDomain,
  projectId: rawProjectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    (originalProjectId ? undefined : stagingConfig.storageBucket),
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    (originalProjectId ? undefined : stagingConfig.messagingSenderId),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || stagingConfig.appId,
};

const hasMinimumConfig = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

if (hasMinimumConfig) {
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
