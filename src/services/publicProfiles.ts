import {
  collection,
  getDocs,
} from 'firebase/firestore';

import { db } from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

function readText(data: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = data[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function readPoints(data: Record<string, unknown>): number {
  const value = Number(data.points ?? data.puntos ?? 0);

  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function validImageUrl(value: string): string {
  if (
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('data:image/')
  ) {
    return value;
  }

  return '';
}

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  try {
    // No utilizamos orderBy porque excluye documentos
    // que no tengan el campo name.
    const snapshot = await getDocs(
      collection(db, 'publicProfiles'),
    );

    const profiles = snapshot.docs.map((document) => {
      const data = document.data() as Record<string, unknown>;

      const nick = readText(data, [
        'nick',
        'nickname',
        'username',
        'apodo',
        'userName',
      ]);

      const name = readText(data, [
        'name',
        'nombre',
        'displayName',
        'fullName',
        'nombreCompleto',
        'nombre_completo',
        'publicName',
        'user',
      ]) || nick || 'Perfil sin nombre';

      const pic = validImageUrl(
        readText(data, [
          'pic',
          'photoURL',
          'photoUrl',
          'avatar',
          'imageUrl',
          'foto',
          'picture',
        ]),
      );

      return {
        id: document.id,
        name,
        nick,
        pic,
        points: readPoints(data),
      };
    });

    return profiles.sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );
  } catch (error) {
    console.error('Error consultando perfiles públicos:', error);

    throw new Error(
      'No se pudieron cargar los perfiles. Verifica los permisos de Firebase Staging.',
    );
  }
}
