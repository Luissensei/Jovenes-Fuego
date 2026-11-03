import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/client';

export type FollowupStatus = 'Pendiente' | 'En proceso' | 'Completado';
export type VisitorStatus = 'Nuevo' | 'Contactado' | 'Integrado';

export type FollowupRecord = {
  id: string;
  name: string;
  date: string;
  reason: string;
  notes: string;
  status: FollowupStatus;
  createdAt: string;
};

export type FollowupInput = Omit<FollowupRecord, 'id' | 'status' | 'createdAt'>;

export type VisitorRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  source: string;
  notes: string;
  status: VisitorStatus;
  createdAt: string;
};

export type VisitorInput = Omit<VisitorRecord, 'id' | 'status' | 'createdAt'>;

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getFollowups(): Promise<FollowupRecord[]> {
  const result = await call<{items: FollowupRecord[]}>('getFollowups');
  return Array.isArray(result.items) ? result.items : [];
}

export async function createFollowup(input: FollowupInput): Promise<string> {
  const result = await call<{success: boolean; id: string}>('createFollowup', input);
  return result.id;
}

export async function updateFollowupStatus(id: string, status: FollowupStatus): Promise<void> {
  await call('updateFollowupStatus', {id, status});
}

export async function deleteFollowup(id: string): Promise<void> {
  await call('deleteFollowup', {id});
}

export async function getVisitors(): Promise<VisitorRecord[]> {
  const result = await call<{items: VisitorRecord[]}>('getVisitors');
  return Array.isArray(result.items) ? result.items : [];
}

export async function createVisitor(input: VisitorInput): Promise<string> {
  const result = await call<{success: boolean; id: string}>('createVisitor', input);
  return result.id;
}

export async function updateVisitorStatus(id: string, status: VisitorStatus): Promise<void> {
  await call('updateVisitorStatus', {id, status});
}

export async function deleteVisitor(id: string): Promise<void> {
  await call('deleteVisitor', {id});
}
