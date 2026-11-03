import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions';

const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '';

const hasMinimumConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY?.trim() &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() &&
  rawProjectId &&
  import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
);

if (rawProjectId === 'jovenes-de-fuego') {
  throw new Error(
    'Bloqueado: el frontend de desarrollo no puede conectarse a producción.',
  );
}

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
  const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() || 'us-central1';
  functionsInstance = getFunctions(app, functionsRegion);

  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  ) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
    connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
  }
}

export const firebaseConfigured = Boolean(
  app && authInstance && dbInstance,
);

export const firebaseProjectId = rawProjectId || null;
export const firebaseFunctionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() || 'us-central1';
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;