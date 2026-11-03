import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/client';

export type DashboardSummary = {
  role: string;
  memberCount: number;
  meetingsThisMonth: number;
  attendancePresent: number;
  followupsPending: number | null;
  visitorsNew: number | null;
  prayersPending: number | null;
  upcomingActivities: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }
  const callable = httpsCallable<Record<string, never>, DashboardSummary>(
    functions,
    'getDashboardSummary',
  );
  const result = await callable({});
  return result.data;
}
