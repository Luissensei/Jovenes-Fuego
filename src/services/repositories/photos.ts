import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

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

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getPhotos(): Promise<{
  pending: PhotoRecord[];
  approved: PhotoRecord[];
}> {
  const result = await call<{pending: PhotoRecord[]; approved: PhotoRecord[]}>('getPhotos');
  return {
    pending: Array.isArray(result.pending) ? result.pending : [],
    approved: Array.isArray(result.approved) ? result.approved : [],
  };
}

export async function createPhotoRequest(input: CreatePhotoInput): Promise<string> {
  const result = await call<{success: boolean; id: string}>('createPhotoRequest', {
    title: input.title.trim(),
    description: input.description.trim(),
    imageUrl: input.imageUrl.trim(),
    authorName: input.authorName.trim(),
  });
  return result.id;
}

export async function approvePhoto(item: PhotoRecord): Promise<void> {
  await call('approvePhoto', {id: item.id});
}

export async function rejectPhoto(id: string): Promise<void> {
  await call('rejectPhoto', {id});
}

export async function deleteApprovedPhoto(id: string): Promise<void> {
  await call('deleteApprovedPhoto', {id});
}
