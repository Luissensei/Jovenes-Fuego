const values = new Map<string, {expiresAt: number; value: unknown}>();
const pending = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
const MAX_CACHE_ENTRIES = 100;

/** Caché efímera en memoria: evita lecturas repetidas al volver a un módulo.
 * Nunca persiste datos privados en localStorage ni en Cache Storage.
 * Tiene un límite para que los cambios de cuenta y navegación no acumulen memoria.
 */
export function cachedRequest<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = values.get(key);
  if (cached && cached.expiresAt > now) {
    // Mueve la entrada al final para mantener un orden LRU sencillo.
    values.delete(key);
    values.set(key, cached);
    return Promise.resolve(cached.value as T);
  }
  if (cached) values.delete(key);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const generation = generations.get(key) ?? 0;
  const request = load().then((value) => {
    const expiresAt = Date.now() + Math.max(0, ttlMs);
    // Limpia entradas vencidas antes de insertar una nueva.
    for (const [cacheKey, entry] of values) {
      if (entry.expiresAt <= Date.now()) values.delete(cacheKey);
    }
    values.delete(key);
    while (values.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = values.keys().next().value;
      if (oldestKey === undefined) break;
      values.delete(oldestKey);
    }
    if (ttlMs > 0 && generations.get(key) === generation) values.set(key, {value, expiresAt});
    return value;
  }).finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}

export function invalidateRequestCache(key: string): void {
  values.delete(key);
  generations.set(key, (generations.get(key) ?? 0) + 1);
  pending.delete(key);
}
