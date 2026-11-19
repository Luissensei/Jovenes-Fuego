import {httpsCallable} from './firebase/functionsShim';
import {assertFirebaseWritesAllowed, auth, functions} from './firebase/client';
import {cachedRequest, invalidateRequestCache} from './requestCache';


import type {PublicProfile} from "./publicProfiles";
export type YouthPinStatus={configured:boolean;activationPending:boolean};
export type YouthPinAdminRecord={id:string;name:string;configured:boolean;activationPending:boolean;locked:boolean;configuredAt:string};
async function youthPinCall<I,O>(name:string,input:I):Promise<O>{if(!functions)throw new Error("El backend de Firebase no está configurado.");const r=await httpsCallable<I,O>(functions,name)(input);return r.data;}
export async function getYouthProfilePinStatus(memberId:string):Promise<YouthPinStatus>{return youthPinCall("getYouthProfilePinStatus",{memberId});}
export type YouthCommunitySession = {profile: PublicProfile; communitySession: string};
export async function activateYouthProfilePin(memberId:string,activationPin:string,newPin:string):Promise<YouthCommunitySession>{return youthPinCall<{memberId:string;activationPin:string;newPin:string},YouthCommunitySession>("activateYouthProfilePin",{memberId,activationPin,newPin});}
export async function verifyYouthProfilePin(memberId:string,pin:string):Promise<YouthCommunitySession>{return youthPinCall<{memberId:string;pin:string},YouthCommunitySession>("verifyYouthProfilePin",{memberId,pin});}

export type YouthCommunityFeedMode = "all" | "mine";
export type YouthCommunityFeedResponse = {
  posts: YouthCommunityPost[];
};
export type YouthCommunityComment = {id:string;memberId:string;author:string;content:string;createdAt:string};
export type YouthCommunityPost = {
  id:string;memberId:string;author:string;nickname:string;
  type:"text"|"verse"|"song"|"testimony";content:string;reference:string;linkUrl:string;
  createdAt:string;reactionCount:number;commentCount:number;reactedByMe:boolean;
  isMine:boolean;
  recentComments:YouthCommunityComment[];
};
export type YouthCommunityPostInput = {
  type:"text"|"verse"|"song"|"testimony";content:string;reference?:string;linkUrl?:string;
};
export type YouthCommunityAnnouncement = {id:string;title:string;message:string;createdAt:string};
export type WeeklyActivityAttendanceResponse = "yes" | "no" | "maybe";
export type AdminWeeklyActivityAttendance = {
  memberId: string; name: string; nick: string; response: WeeklyActivityAttendanceResponse; updatedAt: string;
};
export async function getYouthWeeklyActivityAttendance(
  communitySession: string, activityIds: string[],
): Promise<Record<string, WeeklyActivityAttendanceResponse>> {
  const result = await youthPinCall<
    {communitySession: string; activityIds: string[]},
    {responses: Record<string, WeeklyActivityAttendanceResponse>}
  >("getYouthWeeklyActivityAttendance", {communitySession, activityIds});
  return result.responses ?? {};
}
export async function setYouthWeeklyActivityAttendance(
  communitySession: string, activityId: string, response: WeeklyActivityAttendanceResponse,
): Promise<void> {
  const result = await youthPinCall<
    {communitySession: string; activityId: string; response: WeeklyActivityAttendanceResponse},
    {success: boolean}
  >("setYouthWeeklyActivityAttendance", {communitySession, activityId, response});
  if (!result.success) throw new Error("No se pudo guardar tu confirmación.");
}
export async function getAdminWeeklyActivityAttendance(activityId: string): Promise<AdminWeeklyActivityAttendance[]> {
  if (!functions) throw new Error("Firebase Functions no está configurado.");
  const call = httpsCallable<{activityId: string}, {members: AdminWeeklyActivityAttendance[]}>(
    functions, "adminGetWeeklyActivityAttendance",
  );
  const result = await call({activityId});
  return Array.isArray(result.data.members) ? result.data.members : [];
}

export async function getYouthCommunityAnnouncements(communitySession:string):Promise<YouthCommunityAnnouncement[]> {
  const result=await youthPinCall<{communitySession:string},{announcements:YouthCommunityAnnouncement[]}>(
    "getYouthCommunityAnnouncements",{communitySession},
  );
  return Array.isArray(result.announcements)?result.announcements:[];
}
export async function publishYouthCommunityAnnouncement(title:string,message:string):Promise<void> {
  const result=await youthPinCall<{title:string;message:string},{success:boolean}>(
    "adminPublishYouthCommunityAnnouncement",{title,message},
  );
  if(!result.success)throw new Error("No se pudo publicar el aviso.");
}

export async function getYouthCommunityFeed(
  communitySession:string,
  mode:YouthCommunityFeedMode="all",
):Promise<YouthCommunityFeedResponse> {
  const result=await youthPinCall<
    {communitySession:string;mode:YouthCommunityFeedMode},
    YouthCommunityFeedResponse
  >("getYouthCommunityFeed",{communitySession,mode});
  return {
    posts:Array.isArray(result.posts)?result.posts:[],
  };
}
export async function deleteYouthCommunityPost(communitySession:string,postId:string):Promise<void>{
  const result=await youthPinCall<
    {communitySession:string;postId:string},
    {success:boolean}
  >("deleteYouthCommunityPost",{communitySession,postId});
  if(!result.success)throw new Error("No se pudo retirar la publicación.");
}
export async function createYouthCommunityPost(communitySession:string,input:YouthCommunityPostInput):Promise<void> {
  const result=await youthPinCall<{communitySession:string}&YouthCommunityPostInput,{success:boolean}>("createYouthCommunityPost",{communitySession,...input});
  if(!result.success)throw new Error("No se pudo publicar el mensaje.");
}
export async function createYouthCommunityComment(communitySession:string,postId:string,content:string):Promise<void> {
  const result=await youthPinCall<{communitySession:string;postId:string;content:string},{success:boolean}>("createYouthCommunityComment",{communitySession,postId,content});
  if(!result.success)throw new Error("No se pudo publicar el comentario.");
}
export async function toggleYouthCommunityReaction(communitySession:string,postId:string):Promise<boolean> {
  const result=await youthPinCall<{communitySession:string;postId:string},{success:boolean;reacted:boolean}>("toggleYouthCommunityReaction",{communitySession,postId});
  if(!result.success)throw new Error("No se pudo actualizar la reacción.");
  return result.reacted;
}
export async function reportYouthCommunityPost(
  communitySession:string,postId:string,reason:"inappropriate"|"bullying"|"privacy"|"spam"|"other",details="",
):Promise<void>{
  const result=await youthPinCall<{communitySession:string;postId:string;reason:string;details:string},{success:boolean}>(
    "reportYouthCommunityPost",{communitySession,postId,reason,details},
  );
  if(!result.success)throw new Error("No se pudo enviar el reporte.");
}
export type AdminYouthCommunityReport = {
  id:string;postId:string;contentType:"post";reason:string;details:string;postAuthor:string;postContent:string;createdAt:string;
};
export async function getAdminYouthCommunityReports():Promise<AdminYouthCommunityReport[]>{
  const result=await youthPinCall<Record<string,never>,{reports:AdminYouthCommunityReport[]}>("adminListYouthCommunityReports",{});
  return Array.isArray(result.reports)?result.reports:[];
}
export async function moderateYouthCommunityPost(postId:string,action:"hide"|"restore"):Promise<void>{
  const result=await youthPinCall<{postId:string;action:string},{success:boolean}>("adminModerateYouthCommunityPost",{postId,action});
  if(!result.success)throw new Error("No se pudo actualizar la moderación.");
}
export async function getYouthPinAdministration():Promise<YouthPinAdminRecord[]>{const r=await youthPinCall<Record<string,never>,{members:YouthPinAdminRecord[]}>("adminListYouthPins",{});return Array.isArray(r.members)?r.members:[];}
export async function issueYouthActivationPin(memberId:string):Promise<{temporaryPin:string;expiresAt:string}>{const r=await youthPinCall<{memberId:string},{success:boolean;temporaryPin:string;expiresAt:string}>("adminIssueYouthPin",{memberId});if(!r.success||!r.temporaryPin)throw new Error("No se pudo generar el PIN temporal.");return {temporaryPin:r.temporaryPin,expiresAt:r.expiresAt};}
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
export function getWeeklyActivities(): Promise<WeeklyActivity[]> {
  return cachedRequest('public-weekly-activities', 60_000, async () => {
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
  return cachedRequest('public-hall-of-fame', 30_000, async () => {
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
  });
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
  invalidateRequestCache('public-weekly-activities');
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

const pendingMemberRequests = new Map<string, Promise<MemberAdminRecord[]>>();

export function getMembersForAdministration(
  module: 'members' | 'attendance' | 'checkins' | 'reports' | 'followups' = 'members',
): Promise<MemberAdminRecord[]> {
  if (!functions) {
    return Promise.reject(new Error('Firebase Functions no está configurado.'));
  }

  // Comparte solicitudes simultáneas solo dentro de la misma sesión y módulo.
  // Evita reutilizar entre cuentas el resultado privado de una llamada en curso.
  const requestKey = `${auth?.currentUser?.uid ?? 'no-auth'}:${module}`;
  const pending = pendingMemberRequests.get(requestKey);
  if (pending) return pending;

  // Las fichas privadas se consultan en el servidor: las reglas de Firestore
  // no deben permitir que el navegador descargue el directorio completo.
  const loadMembers = httpsCallable<{module: string}, {members: MemberAdminRecord[]}>(
    functions,
    'getPrivateMembers',
  );
  const request = loadMembers({module}).then(({data}) =>
    Array.isArray(data.members)
      ? data.members.map((member) => ({
        ...member,
        id: String(member.id ?? ''),
        pic: typeof member.pic === 'string' ? member.pic : '',
      })).filter((member) => member.id)
      : [],
  );

  pendingMemberRequests.set(requestKey, request);
  const clearPending = () => {
    if (pendingMemberRequests.get(requestKey) === request) {
      pendingMemberRequests.delete(requestKey);
    }
  };
  request.then(clearPending, clearPending);
  return request;
}


export type MemberHistoryItem = {
  id: string;
  kind: string;
  date: string;
  title: string;
  detail: string;
  status: string;
};

export async function getMemberHistory(memberId: string): Promise<MemberHistoryItem[]> {
  if (!functions) throw new Error("Firebase Functions no está configurado.");
  if (!memberId.trim()) throw new Error("Selecciona un joven válido.");
  const loadHistory = httpsCallable<
    {memberId: string},
    {history: MemberHistoryItem[]}
  >(functions, "adminGetMemberHistory");
  const response = await loadHistory({memberId: memberId.trim()});
  return Array.isArray(response.data.history) ? response.data.history : [];
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


export async function recordYouthGameResult(
  communitySession: string, gameId: 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order' | 'truefalse' | 'whoami', score: number, runId: string,
): Promise<{reward: number; verificationStatus: 'pending'; alreadyRecorded: boolean}> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const call = httpsCallable<
    {communitySession: string; gameId: 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order' | 'truefalse' | 'whoami'; score: number; runId: string},
    {success: boolean; reward: number; verificationStatus: 'pending'; alreadyRecorded: boolean}
  >(functions, 'recordYouthGameResult');
  const response = await call({communitySession, gameId, score, runId});
  if (!response.data.success) throw new Error('No se pudo guardar el resultado.');
  return {
    reward: response.data.reward,
    verificationStatus: response.data.verificationStatus,
    alreadyRecorded: response.data.alreadyRecorded,
  };
}

export type AdminYouthGameResult = {
  id: string;
  memberId: string;
  memberName: string;
  gameId: string;
  score: number;
  verificationStatus: 'pending';
  reward: number;
  createdAt: string;
};
export async function listAdminYouthGameResults(): Promise<AdminYouthGameResult[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const call = httpsCallable<Record<string, never>, {results: AdminYouthGameResult[]}>(functions, 'adminListYouthGameResults');
  const response = await call({});
  return Array.isArray(response.data.results) ? response.data.results : [];
}
export async function reviewAdminYouthGameResult(
  resultId: string, decision: 'approve' | 'reject', reward = 0,
): Promise<{success: boolean; verificationStatus: 'verified' | 'rejected'; reward: number}> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const call = httpsCallable<
    {resultId: string; decision: 'approve' | 'reject'; reward: number},
    {success: boolean; verificationStatus: 'verified' | 'rejected'; reward: number}
  >(functions, 'adminReviewYouthGameResult');
  const response = await call({resultId, decision, reward});
  if (!response.data.success) throw new Error('No se pudo revisar el resultado.');
  return response.data;
}

export type YouthGameHistoryEntry = {
  id: string;
  gameId: string;
  score: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
};
export async function getYouthGameHistory(communitySession: string): Promise<YouthGameHistoryEntry[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const call = httpsCallable<{communitySession: string}, {results: YouthGameHistoryEntry[]}>(
    functions, 'getYouthGameHistory',
  );
  const response = await call({communitySession});
  return Array.isArray(response.data.results) ? response.data.results : [];
}
