import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {httpsCallable} from 'firebase/functions';

import {
  auth,
  firebaseConfigured,
  functions,
} from '../services/firebase/client';

export type AppRole =
  | 'admin'
  | 'administrador'
  | 'pastor'
  | 'lider'
  | 'líder'
  | 'user'
  | string;

export type UserProfile = {
  name?: string;
  user?: string;
  role?: AppRole;
  groups?: string[];
  permissions?: string[];
  status?: string;
  [key: string]: unknown;
};

type ApplicationProfileResponse = {
  profile?: {
    name?: string;
    user?: string;
    role?: string;
    groups?: string[];
    permissions?: string[];
    status?: string;
  };
};

type UsernameLookupResponse = {
  found?: boolean;
  email?: string;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const allowedRoles = new Set([
  'admin',
  'administrador',
  'pastor',
  'lider',
  'líder',
  'user',
]);

async function loadCurrentApplicationProfile(): Promise<UserProfile> {
  if (!functions) throw new Error('El cliente de conexión con el backend no está configurado.');
  const getProfile = httpsCallable<Record<string, never>, ApplicationProfileResponse>(
    functions,
    'getMyApplicationProfile',
  );
  const response = await getProfile({});
  const data = response.data.profile;
  if (!data) throw new Error('No se pudo recibir el perfil de aplicación.');
  return {
    name: typeof data.name === 'string' ? data.name : '',
    user: typeof data.user === 'string' ? data.user : '',
    role: typeof data.role === 'string' ? data.role.trim().toLowerCase() : '',
    groups: Array.isArray(data.groups)
      ? data.groups.filter((item): item is string => typeof item === 'string').slice(0, 30)
      : [],
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter((item): item is string => typeof item === 'string').slice(0, 40)
      : undefined,
    status: typeof data.status === 'string' ? data.status : 'active',
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [profileRetryKey, setProfileRetryKey] = useState(0);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !functions) {
      setLoading(false);
      return;
    }

    const authInstance = auth;
    let active = true;
    let authEvent = 0;

    const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
      const currentEvent = ++authEvent;
      if (!active) return;

      setUser(currentUser);
      setProfile(null);
      setError(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Identity, role and module permissions are read through Admin SDK.
        // The browser no longer needs direct access to users/{uid}.
        const data = await loadCurrentApplicationProfile();
        if (!active || currentEvent !== authEvent) return;

        if (data.status === 'inactive') {
          setError('El acceso de esta cuenta fue suspendido. Contacta al administrador de la comunidad.');
          return;
        }

        const role = String(data.role ?? '').trim().toLowerCase();
        if (!allowedRoles.has(role)) {
          setError('La cuenta no tiene un rol de aplicación reconocido en users/{uid}.');
          return;
        }

        setProfile({...data, role});
        setError(null);
      } catch (cause) {
        if (!active || currentEvent !== authEvent) return;
        const callableError = cause as {code?: string; message?: string; details?: {reason?: string}};
        console.error(
          'Error consultando el perfil de aplicación:',
          callableError.code,
          callableError.message,
        );

        const code = String(callableError.code ?? '').replace(/^functions\//, '');
        if (code === 'permission-denied') {
          setError(callableError.message || 'La cuenta no tiene un perfil autorizado en Firebase.');
        } else if (code === 'unavailable' || code === 'deadline-exceeded') {
          setError('El backend de Vercel no responde en este momento. Comprueba la conexión e inténtalo de nuevo.');
        } else if (code === 'failed-precondition') {
          const reason = typeof callableError.details?.reason === 'string'
            ? callableError.details.reason
            : '';
          if (reason === 'app-check-token-failed') {
            setError(callableError.message || 'Firebase App Check no pudo verificar esta aplicación. Revisa la clave reCAPTCHA Enterprise y el dominio autorizado.');
          } else {
            setError('El backend rechazó la solicitud por una condición de seguridad. Revisa los registros de Vercel y la configuración de Firebase App Check.');
          }
        } else if (code === 'not-found') {
          setError('La operación de perfil no está disponible en el backend de Vercel. Revisa el despliegue de la aplicación.');
        } else if (code === 'unauthenticated') {
          const reason = typeof callableError.details?.reason === 'string'
            ? callableError.details.reason
            : '';
          console.error('Diagnóstico de validación de sesión:', reason || 'sin detalle del servidor');
          setError(reason
            ? `Firebase no pudo validar tu sesión (diagnóstico: ${reason}). Cierra sesión y vuelve a ingresar.`
            : 'Firebase no pudo validar tu sesión. Cierra sesión, vuelve a ingresar e inténtalo otra vez.');
        } else if (code === 'internal' || code === 'unknown') {
          setError('El backend de Vercel falló al consultar tu perfil. Revisa los registros de ejecución; no se modificó tu perfil.');
        } else if (code) {
          setError(`No se pudo validar el perfil (backend: ${code}). Revisa la configuración del backend de Vercel.`);
        } else {
          setError('No se pudo validar el perfil de aplicación mediante el backend de Vercel.');
        }
        setProfile(null);
      } finally {
        if (active && currentEvent === authEvent) setLoading(false);
      }
    }, (cause) => {
      if (!active) return;
      console.error('Error de autenticación:', cause);
      setError('No se pudo comprobar la sesión de Firebase.');
      setLoading(false);
    });

    return () => {
      active = false;
      authEvent += 1;
      unsubscribe();
    };
  }, [profileRetryKey]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    configured: firebaseConfigured,
    error,
    retryProfile() {
      setError(null);
      setLoading(true);
      setProfileRetryKey((value) => value + 1);
    },

    async login(email, password) {
      if (!firebaseConfigured || !auth) {
        throw new Error('Firebase Authentication no está configurado.');
      }

      setError(null);
      const identifier = email.trim().toLowerCase();

      try {
        if (identifier.includes('@')) {
          await signInWithEmailAndPassword(auth, identifier, password);
          return;
        }

        if (!functions) {
          throw new Error('El servicio seguro de inicio de sesión por usuario no está disponible.');
        }

        const signInUsername = httpsCallable<
          {username: string; password: string},
          UsernameLoginResponse
        >(functions, 'signInWithUsername');
        const response = await signInUsername({username: identifier, password});
        const customToken = response.data.customToken;
        if (typeof customToken !== 'string' || !customToken) {
          throw new Error('No se pudo iniciar sesión. Comprueba tus credenciales.');
        }
        await signInWithCustomToken(auth, customToken);
      } catch (cause) {
        const firebaseError = cause as {code?: string; message?: string};
        const code = String(firebaseError.code ?? '');
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found' ||
          code === 'functions/unauthenticated' ||
          code === 'functions/invalid-argument'
        ) {
          throw new Error('Usuario/correo o contraseña incorrectos.');
        }
        if (code === 'auth/too-many-requests' || code === 'functions/resource-exhausted') {
          throw new Error('Demasiados intentos. Espera un momento y vuelve a intentar.');
        }
        console.error('Error de inicio de sesión:', code);
        if (cause instanceof Error && cause.message.startsWith('El servicio seguro')) {
          throw cause;
        }
        throw new Error('No se pudo iniciar sesión. Comprueba tu conexión e inténtalo de nuevo.');
      }
    },

    async logout() {
      if (auth) await signOut(auth);
      setUser(null);
      setProfile(null);
      setError(null);
    },
  }), [user, profile, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }
  return value;
}
