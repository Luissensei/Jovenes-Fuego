import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Bloqueado: Firestore Emulator no está activo.');
}

const data = JSON.parse(
  await readFile(new URL('../emulator/seed.json', import.meta.url), 'utf8'),
);

const app = initializeApp({
  projectId: 'jovenes-de-fuego-staging',
});

const db = getFirestore(app);

for (const profile of data.publicProfiles) {
  const { id, ...fields } = profile;
  await db.collection('publicProfiles').doc(id).set(fields);
  console.log(`Perfil local preparado: ${id}`);
}

console.log('Carga local completada.');
await app.delete();
