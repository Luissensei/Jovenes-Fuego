import {httpsCallable} from 'firebase/functions';

import {assertFirebaseWritesAllowed, functions} from '../firebase/client';
import {listLeaders, type LeaderRecord} from '../leaders';

export type ManagementRecord = Record<string, unknown> & {id: string};

async function call<TRequest, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function listManagementRecords(
  kind: 'bonus' | 'pastoral' | 'leaders' | 'audit' | 'settings',
): Promise<ManagementRecord[]> {
  if (kind === 'leaders') {
    const leaders = await listLeaders();
    return leaders.map((item: LeaderRecord) => ({
      ...item,
      id: item.id,
    }));
  }

  const endpoints = {
    bonus: 'adminListBonusRecords',
    pastoral: 'adminListPastoralNotes',
    audit: 'adminListAuditRecords',
    settings: 'adminListSettings',
  } as const;
  const response = await call<
    Record<string, never>,
    {records: ManagementRecord[]}
  >(endpoints[kind], {});
  return Array.isArray(response.records) ? response.records : [];
}

export async function createBonusRecord(input: {
  memberId: string;
  reason: string;
  points: number;
}): Promise<string> {
  assertFirebaseWritesAllowed();
  const response = await call<
    {memberId: string; reason: string; points: number},
    {success: boolean; id: string}
  >('adminCreateBonusRecord', {
    memberId: input.memberId.trim(),
    reason: input.reason.trim(),
    points: input.points,
  });
  if (!response.success || !response.id) throw new Error('No se pudo confirmar el registro de puntos.');
  return response.id;
}

export async function createPastoralNote(input: {
  memberId: string;
  title: string;
  note: string;
}): Promise<string> {
  assertFirebaseWritesAllowed();
  const response = await call<
    {memberId: string; title: string; note: string},
    {success: boolean; id: string}
  >('adminCreatePastoralNote', {
    memberId: input.memberId.trim(),
    title: input.title.trim(),
    note: input.note.trim(),
  });
  if (!response.success || !response.id) throw new Error('No se pudo confirmar la nota pastoral.');
  return response.id;
}

export async function saveManagementSetting(input: {
  key: string;
  value: string;
}): Promise<void> {
  assertFirebaseWritesAllowed();
  const response = await call<
    {key: string; value: string},
    {success: boolean; key: string}
  >('adminSaveSetting', {key: input.key.trim(), value: input.value.trim()});
  if (!response.success) throw new Error('No se pudo confirmar el ajuste.');
}
