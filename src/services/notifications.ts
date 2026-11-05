import {httpsCallable} from 'firebase/functions';
import {functions} from './firebase/client';

export type AdminNotification = {
  id: string;
  kind: string;
  title: string;
  description: string;
  createdAt: string;
  path: string;
  priority: 'high' | 'normal';
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const load = httpsCallable<Record<string, never>, {notifications: AdminNotification[]}>(
    functions,
    'adminGetNotifications',
  );
  const response = await load({});
  return Array.isArray(response.data.notifications) ? response.data.notifications : [];
}
