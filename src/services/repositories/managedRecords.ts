import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

export type ManagedCollection = 'inbox' | 'turns';

export type ManagedRecord = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

async function call<T>(name: string, payload: unknown): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getManagedRecords(
  collectionName: ManagedCollection,
): Promise<ManagedRecord[]> {
  const result = await call<{items: ManagedRecord[]}>('getManagedRecords', {
    kind: collectionName,
  });
  return Array.isArray(result.items) ? result.items : [];
}

export async function createManagedRecord(
  collectionName: ManagedCollection,
  data: Record<string, string>,
): Promise<string> {
  const {status, ...fields} = data;
  const result = await call<{success: boolean; id: string}>('createManagedRecord', {
    kind: collectionName,
    fields,
    status,
  });
  return result.id;
}

export async function updateManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
  data: Record<string, string>,
): Promise<void> {
  await call('updateManagedRecord', {
    kind: collectionName,
    id: recordId,
    fields: data,
  });
}

export async function updateManagedRecordStatus(
  collectionName: ManagedCollection,
  recordId: string,
  status: string,
): Promise<void> {
  await call('updateManagedRecordStatus', {
    kind: collectionName,
    id: recordId,
    status,
  });
}

export async function deleteManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
): Promise<void> {
  await call('deleteManagedRecord', {
    kind: collectionName,
    id: recordId,
  });
}
