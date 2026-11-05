import {httpsCallable} from 'firebase/functions';

import {assertFirebaseWritesAllowed, functions} from '../firebase/client';

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
  editable?: boolean;
  [key: string]: unknown;
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

/** Lista registros usando autorización y consulta en el servidor. */
export async function listManagedRecords(
  collectionName: ManagedCollection,
): Promise<ManagedRecord[]> {
  const response = await call<
    {module: string},
    {records: ManagedRecord[]}
  >('adminListManagedRecords', {module: collectionName});
  return Array.isArray(response.records) ? response.records : [];
}

export async function createManagedRecord(
  collectionName: ManagedCollection,
  data: Record<string, string>,
): Promise<string> {
  assertFirebaseWritesAllowed();
  const {status, ...record} = data;
  const response = await call<
    {module: string; record: Record<string, string>; status: string},
    {success: boolean; id: string}
  >('adminCreateManagedRecord', {
    module: collectionName,
    record,
    status: status ?? '',
  });
  if (!response.success || !response.id) {
    throw new Error('No se pudo confirmar la creación del registro.');
  }
  return response.id;
}

export async function updateManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
  data: Record<string, string>,
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!recordId.trim()) throw new Error('Selecciona un registro válido.');
  const response = await call<
    {module: string; id: string; record: Record<string, string>},
    {success: boolean}
  >('adminUpdateManagedRecord', {
    module: collectionName,
    id: recordId.trim(),
    record: data,
  });
  if (!response.success) throw new Error('No se pudo confirmar la actualización.');
}

export async function updateManagedRecordStatus(
  collectionName: ManagedCollection,
  recordId: string,
  status: string,
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!recordId.trim() || !status.trim()) {
    throw new Error('El registro y el estado son obligatorios.');
  }
  const response = await call<
    {module: string; id: string; status: string},
    {success: boolean}
  >('adminUpdateManagedRecordStatus', {
    module: collectionName,
    id: recordId.trim(),
    status: status.trim(),
  });
  if (!response.success) throw new Error('No se pudo confirmar el cambio de estado.');
}

export async function deleteManagedRecord(
  collectionName: ManagedCollection,
  recordId: string,
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!recordId.trim()) throw new Error('Selecciona un registro válido.');
  const response = await call<
    {module: string; id: string},
    {success: boolean}
  >('adminDeleteManagedRecord', {
    module: collectionName,
    id: recordId.trim(),
  });
  if (!response.success) throw new Error('No se pudo confirmar la eliminación.');
}
