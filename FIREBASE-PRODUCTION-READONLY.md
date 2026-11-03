# Conexión al Firebase original en modo de solo lectura

Esta fase permite consultar la autenticación y determinados datos públicos de
`jovenes-de-fuego` sin cambiar documentos, colecciones ni reglas de Firestore.

## Alcance del codebase `readonly`

El directorio `functions-readonly` es independiente del codebase histórico
`functions`. El workflow despliega únicamente `functions:readonly` y expone
estas cuatro funciones:

- `readonlyGetMyApplicationProfile`: devuelve solo el perfil de aplicación
  del usuario autenticado en `users/{uid}`.
- `readonlyGetPublicProfiles`: combina las fichas de `members` y
  `publicProfiles`, respeta `nopub` en cualquiera de ellas y devuelve
  únicamente nombre, apodo, foto HTTPS y puntos.
- `readonlyGetPublicWeeklyActivities`: devuelve solo actividades publicadas.
- `readonlyGetPublicHallOfFame`: consulta perfiles públicos y reuniones para
  calcular una clasificación; no actualiza puntos ni asistencias.

No se despliega el archivo general `functions/src/index.ts`. El codebase
`readonly` no contiene operaciones `set`, `update`, `delete`, `add`,
transacciones ni lotes de escritura.

## Comportamiento del frontend

La conexión al proyecto original solo se permite cuando se configura
explícitamente:

```env
VITE_FIREBASE_PROJECT_ID=jovenes-de-fuego
VITE_FIREBASE_AUTH_DOMAIN=jovenes-de-fuego.firebaseapp.com
VITE_FIREBASE_READ_ONLY=true
```

También se deben completar `VITE_FIREBASE_API_KEY` y
`VITE_FIREBASE_APP_ID` usando la aplicación web original de Firebase.
La configuración de producción se debe aplicar únicamente al entorno Preview
y a la rama `connect/production-readonly` del proyecto de vista previa de
Vercel. No se debe cambiar el entorno Production de Vercel.

Mientras `VITE_FIREBASE_READ_ONLY=true`, el panel interno limita la navegación
a ranking, juegos y perfiles; el portal público conserva las consultas y
desactiva el envío de peticiones. Los juegos siguen siendo locales y no alteran
el ranking oficial.

## Despliegue manual de las funciones de lectura

1. En GitHub, abre **Settings → Environments** y crea el entorno
   `firebase-production-readonly`.
2. Añade allí el secreto
   `FIREBASE_SERVICE_ACCOUNT_JOVENES_DE_FUEGO_PRODUCTION_READONLY` con el
   JSON completo de una cuenta de servicio autorizada para desplegar Cloud
   Functions en el proyecto original. No pegues ese JSON en el chat ni en
   archivos del repositorio.
3. Revisa el código de `functions-readonly/src/index.ts` y confirma que la
   cuenta de servicio corresponde a `jovenes-de-fuego`.
4. En **Actions → Deploy Firebase production read-only bridge**, ejecuta el
   workflow desde la rama `connect/production-readonly` y marca la casilla de
   confirmación de solo lectura.

El workflow solo ejecuta `firebase deploy --only functions:readonly` sobre
`jovenes-de-fuego`. No despliega el codebase general, Hosting, reglas de
Firestore ni Storage.

## Límites de esta fase

- No abre las reglas de Firestore al navegador.
- No modifica ni migra documentos.
- No concede permisos de escritura a las funciones nuevas.
- No habilita asistencia, seguimiento, visitantes, peticiones, administración,
  fotos ni operaciones que guarden cambios.
- La conexión no debe considerarse lista hasta verificar el despliegue y
  probar el acceso con una cuenta real autorizada.
