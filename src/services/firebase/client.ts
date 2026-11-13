import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

// Jóvenes de Fuego utiliza únicamente su proyecto Firebase original.
// La configuración web es pública; las reglas de Firestore y Authentication
// siguen siendo la autoridad de acceso.
const firebaseConfig = {
  apiKey: 'AIzaSyA3jQcyTX6q1D5ior7j3zJUfaQy_31RQ88',
  authDomain: 'jovenes-de-fuego.firebaseapp.com',
  projectId: 'jovenes-de-fuego',
  storageBucket: 'jovenes-de-fuego.firebasestorage.app',
  messagingSenderId: '222344810816',
  appId: '1:222344810816:web:91898b0e914ce5f40b6aa5',
};

// Clave pública Site Key de reCAPTCHA Enterprise registrada en Firebase App Check
// para la aplicación web del proyecto original "jovenes-de-fuego".
const appCheckSiteKey = '6LeB0Q8uAAAAAEpam8URtnsLNVewLDlxYK5AYJqU';

const firebaseApp: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

let appCheckReady = false;
let appCheckInstance: AppCheck | null = null;
let appCheckInitError = '';

try {
  // App Check se inicializa antes de Auth, Firestore y Firebase AI Logic.
  // El SDK obtiene y renueva los tokens automáticamente; no se necesita
  // llamar manualmente a grecaptcha.enterprise.execute().
  appCheckInstance = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckReady = true;
} catch (cause) {
  appCheckInitError = cause instanceof Error
    ? cause.message
    : 'No se pudo inicializar Firebase App Check.';
  console.warn('Firebase App Check no se pudo inicializar:', cause);
}

const authInstance: Auth = getAuth(firebaseApp);
const dbInstance: Firestore = getFirestore(firebaseApp);

// Las operaciones privilegiadas se ejecutan mediante Cloud Functions,
// que validan identidad, rol y permisos en el servidor. La región coincide
// con la configuración predeterminada de Functions v2.
const functionsInstance = {} as Functions;

export { firebaseApp };
export const firebaseReadOnlyMode = false;
export const firebaseAiAvailable = appCheckReady;
export const firebaseAiSetupMessage = appCheckReady
  ? 'Firebase original conectado. App Check Enterprise está inicializado. Comprueba que Firebase AI Logic esté habilitado y que App Check esté aplicado a Firebase AI Logic en este proyecto.'
  : `No se pudo inicializar App Check Enterprise. Comprueba que la clave esté registrada para el dominio jovenes-fuego.vercel.app. Detalle: ${appCheckInitError}`;
export const firebaseConfigured = Boolean(firebaseApp && authInstance && dbInstance);
export const firebaseProjectId = firebaseConfig.projectId;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions = functionsInstance;
export const appCheck: AppCheck | null = appCheckInstance;
export const firebaseAppCheckError = appCheckInitError;

/**
 * La aplicación puede solicitar escrituras en el proyecto Firebase original.
 * Firestore Security Rules y Authentication siguen siendo la autoridad final:
 * este control no concede permisos ni evita las reglas del servidor.
 */
export function assertFirebaseWritesAllowed(): void {
  if (!firebaseConfigured || !db) {
    throw new Error('Firebase Firestore no está configurado.');
  }
}
