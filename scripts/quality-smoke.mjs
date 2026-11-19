import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), 'utf8');
const [manifestText, serviceWorker, firebaseClient, modulesSource, appSource, themePreference, paletteSource] = await Promise.all([
  read('public/manifest.webmanifest'),
  read('public/sw.js'),
  read('src/services/firebase/client.ts'),
  read('src/app/modules.ts'),
  read('src/app/App.tsx'),
  read('src/app/useThemePreference.ts'),
  read('src/styles/jdf-brand-palette.css'),
]);

assert.match(themePreference, /theme === 'dark' \? '#0B0B0B' : '#FFFFFF'/, 'El color de la barra del navegador debe coincidir con las paletas verde y monocromática.');

const manifest = JSON.parse(manifestText);
assert.equal(manifest.name, 'Jóvenes de Fuego', 'El manifiesto debe identificar la aplicación.');
assert.equal(manifest.lang, 'es-CO', 'El idioma de la aplicación debe ser español de Colombia.');
assert.equal(manifest.display, 'standalone', 'La PWA debe abrir en modo independiente.');
assert.equal(manifest.background_color, '#FFFFFF', 'La PWA debe iniciar con el fondo claro oficial.');
assert.equal(manifest.theme_color, '#FFFFFF', 'El color base del navegador debe usar el nuevo tema.');
assert.match(paletteSource, /--jf-brand:#235347/, 'El tema claro debe usar verde bosque.');
assert.match(paletteSource, /--jf-sidebar:#051F20/, 'La navegación clara debe usar verde profundo.');
assert.match(paletteSource, /--jf-canvas:#0B0B0B/, 'El tema oscuro debe usar el fondo monocromático.');
assert.match(paletteSource, /--jf-brand:#D9D9D9/, 'El tema oscuro debe usar acentos grises.');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'La PWA necesita iconos instalables.');
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('/'), 'Los iconos deben usar rutas locales absolutas.');
  await access(resolve(root, 'public/' + icon.src.slice(1)));
}

assert.match(firebaseClient, /projectId:\s*['"]jovenes-de-fuego['"]/, 'La app debe apuntar al Firebase original.');
assert.doesNotMatch(firebaseClient, /jovenes-de-fuego-staging/, 'No debe quedar configurado el Firebase staging.');
assert.match(serviceWorker, /jdf-shell-v4/, 'El service worker debe versionar su caché.');
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
const callableBlocks = [...functionsSource.matchAll(/export const (\w+) = onCall\([\s\S]*?\n\}\);/g)];
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
  assert.match(body, /request\.auth/, name + ' debe comprobar autenticación.');
  assert.match(
    body,
    /require(?:Admin|AdminOrPastor|ModulePermission|YouthPinManager)\(/,
    name + ' debe comprobar permisos en backend.',
  );
}
assert.equal(auditedCallables.size, callableBlocks.length, 'No puede haber nombres callable duplicados.');
for (const publicName of publicCallableAllowlist) {
  assert.ok(auditedCallables.has(publicName), 'La lista pública debe corresponder a una función existente: ' + publicName);
}

console.log('Smoke checks correctos: PWA, Firebase original, caché privada, ' + moduleIds.length + ' módulos y ' + callableBlocks.length + ' callables con control de acceso.');
