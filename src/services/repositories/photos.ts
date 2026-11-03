
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
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../firebase/client';
import { COLLECTIONS } from './collections';

export type PhotoRecord = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  authorName: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
};

export type CreatePhotoInput = {
  title: string;
  description: string;
  imageUrl: string;
  authorName: string;
};

function parsePhoto(id: string, data: Record<string, unknown>): PhotoRecord {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    imageUrl: String(data.imageUrl ?? ''),
    authorName: String(data.authorName ?? ''),
    status: String(data.status ?? ''),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : '',
    approvedAt:
      data.approvedAt instanceof Timestamp
        ? data.approvedAt.toDate().toISOString()
        : undefined,
  };
}

function validatePhoto(input: CreatePhotoInput) {
  if (
    !input.title.trim() ||
    !input.imageUrl.trim() ||
    !input.authorName.trim()
  ) {
    throw new Error('Completa el título, enlace y autor.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.imageUrl);
  } catch {
    throw new Error('El enlace de la imagen no es válido.');
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error('La imagen debe tener un enlace HTTP o HTTPS.');
  }
}

export function subscribePendingPhotos(
  callback: (items: PhotoRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  return onSnapshot(
    query(
      collection(db, COLLECTIONS.pendingPhotos),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) =>
          parsePhoto(item.id, item.data()),
        ),
      );
    },
    (cause) => onError(
      cause instanceof Error
        ? cause
        : new Error('No se pudieron cargar las fotografías pendientes.'),
    ),
  );
}

export function subscribeApprovedPhotos(
  callback: (items: PhotoRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  return onSnapshot(
    query(
      collection(db, COLLECTIONS.photos),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) =>
          parsePhoto(item.id, item.data()),
        ),
      );
    },
    (cause) => onError(
      cause instanceof Error
        ? cause
        : new Error('No se pudieron cargar las fotografías aprobadas.'),
    ),
  );
}

export async function createPhotoRequest(
  input: CreatePhotoInput,
): Promise<string> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  validatePhoto(input);

  const result = await addDoc(
    collection(db, COLLECTIONS.pendingPhotos),
    {
      title: input.title.trim(),
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim(),
      authorName: input.authorName.trim(),
      status: 'Pendiente',
      createdAt: Timestamp.now(),
    },
  );

  return result.id;
}

export async function approvePhoto(item: PhotoRecord): Promise<void> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  const batch = writeBatch(db);
  const approvedRef = doc(collection(db, COLLECTIONS.photos));
  const pendingRef = doc(db, COLLECTIONS.pendingPhotos, item.id);

  batch.set(approvedRef, {
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    authorName: item.authorName,
    status: 'Aprobada',
    createdAt: item.createdAt
      ? Timestamp.fromDate(new Date(item.createdAt))
      : Timestamp.now(),
    approvedAt: Timestamp.now(),
  });

  batch.delete(pendingRef);

  await batch.commit();
}


export async function rejectPhoto(id: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!id.trim()) {
    throw new Error('Selecciona una fotografía válida.');
  }

  await updateDoc(
    doc(db, COLLECTIONS.pendingPhotos, id),
    {
      status: 'Rechazada',
    },
  );
}


export async function deleteApprovedPhoto(id: string): Promise<void> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  await deleteDoc(doc(db, COLLECTIONS.photos, id));
}
