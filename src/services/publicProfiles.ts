import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
};

type PublicProfilesResponse = {
  profiles: PublicProfile[];
};

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!functions) {
    throw new Error('Firebase Functions no está configurado.');
  }

  const callable = httpsCallable<void, PublicProfilesResponse>(
    functions,
    'getPublicProfiles',
  );

  const response = await callable();

  return response.data.profiles;
}