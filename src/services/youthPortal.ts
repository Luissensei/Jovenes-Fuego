import {doc, getDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';

import {db, functions} from './firebase/client';

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
  requester: string;
  category: string;
  message: string;
};

export type AdminMemberPatch = {
  name?: string;
  nick?: string;
  phone?: string;
  from?: string;
  bd?: string;
  ap?: string;
  br?: string;
  mn?: string;
  nt?: string;
  con?: string;
  dis?: string;
  pic?: string;
  ac?: boolean;
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

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error(
      'Esta operación todavía requiere Firebase Functions y no está habilitada en el modo de solo lectura.',
    );
  }

  const callable = httpsCallable<unknown, T>(functions, name);
  const result = await callable(payload);
  return result.data;
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
      description: '',
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
  const result = await call<{activities: WeeklyActivity[]}>(
    'adminListWeeklyActivities',
  );
  return result.activities ?? [];
}

export async function saveWeeklyActivity(
  activity: Omit<WeeklyActivity, 'id'> & {id?: string},
): Promise<void> {
  await call<{success: boolean; id: string}>(
    'adminSaveWeeklyActivity',
    activity,
  );
}

export async function sendPrayerRequest(
  input: PrayerRequestInput,
): Promise<void> {
  await call<{success: boolean; id: string}>(
    'submitPublicPrayerRequest',
    input,
  );
}

export async function getMembersForAdministration(): Promise<MemberAdminRecord[]> {
  const result = await call<{members: MemberAdminRecord[]}>(
    'getPrivateMembers',
  );
  return result.members ?? [];
}

export async function updateMemberForAdministration(
  memberId: string,
  patch: AdminMemberPatch,
): Promise<void> {
  await call('adminUpdateMember', {memberId, patch});
}

export async function getPrayerRequestsForAdministration(): Promise<AdminPrayerRequest[]> {
  const result = await call<{petitions: AdminPrayerRequest[]}>(
    'adminGetPrayerRequests',
  );
  return result.petitions ?? [];
}

export async function updatePrayerRequestStatus(
  id: string,
  status: string,
): Promise<void> {
  await call('adminUpdatePrayerStatus', {id, status});
}
