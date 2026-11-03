
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../firebase/client';
import { COLLECTIONS } from './collections';

export type DevotionalRecord = {
  id: string;
  title: string;
  verse: string;
  reference: string;
  author: string;
  category: string;
  date: string;
  content: string;
  createdAt: string;
};

export type CreateDevotionalInput = Omit<
  DevotionalRecord,
  'id' | 'createdAt'
>;

function validateDevotional(data: CreateDevotionalInput) {
  const fields = [
    data.title,
    data.verse,
    data.reference,
    data.author,
    data.category,
    data.date,
    data.content,
  ];

  if (fields.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error('Completa todos los campos del devocional.');
  }

  if (data.title.length > 120) {
    throw new Error('El título no puede superar 120 caracteres.');
  }

  if (data.verse.length > 2000 || data.content.length > 10000) {
    throw new Error('El versículo o la reflexión son demasiado largos.');
  }
}

export async function createDevotional(
  input: CreateDevotionalInput,
): Promise<string> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  validateDevotional(input);

  const result = await addDoc(
    collection(db, COLLECTIONS.devotionals),
    {
      title: input.title.trim(),
      verse: input.verse.trim(),
      reference: input.reference.trim(),
      author: input.author.trim(),
      category: input.category.trim(),
      date: input.date,
      content: input.content.trim(),
      createdAt: Timestamp.now(),
    },
  );

  return result.id;
}

export function subscribeDevotionals(
  callback: (items: DevotionalRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const devotionalQuery = query(
    collection(db, COLLECTIONS.devotionals),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    devotionalQuery,
    (snapshot) => {
      const items: DevotionalRecord[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          title: String(data.title ?? ''),
          verse: String(data.verse ?? ''),
          reference: String(data.reference ?? ''),
          author: String(data.author ?? ''),
          category: String(data.category ?? ''),
          date: String(data.date ?? ''),
          content: String(data.content ?? ''),
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : '',
        };
      });

      callback(items);
    },
    (cause) => {
      onError(
        cause instanceof Error
          ? cause
          : new Error('No se pudieron cargar los devocionales.'),
      );
    },
  );
}

export async function deleteDevotional(id: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!id.trim()) {
    throw new Error('Selecciona un devocional válido.');
  }

  await deleteDoc(doc(db, COLLECTIONS.devotionals, id));
}
