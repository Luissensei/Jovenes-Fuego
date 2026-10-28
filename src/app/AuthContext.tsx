
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

    const unsubscribe = onAuthStateChanged(
      authInstance,
      async (currentUser) => {
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

          if (!active) return;

          if (!profileSnap.exists()) {
            setError(
              'Tu cuenta inició sesión, pero no tiene un perfil autorizado en la colección users.'
            );

            await signOut(authInstance);

            if (active) {
              setUser(null);
              setProfile(null);
            }

            return;
          }

          setProfile(profileSnap.data() as UserProfile);
        } catch (cause) {
          if (!active) return;

          console.error(
            'Error verificando el perfil del usuario:',
            cause
          );

          setError(
            'No se pudo verificar tu perfil. Revisa la conexión y las reglas de Firebase de staging.'
          );

          try {
            await signOut(authInstance);
          } catch (signOutError) {
            console.error(
              'Error cerrando la sesión:',
              signOutError
            );
          }

          if (active) {
            setUser(null);
            setProfile(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
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
            'Firebase staging no está configurado. Completa .env.local.'
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
          const code = (cause as { code?: string })?.code;

          if (
            code === 'auth/invalid-credential' ||
            code === 'auth/wrong-password' ||
            code === 'auth/user-not-found'
          ) {
            throw new Error(
              'Correo o contraseña incorrectos.'
            );
          }

          if (code === 'auth/too-many-requests') {
            throw new Error(
              'Demasiados intentos. Espera un momento y vuelve a intentar.'
            );
          }

          console.error(
            'Error de inicio de sesión:',
            cause
          );

          throw new Error(
            'No se pudo iniciar sesión. Verifica que Authentication esté habilitado en staging.'
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
      'useAuth debe usarse dentro de AuthProvider.'
    );
  }

  return value;
}
