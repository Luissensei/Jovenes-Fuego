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

// El proyecto destino es fijo: la base original de Jóvenes de Fuego.
// No permitimos que variables antiguas de staging cambien el proyecto.
const config = originalConfig;


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
export const firebaseReadOnlyMode = originalConfig.projectId === 'jovenes-de-fuego';
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;

/**
 * Frontend guard only. Firestore rules are still the final authority.
 * Do not remove this guard or add writes to the original project.
 */
export function assertFirebaseWritesAllowed(): void {
  if (firebaseReadOnlyMode) {
    throw new Error(
      'La base original está protegida en modo de solo lectura. Conecta y prueba Staging antes de habilitar escrituras.',
    );
  }
}
