import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

type PublicProfilePayload = {
  id?: unknown;
  name?: unknown;
  nick?: unknown;
  pic?: unknown;
  points?: unknown;
};

type PublicProfilesResponse = {
  profiles?: PublicProfilePayload[];
};

/**
 * Reads only the public fields returned by the getPublicProfiles callable.
 * Selecting a public profile is not authentication and never grants write access.
 */
export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado en este entorno.');
  }

  try {
    const callable = httpsCallable<void, PublicProfilesResponse>(
      functions,
      'getPublicProfiles',
    );
    const response = await callable();

    return (response.data.profiles ?? [])
      .filter((profile) => typeof profile.id === 'string' && profile.id.length > 0)
      .map((profile) => ({
        id: String(profile.id),
        name: typeof profile.name === 'string' ? profile.name : 'Joven',
        nick: typeof profile.nick === 'string' ? profile.nick : '',
        pic: typeof profile.pic === 'string' ? profile.pic : '',
        points:
          typeof profile.points === 'number' && Number.isFinite(profile.points)
            ? profile.points
            : 0,
      }));
  } catch (error) {
    console.error('Error consultando perfiles públicos:', error);
    throw new Error(
      'No se pudieron cargar los perfiles públicos. Comprueba que la función getPublicProfiles esté desplegada en Firebase Staging.',
    );
  }
}
