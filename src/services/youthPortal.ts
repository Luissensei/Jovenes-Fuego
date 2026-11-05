import {doc, getDoc, runTransaction, setDoc, updateDoc} from 'firebase/firestore';

import {httpsCallable} from 'firebase/functions';
import {assertFirebaseWritesAllowed, db, functions} from './firebase/client';

export type WeeklyActivity = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  published: boolean;
  editable?: boolean;
};

export type HallOfFamePlayer = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

export type FaithfulPlayer = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  attendances: number;
};

export type PrayerRequestInput = {
  memberId: string;
  requester: string;
  category: string;
  message: string;
};

export type YouthProfileAppearance = {
  frame: string;
  avatar: string;
  background: string;
  title: string;
  ownedItems: string[];
  flames: number;
};

export type AdminMemberPatch = {
  name?: string;
  nick?: string;
  phone?: string;
  from?: string;
  bd?: string;
  ap?: string;
  bau?: string;
  br?: string;
  mn?: string;
  nt?: string;
  con?: string;
  dis?: string;
  pic?: string;
  ac?: string;
  nopub?: boolean;
};

export type MemberAdminRecord = AdminMemberPatch & {
  id: string;
  [key: string]: unknown;
};

export type AdminPrayerRequest = {
  id: string;
  requester: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
};

type LegacyPublicRanking = {
  off?: boolean;
  ev?: Array<Record<string, unknown>>;
  top?: Array<Record<string, unknown>>;
  fiel?: Array<Record<string, unknown>>;
};

async function getLegacyPublicRanking(): Promise<LegacyPublicRanking | null> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  const snapshot = await getDoc(doc(db, 'public', 'ranking'));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  if (data.off === true) return null;

  return data as LegacyPublicRanking;
}

/**
 * Reads upcoming activities already published by the original app.
 */
export async function getWeeklyActivities(): Promise<WeeklyActivity[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const loadActivities = httpsCallable<
    Record<string, never>,
    {activities: WeeklyActivity[]}
  >(functions, 'getPublicWeeklyActivities');
  const response = await loadActivities({});
  return Array.isArray(response.data.activities)
    ? response.data.activities.map((item) => ({
      ...item,
      editable: item.editable === true,
    }))
    : [];
}

/**
 * Reads public points and service streaks published by the original app.
 */
export async function getHallOfFame(): Promise<{
  topPlayers: HallOfFamePlayer[];
  faithful: FaithfulPlayer[];
  attendanceLimited: boolean;
}> {
  const ranking = await getLegacyPublicRanking();

  const topPlayers = (Array.isArray(ranking?.top) ? ranking.top : [])
    .flatMap((item, index) => {
      const name = typeof item.n === 'string' ? item.n.trim() : '';
      if (!name) return [];

      const points = Number(item.t ?? 0);
      return [{
        id: `legacy-top-${index}-${name}`,
        name,
        nick: '',
        pic: '',
        points: Number.isFinite(points) && points >= 0 ? points : 0,
      }];
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  const faithful = (Array.isArray(ranking?.fiel) ? ranking.fiel : [])
    .flatMap((item, index) => {
      const name = typeof item.n === 'string' ? item.n.trim() : '';
      if (!name) return [];

      const streak = Number(item.s ?? 0);
      return [{
        id: `legacy-faithful-${index}-${name}`,
        name,
        nick: '',
        pic: '',
        attendances: Number.isFinite(streak) && streak >= 0
          ? streak
          : 0,
      }];
    })
    .sort((a, b) => b.attendances - a.attendances)
    .slice(0, 10);

  return {topPlayers, faithful, attendanceLimited: false};
}

export async function getAdminWeeklyActivities(): Promise<WeeklyActivity[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const loadActivities = httpsCallable<
    Record<string, never>,
    {activities: WeeklyActivity[]}
  >(functions, 'adminListWeeklyActivities');
  const response = await loadActivities({});
  return Array.isArray(response.data.activities)
    ? response.data.activities.map((item) => ({
      ...item,
      editable: item.editable === true,
    }))
    : [];
}

export async function saveWeeklyActivity(
  activity: Omit<WeeklyActivity, 'id'> & {id?: string},
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!functions) throw new Error('Firebase Functions no está configurado.');

  const saveActivity = httpsCallable<
    {
      id?: string;
      title: string;
      description: string;
      date: string;
      time: string;
      location: string;
      published: boolean;
    },
    {success: boolean; id: string}
  >(functions, 'adminSaveWeeklyActivity');

  const payload = {
    title: activity.title.trim(),
    description: activity.description.trim(),
    date: activity.date,
    time: activity.time.trim(),
    location: activity.location.trim(),
    published: activity.published,
    ...(activity.id && activity.editable === true ? {id: activity.id} : {}),
  };
  const response = await saveActivity(payload);
  if (!response.data.success || !response.data.id) {
    throw new Error('No se pudo confirmar el guardado de la actividad.');
  }
}

export async function sendPrayerRequest(input: PrayerRequestInput): Promise<void> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const memberId = input.memberId.trim();
  const requester = input.requester.trim().slice(0, 59) || 'Anónimo';
  const message = input.message.trim();
  const category = input.category.trim().slice(0, 40) || 'General';

  if (!memberId || memberId.length >= 40 || memberId.startsWith('public-profile-')) {
    throw new Error('Este perfil no está vinculado a un registro de joven válido.');
  }
  if (message.length < 8 || message.length > 1200) {
    throw new Error('La petición debe tener entre 8 y 1200 caracteres.');
  }

  const submitRequest = httpsCallable<
    {memberId: string; requester: string; category: string; message: string},
    {success: boolean; id: string}
  >(functions, 'submitPublicPrayerRequest');
  const response = await submitRequest({memberId, requester, category, message});
  if (!response.data.success || !response.data.id) {
    throw new Error('No se pudo confirmar el envío de la petición.');
  }
}

export async function getMembersForAdministration(
  module: 'members' | 'attendance' | 'checkins' = 'members',
): Promise<MemberAdminRecord[]> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado.');
  }

  // Las fichas privadas se consultan en el servidor: las reglas de Firestore
  // no deben permitir que el navegador descargue el directorio completo.
  const loadMembers = httpsCallable<{module: string}, {members: MemberAdminRecord[]}>(
    functions,
    'getPrivateMembers',
  );
  const response = await loadMembers({module});
  return Array.isArray(response.data.members)
    ? response.data.members.map((member) => ({
      ...member,
      id: String(member.id ?? ''),
      pic: typeof member.pic === 'string' ? member.pic : '',
    })).filter((member) => member.id)
    : [];
}

export async function updateMemberForAdministration(
  memberId: string,
  patch: AdminMemberPatch,
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const memberRef = doc(db, 'members', memberId);
  const photoRef = doc(db, 'photos', memberId);
  const photo = typeof patch.pic === 'string' ? patch.pic : null;
  const validJpeg = photo !== null
    && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)
    && photo.length < 60000;
  const syncPhoto = validJpeg || photo === '';
  await runTransaction(db, async (transaction) => {
    const existingPhoto = syncPhoto ? await transaction.get(photoRef) : null;
    transaction.update(memberRef, patch);
    if (syncPhoto) {
      const values = {
        p: photo ?? '',
        c: Date.now(),
      };
      if (existingPhoto?.exists()) {
        transaction.update(photoRef, values);
      } else {
        transaction.set(photoRef, {
          p: values.p, f: '', a: '', b: '', t: '', u: [], w: 0, c: values.c,
        });
      }
    }
  });
}

export async function getPrayerRequestsForAdministration(): Promise<AdminPrayerRequest[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const loadRequests = httpsCallable<
    Record<string, never>,
    {petitions: AdminPrayerRequest[]}
  >(functions, 'adminGetPrayerRequests');
  const response = await loadRequests({});
  return Array.isArray(response.data.petitions)
    ? response.data.petitions.map((item) => ({
      ...item,
      id: String(item.id ?? ''),
      requester: String(item.requester ?? 'Anónimo'),
      category: String(item.category ?? 'General'),
      message: String(item.message ?? ''),
      status: String(item.status ?? 'Pendiente'),
      createdAt: String(item.createdAt ?? ''),
    })).filter((item) => item.id)
    : [];
}

export async function updatePrayerRequestStatus(
  id: string,
  status: string,
): Promise<void> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const updateRequest = httpsCallable<
    {id: string; status: string},
    {success: boolean}
  >(functions, 'adminUpdatePrayerStatus');
  const response = await updateRequest({id, status});
  if (!response.data.success) {
    throw new Error('No se pudo confirmar la actualización del estado.');
  }
}

/** Guarda la personalización en photos/{memberId}, siguiendo el esquema y las reglas históricas. */
export async function saveYouthProfileAppearance(
  memberId: string,
  appearance: YouthProfileAppearance,
): Promise<void> {
  assertFirebaseWritesAllowed();
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  if (!memberId || memberId.length >= 40 || memberId.startsWith('public-profile-')) {
    throw new Error('Este perfil no está vinculado a un registro de joven válido.');
  }
  const photoRef = doc(db, 'photos', memberId);
  const existing = await getDoc(photoRef);
  const values = {
    f: appearance.frame,
    a: appearance.avatar,
    b: appearance.background,
    t: appearance.title,
    u: appearance.ownedItems.slice(0, 400),
    w: Math.max(0, Math.min(100000, appearance.flames)),
    c: Date.now(),
  };
  if (existing.exists()) {
    await updateDoc(photoRef, values);
  } else {
    await setDoc(photoRef, {p: '', ...values});
  }
}
