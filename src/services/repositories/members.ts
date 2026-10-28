import { collection, onSnapshot, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/client';

/** Campos observados en la aplicación original. Opcionales porque el esquema histórico es flexible. */
export type MemberRecord = {
  id: string;
  name?: string;
  phone?: string;
  created?: string | number;
  from?: string;
  bd?: string;
  ac?: boolean | string;
  ap?: string;
  br?: string;
  nick?: string;
  nopub?: boolean;
  bau?: string;
  con?: string;
  dis?: string;
  mn?: string;
  nt?: string;
  pic?: string;
  [key: string]: unknown;
};

export function subscribeMembers(
  onData: (members: MemberRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  if (!db) return null;
  return onSnapshot(
    collection(db, 'members'),
    (snapshot) => {
      const members = snapshot.docs.map((item) => ({
        ...(item.data() as DocumentData),
        id: item.id,
      })) as MemberRecord[];
      members.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'));
      onData(members);
    },
    (cause) => onError(cause instanceof Error ? cause : new Error('No se pudieron cargar los jóvenes.')),
  );
}
