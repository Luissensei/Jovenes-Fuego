import {httpsCallable} from 'firebase/functions';
import {assertFirebaseWritesAllowed, functions} from './firebase/client';

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
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const loadHallOfFame = httpsCallable<
    Record<string, never>,
    {
      topPlayers: HallOfFamePlayer[];
      faithful: FaithfulPlayer[];
      attendanceLimited: boolean;
    }
  >(functions, 'getPublicHallOfFame');
  const response = await loadHallOfFame({});
  return {
    topPlayers: Array.isArray(response.data.topPlayers) ? response.data.topPlayers : [],
    faithful: Array.isArray(response.data.faithful) ? response.data.faithful : [],
    attendanceLimited: response.data.attendanceLimited === true,
  };
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
  module: 'members' | 'attendance' | 'checkins' | 'reports' | 'followups' = 'members',
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
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  if (!memberId.trim()) throw new Error('Selecciona un joven válido.');

  const updateMember = httpsCallable<
    {memberId: string; patch: AdminMemberPatch},
    {success: boolean; memberId: string}
  >(functions, 'adminUpdateMember');

  const response = await updateMember({memberId: memberId.trim(), patch});
  if (!response.data.success || response.data.memberId !== memberId.trim()) {
    throw new Error('No se pudo confirmar la actualización de la ficha.');
  }
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

/** Guarda la apariencia a través de una función que valida el perfil y el saldo de Llamas. */
