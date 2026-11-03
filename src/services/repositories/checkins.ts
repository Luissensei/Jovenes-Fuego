import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

export type CheckinRecord = {
  id: string;
  memberId: string;
  memberName: string;
  meetingName: string;
  date: string;
  createdAt: string;
};

export type CreateCheckinInput = {
  memberId: string;
  meetingName: string;
  date: string;
};

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function getCheckins(): Promise<CheckinRecord[]> {
  const result = await call<{items: CheckinRecord[]}>('getCheckins');
  return Array.isArray(result.items) ? result.items : [];
}

export async function createCheckin(data: CreateCheckinInput): Promise<void> {
  const memberId = data.memberId.trim();
  const meetingName = data.meetingName.trim();
  const date = data.date.trim();
  if (!memberId || !meetingName || !date) {
    throw new Error('Selecciona un joven, nombre de servicio y fecha.');
  }
  await call<{success: boolean}>('createCheckin', {
    memberId,
    meetingName,
    date,
  });
}
