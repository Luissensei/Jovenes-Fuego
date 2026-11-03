import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/client';

export type ManagementKind = 'bonus' | 'pastoral' | 'leaders' | 'audit' | 'settings';
export type ManagementRecord = Record<string, unknown> & {id: string};

async function call<T>(name: string, payload: unknown): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getManagementData(kind: ManagementKind): Promise<ManagementRecord[]> {
  const result = await call<{items: ManagementRecord[]}>('getManagementData', {kind});
  return Array.isArray(result.items) ? result.items : [];
}

export async function createManagementRecord(
  kind: ManagementKind,
  data: Record<string, string | number>,
): Promise<void> {
  await call<{success: boolean}>('createManagementRecord', {kind, data});
}
