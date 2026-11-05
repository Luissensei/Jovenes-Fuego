import {httpsCallable} from 'firebase/functions';
import {functions} from '../firebase/client';

export type CheckinRecord = {
  id: string;
  memberId: string;
  memberName: string;
  meetingName: string;
  date: string;
  createdAt: string;
};

async function call<TResponse, TPayload = Record<string, never>>(
  name: string,
  payload: TPayload,
): Promise<TResponse> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const callable = httpsCallable<TPayload, TResponse>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function listCheckins(): Promise<CheckinRecord[]> {
  const response = await call<{checkins: CheckinRecord[]}>('listCheckins', {});
  return Array.isArray(response.checkins) ? response.checkins : [];
}

export async function createCheckin(data: {
  memberId: string;
  memberName: string;
  meetingName: string;
  date: string;
}): Promise<string> {
  const response = await call<
    {success: boolean; id: string; memberName: string},
    {memberId: string; meetingName: string; date: string}
  >('createCheckin', {
    memberId: data.memberId.trim(),
    meetingName: data.meetingName.trim(),
    date: data.date.trim(),
  });
  return response.id;
}
