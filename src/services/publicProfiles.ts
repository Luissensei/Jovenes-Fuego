import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import {db} from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  try {
    // Only the curated public collection is queried. Never read members
    // here because those documents can contain private contact information.
    // An explicit nopub=false filter also lets Firestore Rules enforce
    // visibility for the no-password profile selector.
    const profilesQuery = query(
      collection(db, 'publicProfiles'),
      where('nopub', '==', false),
      limit(200),
    );

    const snapshot = await getDocs(profilesQuery);

    return snapshot.docs.map((profileDoc) => {
      const data = profileDoc.data();
      const rawPoints = Number(data.points ?? data.puntos ?? 0);
      const pic = typeof data.pic === 'string' &&
        data.pic.startsWith('https://')
        ? data.pic
        : '';

      return {
        id: profileDoc.id,
        name: String(data.name || data.nick || 'Perfil sin nombre'),
        nick: typeof data.nick === 'string' ? data.nick : '',
        pic,
        points: Number.isFinite(rawPoints) && rawPoints >= 0
          ? rawPoints
          : 0,
      };
    });
  } catch (error) {
    const firebaseError = error as {code?: string};
    console.error('Error consultando perfiles públicos:', error);

    if (firebaseError.code === 'permission-denied') {
      throw new Error(
        'Firestore no permite consultar los perfiles públicos. Revisa las reglas existentes de publicProfiles.',
      );
    }

    throw new Error(
      'No se pudieron cargar los perfiles públicos directamente desde Firestore.',
    );
  }
}
