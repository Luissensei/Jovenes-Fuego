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

import { doc, getDoc } from 'firebase/firestore';

import {
  auth,
  db,
  firebaseConfigured,
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

const allowedRoles = new Set([
  'admin',
  'administrador',
  'pastor',
  'lider',
  'líder',
  'user',
]);

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
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    const authInstance = auth;
    const firestore = db;
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
          // Read only the signed-in user's own application profile.
          const profileSnapshot = await getDoc(
            doc(firestore, 'users', currentUser.uid),
          );

          if (!active || currentEvent !== authEvent) return;

          if (!profileSnapshot.exists()) {
            setError(
              'La sesión inició, pero no existe users/{uid} para esta cuenta.',
            );
            return;
          }

          const data = profileSnapshot.data();
          const role = String(data.role ?? '').trim().toLowerCase();

          if (!allowedRoles.has(role)) {
            setError(
              'La cuenta no tiene un rol de aplicación reconocido en users/{uid}.',
            );
            return;
          }

          setProfile({
            name: typeof data.name === 'string' ? data.name : '',
            user: typeof data.user === 'string' ? data.user : '',
            role,
            groups: Array.isArray(data.groups) ? data.groups.filter((item): item is string => typeof item === 'string').slice(0, 30) : [],
            permissions: Array.isArray(data.permissions) ? data.permissions.filter((item): item is string => typeof item === 'string').slice(0, 40) : undefined,
            status: typeof data.status === 'string' ? data.status : 'active',
          });
          setError(null);
        } catch (cause) {
          if (!active || currentEvent !== authEvent) return;

          const firebaseError = cause as {
            code?: string;
            message?: string;
          };

          console.error(
            'Error leyendo el perfil de aplicación:',
            firebaseError.code,
            firebaseError.message,
          );

          if (firebaseError.code === 'permission-denied') {
            setError(
              'Firebase no permite leer tu propio documento users/{uid}. No se abrirán permisos automáticamente; hay que revisar las reglas actuales.',
            );
          } else if (firebaseError.code === 'unavailable') {
            setError(
              'Firebase no está disponible en este momento. Comprueba tu conexión e inténtalo de nuevo.',
            );
          } else {
            setError(
              'No se pudo leer tu perfil directamente desde Firestore.',
            );
          }

          setProfile(null);
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
      },
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
        if (!firebaseConfigured || !auth || !db) {
          throw new Error(
            'Firebase no está configurado. Comprueba las variables de entorno.',
          );
        }

        const firestore = db;
        setError(null);

        try {
          const identifier = email.trim().toLowerCase();
          let signInEmail = identifier;

          // La app original admite nombre de usuario. Mantener compatibilidad:
          // username@jovenesdefuego.app, con lookup público al correo real si existe.
          if (!identifier.includes('@')) {
            signInEmail = `${identifier}@jovenesdefuego.app`;

            try {
              const usernameLookup = await getDoc(
                doc(firestore, 'public', `al_${identifier}`),
              );
              const mappedEmail = usernameLookup.data()?.e;
              if (
                usernameLookup.exists() &&
                typeof mappedEmail === 'string' &&
                mappedEmail.includes('@')
              ) {
                signInEmail = mappedEmail.trim().toLowerCase();
              }
            } catch {
              // Si el lookup público no existe o no se permite, usar el correo
              // histórico username@jovenesdefuego.app.
            }
          }

          await signInWithEmailAndPassword(
            auth,
            signInEmail,
            password,
          );
        } catch (cause) {
          const firebaseError = cause as {
            code?: string;
            message?: string;
          };

          console.error(
            'Error de inicio de sesión:',
            firebaseError.code,
            firebaseError.message,
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
              'Demasiados intentos. Espera un momento y vuelve a intentar.',
            );
          }

          throw new Error(
            'No se pudo iniciar sesión. Comprueba Firebase Authentication.',
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
    [user, profile, loading, error],
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
      'useAuth debe utilizarse dentro de AuthProvider.',
    );
  }

  return value;
}
