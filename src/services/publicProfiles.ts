import { httpsCallable } from 'firebase/functions';
import {
  firebaseFunctionsRegion,
  firebaseProjectId,
  functions,
} from './firebase/client';

export type PublicProfile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

type PublicProfilesResponse = { profiles?: PublicProfile[] };

function firebaseCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return '';
}

function explainProfilesError(error: unknown): string {
  const code = firebaseCode(error);
  const project = firebaseProjectId || 'proyecto sin configurar';

  if (code === 'functions/not-found') {
    return `La función getPublicProfiles no está desplegada en ${project} (${firebaseFunctionsRegion}). Despliega las Cloud Functions únicamente en Firebase Staging.`;
  }
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return 'Firebase Functions no está respondiendo. Comprueba la conexión, el estado del servicio y la región configurada.';
  }
  if (code === 'functions/unauthenticated') {
    return 'Firebase no pudo validar la sesión. Cierra sesión y vuelve a ingresar.';
  }
  if (code === 'functions/permission-denied') {
    return 'La función rechazó esta consulta por permisos. Revisa sus validaciones y los registros de Cloud Functions.';
  }
  if (code === 'functions/internal') {
    return 'La función se ejecutó, pero falló al consultar los perfiles. Revisa los registros de Cloud Functions en Staging.';
  }
  if (!code) {
    return error instanceof Error
      ? error.message
      : 'No se pudieron consultar los perfiles públicos.';
  }
  return `No se pudieron consultar los perfiles públicos (código ${code}). Proyecto: ${project}.`;
}

export async function getPublicProfiles(): Promise<PublicProfile[]> {
  if (!functions) {
    throw new Error(
      'Firebase Functions no está configurado. Comprueba las variables VITE_FIREBASE_* de Staging.',
    );
  }

  try {
    const callable = httpsCallable<Record<string, never>, PublicProfilesResponse>(
      functions,
      'getPublicProfiles',
    );
    const response = await callable({});
    const rows = Array.isArray(response.data?.profiles)
      ? response.data.profiles
      : [];

    return rows.map((profile) => ({
      id: String(profile.id ?? ''),
      name: String(profile.name || profile.nick || 'Perfil sin nombre'),
      nick: String(profile.nick ?? ''),
      pic: typeof profile.pic === 'string' && profile.pic.startsWith('https://')
        ? profile.pic
        : '',
      points: Number.isFinite(Number(profile.points)) && Number(profile.points) >= 0
        ? Number(profile.points)
        : 0,
    })).filter((profile) => profile.id.length > 0);
  } catch (error) {
    console.error('Error consultando perfiles públicos:', {
      code: firebaseCode(error),
      project: firebaseProjectId,
      region: firebaseFunctionsRegion,
      error,
    });
    throw new Error(explainProfilesError(error));
  }
}
