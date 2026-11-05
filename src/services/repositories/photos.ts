import {httpsCallable} from 'firebase/functions';

import {assertFirebaseWritesAllowed, functions} from '../firebase/client';

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

export type PhotoLists = {
  pending: PhotoRecord[];
  approved: PhotoRecord[];
};

async function call<TRequest, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const response = await callable(payload);
  return response.data;
}

function validatePhoto(input: CreatePhotoInput) {
  if (!input.title.trim() || !input.imageUrl.trim() || !input.authorName.trim()) {
    throw new Error('Completa el título, enlace y autor.');
  }
  if (input.title.trim().length > 120 || input.description.trim().length > 2000 ||
    input.imageUrl.trim().length > 2000 || input.authorName.trim().length > 120) {
    throw new Error('Uno de los campos supera el tamaño permitido.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.imageUrl.trim());
  } catch {
    throw new Error('El enlace de la imagen no es válido.');
  }
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error('La imagen debe tener un enlace HTTP o HTTPS.');
  }
}

/** Consulta ambas galerías desde el servidor con autorización administrativa. */
export async function listPhotosForAdministration(): Promise<PhotoLists> {
  const response = await call<Record<string, never>, PhotoLists>('adminListPhotos', {});
  return {
    pending: Array.isArray(response.pending) ? response.pending : [],
    approved: Array.isArray(response.approved) ? response.approved : [],
  };
}

export async function createPhotoRequest(input: CreatePhotoInput): Promise<string> {
  assertFirebaseWritesAllowed();
  validatePhoto(input);
  const response = await call<CreatePhotoInput, {success: boolean; id: string}>(
    'submitPhotoRequest',
    {
      title: input.title.trim(),
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim(),
      authorName: input.authorName.trim(),
    },
  );
  if (!response.success || !response.id) {
    throw new Error('No se pudo confirmar el envío de la fotografía.');
  }
  return response.id;
}

export async function approvePhoto(item: PhotoRecord): Promise<void> {
  assertFirebaseWritesAllowed();
  const response = await call<{id: string}, {success: boolean}>(
    'approvePhotoRequest',
    {id: item.id},
  );
  if (!response.success) throw new Error('No se pudo confirmar la aprobación.');
}

export async function rejectPhoto(id: string): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!id.trim()) throw new Error('Selecciona una fotografía válida.');
  const response = await call<{id: string}, {success: boolean}>(
    'rejectPhotoRequest',
    {id: id.trim()},
  );
  if (!response.success) throw new Error('No se pudo confirmar el rechazo.');
}

export async function deleteApprovedPhoto(id: string): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!id.trim()) throw new Error('Selecciona una fotografía válida.');
  const response = await call<{id: string}, {success: boolean}>(
    'deleteApprovedPhoto',
    {id: id.trim()},
  );
  if (!response.success) throw new Error('No se pudo confirmar la eliminación.');
}
