import {httpsCallable} from 'firebase/functions';

import {functions} from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
  frame?: string;
  avatar?: string;
  background?: string;
  title?: string;
  flames?: number;
  ownedItems?: string[];
};

export type PublicRankingMetric = Pick<PublicProfile, 'id' | 'name' | 'points'>;

async function call<TResponse>(
  name: string,
): Promise<TResponse> {
  if (!functions) throw new Error('Firebase Functions no está configurado.');
  const callable = httpsCallable<Record<string, never>, TResponse>(functions, name);
  const response = await callable({});
  return response.data;
}

/** Obtiene únicamente indicadores públicos, sin descargar fotografías ni datos privados. */
export async function getPublicRankingMetrics(): Promise<PublicRankingMetric[]> {
  const response = await call<{metrics: PublicRankingMetric[]}>('getPublicRankingMetrics');
  return Array.isArray(response.metrics)
    ? response.metrics.map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      points: Math.max(0, Number(item.points) || 0),
    })).filter((item) => item.id && item.name)
    : [];
}

/** Perfiles y apariencia pública se consultan con Admin SDK y filtro nopub en servidor. */
export async function getPublicProfiles(): Promise<PublicProfile[]> {
  const response = await call<{profiles: PublicProfile[]}>('getPublicProfiles');
  return Array.isArray(response.profiles)
    ? response.profiles.map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      nick: String(item.nick ?? ''),
      pic: String(item.pic ?? ''),
      points: Math.max(0, Number(item.points) || 0),
      frame: String(item.frame ?? ''),
      avatar: String(item.avatar ?? ''),
      background: String(item.background ?? ''),
      title: String(item.title ?? ''),
      flames: Math.max(0, Number(item.flames) || 0),
      ownedItems: Array.isArray(item.ownedItems)
        ? item.ownedItems.filter((value): value is string => typeof value === 'string').slice(0, 400)
        : [],
    })).filter((item) => item.id && item.name)
    : [];
}
