
export type AppPermissionRole =
  | 'admin'
  | 'administrador'
  | 'pastor'
  | 'lider'
  | 'líder'
  | 'user'
  | string;

const ADMIN_MODULES = new Set([
  'leaders',
  'settings',
  'bonus',
  'audit',
]);

const PASTORAL_MODULES = new Set([
  'pastoral',
]);

export function normalizeRole(role?: AppPermissionRole | null): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isAdminRole(role?: AppPermissionRole | null): boolean {
  return ['admin', 'administrador'].includes(normalizeRole(role));
}

export function isPastorRole(role?: AppPermissionRole | null): boolean {
  return normalizeRole(role) === 'pastor';
}

export function isLeaderRole(role?: AppPermissionRole | null): boolean {
  return ['lider', 'pastor'].includes(normalizeRole(role)) ||
    isAdminRole(role);
}

export function canAccessModule(
  role: AppPermissionRole | null | undefined,
  moduleId: string,
): boolean {
  const normalized = normalizeRole(role);

  if (!normalized) return false;

  if (ADMIN_MODULES.has(moduleId)) {
    return isAdminRole(normalized);
  }

  if (PASTORAL_MODULES.has(moduleId)) {
    return isPastorRole(normalized) || isAdminRole(normalized);
  }

  return true;
}

export function getVisibleModuleIds(
  role: AppPermissionRole | null | undefined,
  moduleIds: string[],
): string[] {
  return moduleIds.filter((id) => canAccessModule(role, id));
}
