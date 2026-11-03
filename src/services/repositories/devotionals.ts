import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

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

export type CreateDevotionalInput = Omit<DevotionalRecord, 'id' | 'createdAt'>;

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getDevotionals(): Promise<DevotionalRecord[]> {
  const result = await call<{devotionals: DevotionalRecord[]}>('getDevotionals');
  return Array.isArray(result.devotionals) ? result.devotionals : [];
}

export async function createDevotional(input: CreateDevotionalInput): Promise<string> {
  const result = await call<{success: boolean; id: string}>('createDevotional', input);
  return result.id;
}

export async function deleteDevotional(id: string): Promise<void> {
  await call<{success: boolean}>('deleteDevotional', {id});
}
