import {httpsCallable} from './firebase/functionsShim';
import {functions} from './firebase/client';

export type LeaderRecord = {
  id: string;
  name: string;
  email: string;
  user: string;
  role: string;
  groups: string[];
  permissions: string[];
  active: boolean;
};

function callable<TInput, TOutput>(name: string) {
  if (!functions) {
    throw new Error('No se pudo conectar con Firebase Functions. Comprueba que las funciones estén desplegadas en el proyecto original y que tu sesión tenga permisos de administración.');
  }
  return httpsCallable<TInput, TOutput>(functions, name);
}

export async function listLeaders(): Promise<LeaderRecord[]> {
  const result = await callable<Record<string, never>, {leaders: LeaderRecord[]}>('adminListLeaders')({});
  return result.data.leaders;
}

export async function createLeader(input: {
  name: string;
  email: string;
  role: string;
  groups: string[];
  permissions: string[];
}): Promise<{uid: string; setupLink: string}> {
  const result = await callable<typeof input, {uid: string; setupLink: string}>('adminCreateLeader')(input);
  return result.data;
}

export async function updateLeader(input: {
  uid: string;
  role: string;
  groups: string[];
  permissions: string[];
  active: boolean;
}): Promise<void> {
  await callable<typeof input, {success: boolean}>('adminUpdateLeader')(input);
}
