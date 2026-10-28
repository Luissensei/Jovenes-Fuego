/**
 * Nombres de colecciones observados en la app original.
 * Mantenerlos estables hasta validar el esquema completo y las reglas.
 */
export const COLLECTIONS = {
  members: 'members',
  attendance: 'attendance',
  followups: 'followups',
  users: 'users',
  devotionals: 'devotionals',
  settings: 'settings',
  visitors: 'visitors',
  prayers: 'prayers',
  events: 'events',
  checkins: 'checkins',
  audit: 'audit',
  pastoral: 'pastoral',
  inbox: 'inbox',
  bonus: 'bonus',
  photos: 'photos',
  pendingPhotos: 'fotoPend',
  turns: 'turnos',
  backups: 'backups',
  public: 'public',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
