
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

import {
  doc,
  getDoc,
} from 'firebase/firestore';

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
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    const authInstance = auth;
    const dbInstance = db;
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
          const profileSnap = await getDoc(
            doc(dbInstance, 'users', currentUser.uid)
          );

          if (!active || currentEvent !== authEvent) return;

          if (!profileSnap.exists()) {
            console.error(
              'No existe el perfil para el UID:',
              currentUser.uid
            );

            setError(
              'Tu sesión está activa, pero no se encontró tu perfil en la colección users. Comprueba que el ID del documento coincida con tu UID de Authentication.'
            );

            setProfile(null);
            return;
          }

          const userProfile = profileSnap.data() as UserProfile;

          if (
            typeof userProfile.role !== 'string' ||
            !userProfile.role.trim()
          ) {
            setError(
              'Tu perfil existe, pero no tiene un rol válido. Contacta al administrador.'
            );

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

          if (firebaseError.code === 'permission-denied') {
            setError(
              'Firebase rechazó la lectura de tu perfil. Revisa las reglas de Firestore Staging.'
            );
          } else {
            setError(
              'No se pudo consultar tu perfil. Comprueba la conexión con Firebase Staging.'
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
