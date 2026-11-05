import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';

import {db, functions} from './firebase/client';

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

function parseParticipants(value: unknown): AttendanceParticipant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): AttendanceParticipant[] => {
    if (!item || typeof item !== 'object') return [];

    const row = item as Record<string, unknown>;
    const memberId = typeof row.memberId === 'string'
      ? row.memberId.trim()
      : '';
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const status = row.status;

    if (
      !memberId ||
      !name ||
      typeof status !== 'string' ||
      !validStatuses.has(status as AttendanceStatus)
    ) {
      return [];
    }

    return [{
      memberId,
      name,
      status: status as AttendanceStatus,
    }];
  });
}

function parseCreatedAt(value: unknown): string {
  if (typeof value === 'string') return value;

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return '';
}

/**
 * Subscribes to the new attendance meeting collection without a callable
 * Function. Production read-only navigation does not expose the reports page.
 */
export function subscribeAttendanceMeetings(
  onData: (meetings: AttendanceMeeting[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const meetingsQuery = query(
    collection(db, 'attendanceMeetings'),
    orderBy('date', 'desc'),
    limit(300),
  );

  return onSnapshot(
    meetingsQuery,
    (snapshot) => {
      const meetings = snapshot.docs.map((meetingDoc) => {
        const data = meetingDoc.data();

        return {
          id: meetingDoc.id,
          name: typeof data.name === 'string' ? data.name : '',
          date: typeof data.date === 'string' ? data.date : '',
          createdAt: parseCreatedAt(data.createdAt),
          participants: parseParticipants(data.participants),
        };
      });

      onData(meetings);
    },
    (cause) => {
      onError(
        cause instanceof Error
          ? cause
          : new Error('No se pudieron consultar las reuniones.'),
      );
    },
  );
}

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const response = await callable(payload);
  return response.data;
}

export async function listAttendanceMeetings(): Promise<AttendanceMeeting[]> {
  const response = await call<{meetings: AttendanceMeeting[]}>('getAttendanceMeetings');
  return Array.isArray(response.meetings) ? response.meetings : [];
}

export async function createAttendanceMeeting(
  data: CreateMeetingInput,
): Promise<CreateMeetingResult> {
  const name = data.name.trim();
  const date = data.date.trim();
  if (!name || !date) {
    throw new Error('Debes indicar el nombre y la fecha.');
  }

  return call<CreateMeetingResult>('createAttendanceMeeting', {name, date});
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
}
