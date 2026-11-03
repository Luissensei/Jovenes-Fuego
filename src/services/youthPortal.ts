import {collection, doc, getDoc, getDocs, runTransaction, setDoc, updateDoc} from 'firebase/firestore';

import {db} from './firebase/client';

export type WeeklyActivity = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  published: boolean;
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
  const ranking = await getLegacyPublicRanking();
  const events = Array.isArray(ranking?.ev) ? ranking.ev : [];

  return events.flatMap((event, index) => {
    const title = typeof event.t === 'string' ? event.t.trim() : '';
    const date = typeof event.d === 'string' ? event.d : '';

    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

    return [{
      id: `legacy-event-${index}-${date}`,
      title,
      description: typeof event.n === 'string' ? event.n : '',
      date,
      time: typeof event.h === 'string' ? event.h : '',
      location: typeof event.p === 'string' ? event.p : '',
      published: true,
    }];
  });
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
    .slice(0, 10);

  return {topPlayers, faithful, attendanceLimited: false};
}

export async function getAdminWeeklyActivities(): Promise<WeeklyActivity[]> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const snapshot = await getDocs(collection(db, 'events'));
  const items = snapshot.docs.flatMap((item) => {
    const data = item.data();
    const title = typeof data.t === 'string' ? data.t.trim() : '';
    const date = typeof data.d === 'string' ? data.d : '';
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [{
      id: item.id,
      title,
      description: typeof data.n === 'string' ? data.n : '',
      date,
      time: typeof data.h === 'string' ? data.h : '',
      location: typeof data.p === 'string' ? data.p : '',
      published: data.published !== false,
    }];
  });
  if (items.length) return items.sort((a, b) => a.date.localeCompare(b.date));
  return getWeeklyActivities();
}

export async function saveWeeklyActivity(
  activity: Omit<WeeklyActivity, 'id'> & {id?: string},
): Promise<void> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const payload = {
    t: activity.title.trim(),
    d: activity.date,
    h: activity.time.trim(),
    p: activity.location.trim(),
    n: activity.description.trim(),
    published: activity.published,
  };
  const isNewEvent = !activity.id || activity.id.startsWith('legacy-event-');
  const eventRef = !isNewEvent
    ? doc(db, 'events', activity.id as string)
    : doc(collection(db, 'events'));
  const rankingRef = doc(db, 'public', 'ranking');

  // Guardamos el evento y su publicación pública en una sola transacción,
  // sin reemplazar el resto del documento de ranking.
  await runTransaction(db, async (transaction) => {
    const previousEvent = isNewEvent ? null : await transaction.get(eventRef);
    const oldData = previousEvent?.exists() ? previousEvent.data() : null;
    const rankingSnapshot = await transaction.get(rankingRef);
    if (!rankingSnapshot.exists()) {
      throw new Error('No existe public/ranking para publicar actividades.');
    }
    const current = rankingSnapshot.data();
    const currentEvents = Array.isArray(current.ev)
      ? current.ev.filter((entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object')
      : [];
    const nextEvents = currentEvents.filter((entry) => {
      const matchesPrevious = oldData
        && entry.t === oldData.t && entry.d === oldData.d;
      const matchesCurrent = entry.t === payload.t && entry.d === payload.d;
      return !matchesPrevious && !matchesCurrent;
    });
    if (activity.published) {
      nextEvents.push({
        t: payload.t,
        d: payload.d,
        h: payload.h,
        p: payload.p,
        n: payload.n,
      });
    }
    transaction.set(eventRef, isNewEvent ? {...payload, cf: {}, pg: {}, q: 0} : payload, {merge: true});
    transaction.update(rankingRef, {ev: nextEvents, u: Date.now()});
  });
}

export async function sendPrayerRequest(input: PrayerRequestInput): Promise<void> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const memberId = input.memberId.trim();
  const requester = input.requester.trim().slice(0, 59) || 'Anónimo';
  const message = input.message.trim();
  const category = input.category.trim().slice(0, 40) || 'General';
  if (!memberId || memberId.length >= 40 || memberId.startsWith('public-profile-')) {
    throw new Error('Este perfil no está vinculado a un registro de joven válido.');
  }
  if (message.length < 3 || message.length > 500) {
    throw new Error('La petición debe tener entre 3 y 500 caracteres.');
  }
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const id = `i${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  await setDoc(doc(db, 'inbox', id), {
    k: 'p',
    i: memberId,
    n: requester,
    t: `[${category}] ${message}`.slice(0, 600),
    d: date,
    c: Date.now(),
  });
}

export async function getMembersForAdministration(): Promise<MemberAdminRecord[]> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  // El directorio original vive directamente en members; no depende de
  // Firebase Functions, que no están desplegadas en el proyecto original.
  const snapshot = await getDocs(collection(db, 'members'));
  return snapshot.docs.map((item) => ({
    ...(item.data() as AdminMemberPatch),
    id: item.id,
  }));
}

export async function updateMemberForAdministration(
  memberId: string,
  patch: AdminMemberPatch,
): Promise<void> {
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const memberRef = doc(db, 'members', memberId);
  const photoRef = doc(db, 'photos', memberId);
  const photo = typeof patch.pic === 'string' ? patch.pic : null;
  const validJpeg = photo !== null
    && /^data:image\\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)
    && photo.length < 60000;
  if (photo?.startsWith('data:image/') && !validJpeg) {
    throw new Error('La fotografía debe ser JPEG y pesar menos de 60 KB después de comprimirla.');
  }

  await runTransaction(db, async (transaction) => {
    const existingPhoto = photo !== null ? await transaction.get(photoRef) : null;
    transaction.update(memberRef, patch);
    if (validJpeg || photo === '') {
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
  if (!db) throw new Error('Firebase Firestore no está configurado.');
  const snapshot = await getDocs(collection(db, 'inbox'));
  return snapshot.docs.flatMap((item) => {
    const data = item.data();
    if (data.k !== 'p') return [];
    const raw = typeof data.t === 'string' ? data.t : '';
    const categoryMatch = raw.match(/^\[([^\]]{1,40})\]\s*/);
      const timestamp = typeof data.c === 'number' && Number.isFinite(data.c)
      ? new Date(data.c).toISOString()
      : typeof data.d === 'string' ? data.d : '';
    return [{
      id: item.id,
      requester: typeof data.n === 'string' ? data.n : 'Anónimo',
      category: categoryMatch?.[1] ?? 'General',
      message: categoryMatch ? raw.slice(categoryMatch[0].length) : raw,
      status: 'Pendiente',
      createdAt: timestamp,
    }];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePrayerRequestStatus(
  id: string,
  status: string,
): Promise<void> {
  void id; void status;
  throw new Error('La bandeja de entrada original permite recibir y consultar peticiones, pero sus reglas no permiten cambiarles el estado.');
}

/** Guarda la personalización en photos/{memberId}, siguiendo el esquema y las reglas históricas. */
export async function saveYouthProfileAppearance(
  memberId: string,
  appearance: YouthProfileAppearance,
): Promise<void> {
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
