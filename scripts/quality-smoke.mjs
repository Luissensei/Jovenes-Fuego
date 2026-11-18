import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), 'utf8');
const [manifestText, serviceWorker, firebaseClient, modulesSource, appSource] = await Promise.all([
  read('public/manifest.webmanifest'),
  read('public/sw.js'),
  read('src/services/firebase/client.ts'),
  read('src/app/modules.ts'),
  read('src/app/App.tsx'),
]);

const manifest = JSON.parse(manifestText);
assert.equal(manifest.name, 'Jóvenes de Fuego', 'El manifiesto debe identificar la aplicación.');
assert.equal(manifest.lang, 'es-CO', 'El idioma de la aplicación debe ser español de Colombia.');
assert.equal(manifest.display, 'standalone', 'La PWA debe abrir en modo independiente.');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'La PWA necesita iconos instalables.');
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('/'), 'Los iconos deben usar rutas locales absolutas.');
  await access(resolve(root, `public/${icon.src.slice(1)}`));
}

assert.match(firebaseClient, /projectId:\\s*['"]jovenes-de-fuego['"]/, 'La app debe apuntar al Firebase original.');
assert.doesNotMatch(firebaseClient, /jovenes-de-fuego-staging/, 'No debe quedar configurado el Firebase staging.');
assert.match(serviceWorker, /jdf-shell-v\\d+/, 'El service worker debe versionar su caché.');
for (const privatePath of ['/__/','firestore','identitytoolkit']) {
  assert.ok(serviceWorker.includes(privatePath), `El service worker debe excluir ${privatePath} del caché.`);
}

const moduleIds = [...modulesSource.matchAll(/id:\\s*'([^']+)'/g)].map((match) => match[1]);
const modulePaths = [...modulesSource.matchAll(/path:\\s*'([^']+)'/g)].map((match) => match[1]);
const routeCases = new Set([...appSource.matchAll(/case\\s+'([^']+)'\\s*:/g)].map((match) => match[1]));
assert.ok(moduleIds.length > 0, 'Debe existir un catálogo de módulos.');
assert.equal(new Set(moduleIds).size, moduleIds.length, 'No puede haber IDs de módulos duplicados.');
assert.equal(new Set(modulePaths).size, modulePaths.length, 'No puede haber rutas de módulos duplicadas.');
for (const id of moduleIds) assert.ok(routeCases.has(id), `El módulo ${id} debe tener un renderizador explícito.`);

console.log(`Smoke checks correctos: PWA, Firebase original, caché privada y ${moduleIds.length} módulos.`);
