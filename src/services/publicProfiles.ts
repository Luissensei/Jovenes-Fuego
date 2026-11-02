
import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';

import { db } from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
};

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  try {
    const profilesQuery = query(
      collection(db, 'publicMembers'),
      orderBy('name', 'asc'),
    );

    const snapshot = await getDocs(profilesQuery);

    return snapshot.docs.map((document) => {
      const data = document.data();

      return {
        id: document.id,
        name: String(data.name ?? 'Joven'),
        nick: String(data.nick ?? ''),
        pic: String(data.pic ?? ''),
      };
    });
  } catch (error) {
    console.error('Error consultando perfiles:', error);
    throw new Error(
      'No se pudieron cargar los perfiles. Verifica los permisos de Firebase.',
    );
  }
}
