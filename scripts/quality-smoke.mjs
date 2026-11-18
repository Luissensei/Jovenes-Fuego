import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), 'utf8');
const [manifestText, serviceWorker, firebaseClient, modulesSource, appSource, themePreference] = await Promise.all([
  read('public/manifest.webmanifest'),
  read('public/sw.js'),
  read('src/services/firebase/client.ts'),
  read('src/app/modules.ts'),
  read('src/app/App.tsx'),
  read('src/app/useThemePreference.ts'),
]);

assert.match(themePreference, /theme === 'dark' \? '#0B0720' : '#F2E9FF'/, 'El color de la barra del navegador debe coincidir con la paleta oficial.');

const manifest = JSON.parse(manifestText);
assert.equal(manifest.name, 'Jóvenes de Fuego', 'El manifiesto debe identificar la aplicación.');
assert.equal(manifest.lang, 'es-CO', 'El idioma de la aplicación debe ser español de Colombia.');
assert.equal(manifest.display, 'standalone', 'La PWA debe abrir en modo independiente.');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'La PWA necesita iconos instalables.');
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('/'), 'Los iconos deben usar rutas locales absolutas.');
  await access(resolve(root, 'public/' + icon.src.slice(1)));
}

assert.match(firebaseClient, /projectId:\s*['"]jovenes-de-fuego['"]/, 'La app debe apuntar al Firebase original.');
assert.doesNotMatch(firebaseClient, /jovenes-de-fuego-staging/, 'No debe quedar configurado el Firebase staging.');
assert.match(serviceWorker, /jdf-shell-v\d+/, 'El service worker debe versionar su caché.');
for (const privatePath of ['/__/','firestore','identitytoolkit']) {
  assert.ok(serviceWorker.includes(privatePath), 'El service worker debe excluir ' + privatePath + ' del caché.');
}

const moduleIds = [...modulesSource.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
const modulePaths = [...modulesSource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
const routeCases = new Set([...appSource.matchAll(/case\s+'([^']+)'\s*:/g)].map((match) => match[1]));
assert.ok(moduleIds.length > 0, 'Debe existir un catálogo de módulos.');
assert.equal(new Set(moduleIds).size, moduleIds.length, 'No puede haber IDs de módulos duplicados.');
assert.equal(new Set(modulePaths).size, modulePaths.length, 'No puede haber rutas de módulos duplicadas.');
for (const id of moduleIds) assert.ok(routeCases.has(id), 'El módulo ' + id + ' debe tener un renderizador explícito.');


const permissionArray = (source, pattern, label) => {
  const match = source.match(pattern);
  assert.ok(match, 'Debe declararse ' + label + '.');
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
};
const frontendLeaderPermissions = permissionArray(
  await read('src/app/App.tsx'),
  /const defaultLeaderModules = \[([\s\S]*?)\];/,
  'los permisos predeterminados del líder en frontend',
);
const backendLeaderPermissions = permissionArray(
  await read('functions/src/index.ts'),
  /const defaultLeaderPermissions = \[([\s\S]*?)\];/,
  'los permisos predeterminados del líder en backend',
);
const manageablePermissions = permissionArray(
  await read('functions/src/index.ts'),
  /const manageablePermissions = \[([\s\S]*?)\];/,
  'el catálogo de permisos administrables',
);
assert.deepEqual(
  [...frontendLeaderPermissions].sort(),
  [...backendLeaderPermissions].sort(),
  'Frontend y backend deben compartir exactamente los permisos predeterminados del líder.',
);
assert.equal(new Set(manageablePermissions).size, manageablePermissions.length, 'No puede haber permisos administrables duplicados.');
for (const permission of manageablePermissions) {
  assert.ok(moduleIds.includes(permission), 'El permiso ' + permission + ' debe corresponder a un módulo registrado.');
}
for (const restricted of ['assistant', 'community-moderation', 'youth-pins', 'pastoral', 'bonus', 'leaders', 'audit', 'settings', 'prayers', 'inbox']) {
  assert.ok(!manageablePermissions.includes(restricted), 'El módulo restringido ' + restricted + ' no debe asignarse a líderes.');
}


const functionsSource = await read('functions/src/index.ts');
const callableBlocks = [...functionsSource.matchAll(/export const (\\w+) = onCall\\([\\s\\S]*?\\n\\}\\);/g)];
assert.ok(callableBlocks.length >= 60, 'Debe auditarse el catálogo completo de Cloud Functions callable.');
const publicCallableAllowlist = new Set([
  'signInWithUsername', 'getMyApplicationProfile',
  'getYouthProfilePinStatus', 'activateYouthProfilePin', 'verifyYouthProfilePin',
  'getYouthCommunityAnnouncements', 'getYouthCommunityFeed', 'deleteYouthCommunityPost',
  'createYouthCommunityPost', 'createYouthCommunityComment', 'toggleYouthCommunityReaction',
  'reportYouthCommunityPost', 'saveYouthProfileAppearance', 'purchaseYouthLookItem',
  'purchaseYouthLookBundle', 'getPublicProfiles', 'getPublicRankingMetrics',
  'getPublicDevotionals', 'submitYouthDevotional', 'getPublicWeeklyActivities',
  'setYouthWeeklyActivityAttendance', 'getYouthWeeklyActivityAttendance',
  'submitPublicPrayerRequest', 'getPublicHallOfFame',
]);
const auditedCallables = new Set();
for (const callable of callableBlocks) {
  const name = callable[1];
  const body = callable[0];
  auditedCallables.add(name);
  if (publicCallableAllowlist.has(name)) continue;
  assert.match(body, /request\\.auth/, name + ' debe comprobar autenticación.');
  assert.match(
    body,
    /require(?:Admin|AdminOrPastor|ModulePermission|YouthPinManager)\\(/,
    name + ' debe comprobar permisos en backend.',
  );
}
assert.equal(auditedCallables.size, callableBlocks.length, 'No puede haber nombres callable duplicados.');
for (const publicName of publicCallableAllowlist) {
  assert.ok(auditedCallables.has(publicName), 'La lista pública debe corresponder a una función existente: ' + publicName);
}

console.log('Smoke checks correctos: PWA, Firebase original, caché privada, ' + moduleIds.length + ' módulos y ' + callableBlocks.length + ' callables con control de acceso.');
