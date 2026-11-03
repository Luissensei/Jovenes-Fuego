
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { assertFirebaseWritesAllowed, db } from '../firebase/client';
import { COLLECTIONS } from './collections';

export type CheckinRecord = {
  id: string;
  memberId: string;
  memberName: string;
  meetingName: string;
  date: string;
  createdAt: string;
};

export function subscribeCheckins(
  callback: (items: CheckinRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const checkinsQuery = query(
    collection(db, COLLECTIONS.checkins),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    checkinsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            memberId: String(data.memberId ?? ''),
            memberName: String(data.memberName ?? ''),
            meetingName: String(data.meetingName ?? ''),
            date: String(data.date ?? ''),
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : '',
          };
        }),
      );
    },
    (cause) => onError(
      cause instanceof Error
        ? cause
        : new Error('No se pudieron cargar los registros QR.'),
    ),
  );
}

export async function createCheckin(data: {
  memberId: string;
  memberName: string;
  meetingName: string;
  date: string;
}): Promise<string> {
  assertFirebaseWritesAllowed();

  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const memberId = data.memberId.trim();
  const memberName = data.memberName.trim();
  const meetingName = data.meetingName.trim();
  const date = data.date.trim();

  if (!memberId || !memberName || !meetingName || !date) {
    throw new Error('Faltan datos para registrar la asistencia.');
  }

  const result = await addDoc(
    collection(db, COLLECTIONS.checkins),
    {
      memberId,
      memberName,
      meetingName,
      date,
      createdAt: Timestamp.now(),
    },
  );

  return result.id;
}
