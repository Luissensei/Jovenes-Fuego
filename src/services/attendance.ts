
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebase/client';

export type AttendanceStatus =
  | 'Presente'
  | 'Ausente'
  | 'Justificado';

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

function isValidStatus(status: unknown): status is AttendanceStatus {
  return (
    status === 'Presente' ||
    status === 'Ausente' ||
    status === 'Justificado'
  );
}

function parseParticipants(data: unknown): AttendanceParticipant[] {
  if (!Array.isArray(data)) return [];

  return data.filter((item): item is AttendanceParticipant => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.memberId === 'string' &&
      typeof item.name === 'string' &&
      isValidStatus(item.status)
    );
  });
}

// Crear reunión
export async function createAttendanceMeeting(
  data: CreateMeetingInput,
): Promise<CreateMeetingResult> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const name = data.name.trim();
  const date = data.date.trim();

  if (!name || !date) {
    throw new Error('Debes indicar el nombre y la fecha.');
  }

  const meeting = await addDoc(collection(db, 'attendance'), {
    name,
    date,
    createdAt: Timestamp.now(),
    participants: [],
  });

  return {
    success: true,
    meetingId: meeting.id,
  };
}

// Escuchar reuniones guardadas
export function subscribeAttendanceMeetings(
  callback: (meetings: AttendanceMeeting[]) => void,
  onError?: (error: Error) => void,
) {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const meetingsQuery = query(
    collection(db, 'attendance'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    meetingsQuery,
    (snapshot) => {
      const meetings = snapshot.docs.map((document) => {
        const data = document.data();

        return {
          id: document.id,
          name: String(data.name ?? ''),
          date: String(data.date ?? ''),
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : '',
          participants: parseParticipants(data.participants),
        };
      });

      callback(meetings);
    },
    (error) => onError?.(error),
  );
}

// Guardar los estados de asistencia
export async function saveMeetingAttendance(
  meetingId: string,
  participants: AttendanceParticipant[],
): Promise<void> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  if (!meetingId) {
    throw new Error('Debes seleccionar una reunión.');
  }

  if (participants.length > 500) {
    throw new Error('La reunión supera el límite de 500 participantes.');
  }

  const uniqueIds = new Set(
    participants.map((participant) => participant.memberId),
  );

  if (uniqueIds.size !== participants.length) {
    throw new Error('Hay jóvenes duplicados en la asistencia.');
  }

  for (const participant of participants) {
    if (
      !participant.memberId ||
      !participant.name.trim() ||
      !isValidStatus(participant.status)
    ) {
      throw new Error('Hay información inválida en la asistencia.');
    }
  }

  await updateDoc(
    doc(db, 'attendance', meetingId),
    {
      participants,
    },
  );
}
