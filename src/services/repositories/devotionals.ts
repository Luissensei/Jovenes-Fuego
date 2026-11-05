import {httpsCallable} from 'firebase/functions';

import {assertFirebaseWritesAllowed, functions} from '../firebase/client';

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

async function call<TRequest, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const response = await callable(payload);
  return response.data;
}

function validateDevotional(data: CreateDevotionalInput) {
  const fields = [
    data.title, data.verse, data.reference, data.author,
    data.category, data.date, data.content,
  ];
  if (fields.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error('Completa todos los campos del devocional.');
  }
  if (data.title.trim().length > 120 || data.verse.trim().length > 2000 ||
    data.content.trim().length > 10000 || data.reference.trim().length > 120 ||
    data.author.trim().length > 100 || data.category.trim().length > 50) {
    throw new Error('Uno de los campos supera el tamaño permitido.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    Number.isNaN(new Date(`${data.date}T12:00:00`).getTime())) {
    throw new Error('Indica una fecha válida.');
  }
}

export async function listDevotionals(): Promise<DevotionalRecord[]> {
  const response = await call<Record<string, never>, {devotionals: DevotionalRecord[]}>(
    'adminListDevotionals',
    {},
  );
  return Array.isArray(response.devotionals) ? response.devotionals : [];
}

export async function createDevotional(
  input: CreateDevotionalInput,
): Promise<string> {
  assertFirebaseWritesAllowed();
  validateDevotional(input);
  const response = await call<CreateDevotionalInput, {success: boolean; id: string}>(
    'adminCreateDevotional',
    {
      title: input.title.trim(),
      verse: input.verse.trim(),
      reference: input.reference.trim(),
      author: input.author.trim(),
      category: input.category.trim(),
      date: input.date,
      content: input.content.trim(),
    },
  );
  if (!response.success || !response.id) {
    throw new Error('No se pudo confirmar la publicación del devocional.');
  }
  return response.id;
}

export async function deleteDevotional(id: string): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!id.trim()) throw new Error('Selecciona un devocional válido.');
  const response = await call<{id: string}, {success: boolean}>(
    'adminDeleteDevotional',
    {id: id.trim()},
  );
  if (!response.success) throw new Error('No se pudo confirmar la eliminación del devocional.');
}
