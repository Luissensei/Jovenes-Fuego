import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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
  && env.VITE_FIREBASE_STORAGE_BUCKET?.trim()
  && env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim()
  && env.VITE_FIREBASE_APP_ID?.trim(),
);

const useStagingEnvironment = env.VITE_FIREBASE_TARGET === 'staging'
  && env.VITE_FIREBASE_PROJECT_ID === 'jovenes-de-fuego-staging'
  && hasCompleteEnvironmentConfig;

const config = useStagingEnvironment
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
// Solo se usa Staging cuando VITE_FIREBASE_TARGET=staging y el projectId coincide.
const isOriginalProject = config.projectId === originalConfig.projectId;
export const firebaseReadOnlyMode = isOriginalProject
  || !useStagingEnvironment
  || env.VITE_FIREBASE_READ_ONLY_PRODUCTION === 'true';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let appCheckReady = false;
let appCheckInitError = '';

app = getApps()[0] ?? initializeApp(config);

const appCheckSiteKey = typeof env.VITE_FIREBASE_APP_CHECK_SITE_KEY === 'string'
  ? env.VITE_FIREBASE_APP_CHECK_SITE_KEY.trim()
  : '';

if (useStagingEnvironment && appCheckSiteKey) {
  try {
    // Initialize App Check before Auth, Firestore, Functions or AI Logic.
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckReady = true;
  } catch (cause) {
    // No se habilita la IA si App Check no pudo inicializarse.
    appCheckInitError = cause instanceof Error ? cause.message : 'No se pudo inicializar App Check.';
    console.warn('Firebase App Check no se pudo inicializar:', cause);
  }
}

authInstance = getAuth(app);
dbInstance = getFirestore(app);

// Las funciones administrativas solo se conectan al proyecto aislado de Staging.
functionsInstance = useStagingEnvironment
  ? getFunctions(app, 'us-central1')
  : null;

export const firebaseApp: FirebaseApp = app;
export const firebaseAiAvailable = useStagingEnvironment && appCheckReady;
export const firebaseAiSetupMessage = !useStagingEnvironment
  ? env.VITE_FIREBASE_TARGET !== 'staging'
    ? 'Fuego AI está protegida y solo funciona conectada a Firebase Staging. La conexión actual no está marcada como Staging.'
    : env.VITE_FIREBASE_PROJECT_ID !== 'jovenes-de-fuego-staging'
      ? 'El proyecto configurado no coincide con jovenes-de-fuego-staging. Por seguridad, Fuego AI no se conecta a producción.'
      : 'Faltan variables públicas de configuración de Firebase Staging en el entorno de Vercel.'
  : !appCheckSiteKey
    ? 'Falta VITE_FIREBASE_APP_CHECK_SITE_KEY en las variables de entorno de Vercel para Staging. Registra la aplicación web en Firebase App Check con reCAPTCHA v3 y agrega aquí la clave pública del sitio (no la clave secreta).'
    : !appCheckReady
      ? `App Check no pudo inicializarse. Verifica que el dominio de Vercel esté autorizado para la clave reCAPTCHA v3. ${appCheckInitError}`
      : 'La app está conectada a Staging y App Check está inicializado. Si el envío falla, revisa que Firebase AI Logic esté habilitado en el proyecto Staging.';
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
