import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
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

type LegacyRankingEntry = {
  i?: unknown;
  n?: unknown;
  t?: unknown;
};

const PHOTO_QUERY_BATCH_SIZE = 30;

function safePhoto(value: unknown): string {
  if (typeof value !== 'string') return '';

  // The original app stores approved public photos as JPEG data URLs.
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return value;
  }

  // Keep support for already-hosted HTTPS photos if present in old records.
  if (value.startsWith('https://')) return value;

  return '';
}

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!db) {
    throw new Error('Firebase Firestore no está configurado.');
  }

  try {
    // The legacy app publishes its privacy-filtered profile list here.
    // The original Firestore rules allow a public get on this exact document.
    const rankingSnapshot = await getDoc(
      doc(db, 'public', 'ranking'),
    );

    if (!rankingSnapshot.exists()) return [];

    const rankingData = rankingSnapshot.data();
    if (rankingData.off === true) return [];

    const entries = Array.isArray(rankingData.all)
      ? rankingData.all as LegacyRankingEntry[]
      : [];

    const profiles: PublicProfile[] = entries.flatMap((entry, index) => {
      if (!entry || typeof entry !== 'object') return [];

      const name = typeof entry.n === 'string' ? entry.n.trim() : '';
      if (!name) return [];

      const memberId = typeof entry.i === 'string'
        ? entry.i.trim()
        : '';

      // The legacy public ranking already removes members marked "nopub".
      // Entries without an ID can still be shown, but cannot load a photo.
      const id = memberId || `public-profile-${index}`;
      const rawPoints = Number(entry.t ?? 0);

      return [{
        id,
        name,
        nick: '',
        pic: '',
        points: Number.isFinite(rawPoints) && rawPoints >= 0
          ? rawPoints
          : 0,
      }];
    });

    const memberIds = [...new Set(
      profiles
        .map((profile) => profile.id)
        .filter((id) => !id.startsWith('public-profile-')),
    )];

    // Public profile photos are stored separately in photos/{memberId}.
    // Fetch only the photo documents corresponding to visible public profiles.
    const photos = new Map<string, string>();

    for (
      let start = 0;
      start < memberIds.length;
      start += PHOTO_QUERY_BATCH_SIZE
    ) {
      const ids = memberIds.slice(
        start,
        start + PHOTO_QUERY_BATCH_SIZE,
      );

      const photoQuery = query(
        collection(db, 'photos'),
        where(documentId(), 'in', ids),
      );

      const photoSnapshot = await getDocs(photoQuery);

      photoSnapshot.docs.forEach((photoDoc) => {
        photos.set(
          photoDoc.id,
          safePhoto(photoDoc.data().p),
        );
      });
    }

    return profiles.map((profile) => ({
      ...profile,
      pic: photos.get(profile.id) ?? '',
    }));
  } catch (error) {
    const firebaseError = error as {code?: string};
    console.error('Error consultando perfiles del ranking original:', error);

    if (firebaseError.code === 'permission-denied') {
      throw new Error(
        'Firestore no permite leer public/ranking o las fotos públicas. Revisa las reglas originales.',
      );
    }

    throw new Error(
      'No se pudieron cargar los perfiles desde el ranking original de Firebase.',
    );
  }
}
