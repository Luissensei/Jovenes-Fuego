import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { type Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

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

const env = import.meta.env;

// Es una clave pública de sitio, no una clave secreta. Se permite sobrescribirla
// desde Vercel, pero la app también funciona sin configurar otra variable.
const appCheckSiteKey = (
  typeof env.VITE_FIREBASE_APP_CHECK_SITE_KEY === 'string'
    ? env.VITE_FIREBASE_APP_CHECK_SITE_KEY.trim()
    : ''
) || '6LeB0Q8uAAAAAN-rwuAIeKHEkDM5SKKgpueRl8GJ';

const firebaseApp: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

let appCheckReady = false;
let appCheckInitError = '';

try {
  // App Check se inicializa antes de Auth, Firestore y Firebase AI Logic.
  // El SDK obtiene y renueva los tokens automáticamente; no se necesita
  // llamar manualmente a grecaptcha.enterprise.execute().
  initializeAppCheck(firebaseApp, {
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

// No se conectan Cloud Functions desde este cliente: Fuego AI usa Firebase
// AI Logic con Gemini Developer API. Así evitamos desplegar backend adicional.
const functionsInstance: Functions | null = null;

export { firebaseApp };
export const firebaseReadOnlyMode = true;
export const firebaseAiAvailable = appCheckReady;
export const firebaseAiSetupMessage = appCheckReady
  ? 'Firebase original conectado. App Check Enterprise está inicializado. Comprueba que Firebase AI Logic esté habilitado y que App Check esté aplicado a Firebase AI Logic en este proyecto.'
  : `No se pudo inicializar App Check Enterprise. Comprueba que la clave esté registrada para el dominio jovenes-fuego.vercel.app. Detalle: ${appCheckInitError}`;
export const firebaseConfigured = Boolean(firebaseApp && authInstance && dbInstance);
export const firebaseProjectId = firebaseConfig.projectId;
export const auth: Auth | null = authInstance;
export const db: Firestore | null = dbInstance;
export const functions: Functions | null = functionsInstance;

/**
 * La aplicación conserva el Firebase original en solo lectura.
 * No se permiten escrituras desde el frontend; las reglas de Firestore
 * siguen siendo la autoridad final para los datos y permisos.
 */
export function assertFirebaseWritesAllowed(): void {
  throw new Error(
    'La base original está protegida en modo de solo lectura. Esta operación no puede realizarse desde la aplicación.',
  );
}
