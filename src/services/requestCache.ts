const values = new Map<string, {expiresAt: number; value: unknown}>();
const pending = new Map<string, Promise<unknown>>();

/** Caché efímera en memoria: evita lecturas repetidas al volver a un módulo.
 * Nunca persiste datos privados en localStorage ni en Cache Storage.
 */
export function cachedRequest<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = values.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value as T);
  if (cached) values.delete(key);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const request = load().then((value) => {
    values.set(key, {value, expiresAt: Date.now() + Math.max(0, ttlMs)});
    return value;
  }).finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}

export function invalidateRequestCache(key: string): void {
  values.delete(key);
}
