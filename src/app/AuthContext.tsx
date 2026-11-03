
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
  functions,
  firebaseConfigured,
  firebaseReadOnly,
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
  [key: string]: unknown;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !functions) {
      setLoading(false);
      return;
    }

    const authInstance = auth;
    const functionsInstance = functions;
    let active = true;
    let authEvent = 0;

    const unsubscribe = onAuthStateChanged(
      authInstance,
      async (currentUser) => {
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
          const getApplicationProfile = httpsCallable<
            Record<string, never>,
            {profile: UserProfile}
          >(functionsInstance, 'getMyApplicationProfile');
          const profileResponse = await getApplicationProfile({});
          const userProfile = profileResponse.data.profile;

          if (!active || currentEvent !== authEvent) return;

          if (
            !userProfile ||
            typeof userProfile.role !== 'string' ||
            !userProfile.role.trim()
          ) {
            setError('La función no devolvió un perfil con un rol válido. Contacta al administrador.');
            setProfile(null);
            return;
          }

          setProfile(userProfile);
          setError(null);

        } catch (cause) {
          if (!active || currentEvent !== authEvent) return;

          const firebaseError = cause as {
            code?: string;
            message?: string;
          };

          console.error(
            'Error verificando el perfil:',
            firebaseError.code,
            firebaseError.message
          );

          if (
            firebaseError.code === 'functions/permission-denied' ||
            firebaseError.code === 'functions/not-found'
          ) {
            setError(
              'Tu cuenta no tiene un perfil autorizado en users o la función getMyApplicationProfile todavía no está desplegada en Firebase Staging.'
            );
          } else if (firebaseError.code === 'functions/unauthenticated') {
            setError('La sesión expiró. Inicia sesión nuevamente.');
          } else {
            setError(
              'No se pudo validar tu perfil mediante Firebase Functions. Comprueba que las funciones estén desplegadas en Staging.'
            );
          }

          setProfile(null);

          // No cerrar automáticamente la sesión.
          // El usuario podrá seguir autenticado mientras se
          // identifica y corrige el problema del perfil.
        } finally {
          if (active && currentEvent === authEvent) {
            setLoading(false);
          }
        }
      },
      (cause) => {
        if (!active) return;

        console.error('Error de autenticación:', cause);

        setError('No se pudo comprobar la sesión de Firebase.');
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseConfigured,
      error,

      async login(email, password) {
        if (!firebaseConfigured || !auth) {
          throw new Error(
            'Firebase Staging no está configurado. Comprueba .env.local.'
          );
        }

        setError(null);

        try {
          await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );
        } catch (cause) {
          const firebaseError = cause as {
            code?: string;
            message?: string;
          };

          console.error(
            'Error de inicio de sesión:',
            firebaseError.code,
            firebaseError.message
          );

          if (
            firebaseError.code === 'auth/invalid-credential' ||
            firebaseError.code === 'auth/wrong-password' ||
            firebaseError.code === 'auth/user-not-found'
          ) {
            throw new Error('Correo o contraseña incorrectos.');
          }

          if (firebaseError.code === 'auth/too-many-requests') {
            throw new Error(
              'Demasiados intentos. Espera un momento y vuelve a intentar.'
            );
          }

          throw new Error(
            'No se pudo iniciar sesión. Comprueba Firebase Authentication en Staging.'
          );
        }
      },

      async logout() {
        if (auth) {
          await signOut(auth);
        }

        setUser(null);
        setProfile(null);
        setError(null);
      },
    }),
    [user, profile, loading, error]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider.'
    );
  }

  return value;
}
