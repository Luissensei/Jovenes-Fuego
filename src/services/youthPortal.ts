import {httpsCallable} from "firebase/functions";
import {functions} from "./firebase/client";

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

async function call<T>(name: string, payload: unknown = {}): Promise<T> {
  if (!functions) {
    throw new Error("Firebase Functions no está configurado. Revisa el entorno Staging.");
  }
  const callable = httpsCallable<unknown, T>(functions, name);
  const result = await callable(payload);
  return result.data;
}

export async function getWeeklyActivities(): Promise<WeeklyActivity[]> {
  const result = await call<{activities: WeeklyActivity[]}>("getPublicWeeklyActivities");
  return result.activities ?? [];
}

export async function getAdminWeeklyActivities(): Promise<WeeklyActivity[]> {
  const result = await call<{activities: WeeklyActivity[]}>("adminListWeeklyActivities");
  return result.activities ?? [];
}

export async function saveWeeklyActivity(
  activity: Omit<WeeklyActivity, "id"> & {id?: string},
): Promise<void> {
  await call<{success: boolean; id: string}>("adminSaveWeeklyActivity", activity);
}

export async function sendPrayerRequest(input: PrayerRequestInput): Promise<void> {
  await call<{success: boolean; id: string}>("submitPublicPrayerRequest", input);
}

export async function getHallOfFame(): Promise<{
  topPlayers: HallOfFamePlayer[];
  faithful: FaithfulPlayer[];
  attendanceLimited: boolean;
}> {
  return call<{
    topPlayers: HallOfFamePlayer[];
    faithful: FaithfulPlayer[];
    attendanceLimited: boolean;
  }>("getPublicHallOfFame");
}

export async function getMembersForAdministration(): Promise<MemberAdminRecord[]> {
  const result = await call<{members: MemberAdminRecord[]}>("getPrivateMembers");
  return result.members ?? [];
}

export async function updateMemberForAdministration(
  memberId: string,
  patch: AdminMemberPatch,
): Promise<void> {
  await call("adminUpdateMember", {memberId, patch});
}

export async function getPrayerRequestsForAdministration(): Promise<AdminPrayerRequest[]> {
  const result = await call<{petitions: AdminPrayerRequest[]}>("adminGetPrayerRequests");
  return result.petitions ?? [];
}

export async function updatePrayerRequestStatus(id: string, status: string): Promise<void> {
  await call("adminUpdatePrayerStatus", {id, status});
}
