import {httpsCallable} from 'firebase/functions';

import {functions} from './firebase/client';
import {cachedRequest, invalidateRequestCache} from './requestCache';

export type AttendanceStatus = 'Presente' | 'Tarde' | 'Falta' | 'Justificada' | 'Ausente';

export type AttendanceParticipant = {
  memberId: string;
  name: string;
  status: AttendanceStatus;
};

export type CreateMeetingInput = {
  name: string;
  date: string;
};

export type CreateMeetingResult = {
  success: boolean;
  meetingId: string;
};

export type AttendanceMeeting = {
  id: string;
  name: string;
  date: string;
  createdAt: string;
  participants: AttendanceParticipant[];
};

const validStatuses = new Set<AttendanceStatus>([
  'Presente',
  'Ausente',
  'Tarde',
  'Falta',
  'Justificada',
]);

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export function listAttendanceMeetings(
  module: 'attendance' | 'reports' = 'attendance',
): Promise<AttendanceMeeting[]> {
  return cachedRequest(`attendance-meetings:${module}`, 10_000, async () => {
    const response = await call<{meetings: AttendanceMeeting[]}>(
      'getAttendanceMeetings',
      {module},
    );
    return Array.isArray(response.meetings) ? response.meetings : [];
  });
}

export async function createAttendanceMeeting(
  data: CreateMeetingInput,
): Promise<CreateMeetingResult> {
  const name = data.name.trim();
  const date = data.date.trim();
  if (!name || !date) {
    throw new Error('Debes indicar el nombre y la fecha.');
  }

  const result = await call<CreateMeetingResult>('createAttendanceMeeting', {name, date});
  invalidateRequestCache('attendance-meetings:attendance');
  invalidateRequestCache('attendance-meetings:reports');
  return result;
}

export async function saveMeetingAttendance(
  meetingId: string,
  participants: AttendanceParticipant[],
): Promise<void> {
  if (!meetingId.trim()) {
    throw new Error('Debes seleccionar una reunión.');
  }
  if (participants.length > 500) {
    throw new Error('La reunión supera el límite de 500 participantes.');
  }

  const uniqueIds = new Set(participants.map((participant) => participant.memberId));
  if (uniqueIds.size !== participants.length) {
    throw new Error('Hay jóvenes duplicados en la asistencia.');
  }

  for (const participant of participants) {
    if (
      !participant.memberId.trim() ||
      !participant.name.trim() ||
      !validStatuses.has(participant.status)
    ) {
      throw new Error('Hay información inválida en la asistencia.');
    }
  }

  await call<{success: boolean}>('saveMeetingAttendance', {
    meetingId,
    participants,
  });
  invalidateRequestCache('attendance-meetings:attendance');
  invalidateRequestCache('attendance-meetings:reports');
}
