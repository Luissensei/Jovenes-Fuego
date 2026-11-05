import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { assertFirebaseWritesAllowed, db } from '../firebase/client';
import { COLLECTIONS } from './collections';

export type ManagedCollection =
  | 'prayers'
  | 'events'
  | 'inbox'
  | 'turns'
  | 'followups'
  | 'visitors';

export type ManagedRecord = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export function subscribeManagedRecords(
  collectionName: ManagedCollection,
  callback: (records: ManagedRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const collectionNameInFirebase = COLLECTIONS[collectionName];

  const recordsQuery = query(
    collection(db, collectionNameInFirebase),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      const records = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          ...data,
          id: item.id,
          status: String(data.status ?? ''),
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : '',
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate().toISOString()
              : '',
        } as ManagedRecord;
      });

      callback(records);
    },
    (cause) => {
      onError(
        cause instanceof Error
          ? cause
          : new Error('No se pudieron cargar los registros.'),
      );
    },
  );
}

export async function createManagedRecord(
  collectionName: ManagedCollection,
  data: Record<string, string>,
): Promise<string> {
  assertFirebaseWritesAllowed();

  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const cleanData: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    cleanData[key] = value.trim();
  }

  const now = Timestamp.now();

  const result = await addDoc(
    collection(db, COLLECTIONS[collectionName]),
    {
      ...cleanData,
      createdAt: now,
      updatedAt: now,
    },
  );

  return result.id;
}

export async function updateManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
  data: Record<string, string>,
): Promise<void> {
  assertFirebaseWritesAllowed();

  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!recordId.trim()) {
    throw new Error('Selecciona un registro válido.');
  }

  const cleanData: Record<string, string | Timestamp> = {};

  for (const [key, value] of Object.entries(data)) {
    cleanData[key] = value.trim();
  }

  cleanData.updatedAt = Timestamp.now();

  await updateDoc(
    doc(db, COLLECTIONS[collectionName], recordId),
    cleanData,
  );
}

export async function updateManagedRecordStatus(
  collectionName: ManagedCollection,
  recordId: string,
  status: string,
): Promise<void> {
  assertFirebaseWritesAllowed();

  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!recordId.trim() || !status.trim()) {
    throw new Error('El registro y el estado son obligatorios.');
  }

  await updateDoc(
    doc(db, COLLECTIONS[collectionName], recordId),
    {
      status,
      updatedAt: Timestamp.now(),
    },
  );
}

export async function deleteManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
): Promise<void> {
  assertFirebaseWritesAllowed();

  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!recordId.trim()) {
    throw new Error('Selecciona un registro válido.');
  }

  await deleteDoc(
    doc(db, COLLECTIONS[collectionName], recordId),
  );
}
