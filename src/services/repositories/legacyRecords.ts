import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

import {db} from '../firebase/client';

export type LegacyFollowupRecord = {
  id: string;
  name: string;
  date: string;
  reason: string;
  notes: string;
  status: 'Pendiente' | 'En proceso' | 'Completado';
};

export type LegacyVisitorRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  source: string;
  notes: string;
  status: 'Nuevo' | 'Contactado' | 'Integrado';
};

function legacyDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }
  return '';
}

/** Adapta el esquema histórico followups/{id}: m,d,t,n,c,u. */
export async function getLegacyFollowups(): Promise<LegacyFollowupRecord[]> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  const [followupsSnapshot, membersSnapshot] = await Promise.all([
    getDocs(collection(db, 'followups')),
    getDocs(collection(db, 'members')),
  ]);

  const names = new Map(
    membersSnapshot.docs.map((item) => [
      item.id,
      String(item.data().name ?? item.id),
    ]),
  );

  return followupsSnapshot.docs.map((item) => {
    const data = item.data();
    const memberId = String(data.m ?? '');
    const date = legacyDate(data.d) || legacyDate(data.c);

    return {
      id: item.id,
      name: (names.get(memberId) ?? memberId) || 'Joven sin nombre',
      date,
      reason: String(data.t ?? 'Seguimiento'),
      notes: String(data.n ?? ''),
      // Los registros originales son seguimientos ya realizados, no tareas
      // pendientes; no se inventa un estado desde la fecha.
      status: 'Completado',
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

/** Adapta el esquema histórico visitors/{id}: name,phone,created,vs,st,by. */
export async function getLegacyVisitors(): Promise<LegacyVisitorRecord[]> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');

  const snapshot = await getDocs(collection(db, 'visitors'));

  return snapshot.docs.map((item) => {
    const data = item.data();
    const visits = Array.isArray(data.vs) ? data.vs : [];
    const originalStatus = String(data.st ?? '');

    return {
      id: item.id,
      name: String(data.name ?? ''),
      phone: String(data.phone ?? ''),
      email: '',
      date: legacyDate(data.created),
      source: String(data.by ?? ''),
      notes: visits.length
        ? `Visitas registradas: ${visits.length}`
        : '',
      status: originalStatus === 'miembro'
        ? 'Integrado'
        : visits.length > 1
          ? 'Contactado'
          : 'Nuevo',
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
