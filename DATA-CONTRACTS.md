# Contratos de datos — Jóvenes de Fuego

Este documento registra el esquema observado en el código legado. Es un contrato provisional: no se han inspeccionado documentos reales de Firebase. Los nombres de colección y claves de documento se conservan para no forzar una migración.

## Primer módulo implementado

### `members/{id}` — consulta de jóvenes

**Lectura:** suscripción `onSnapshot(collection(db, 'members'))` en `src/services/repositories/members.ts`.

**Campos observados en el código legado:**

- `name`: nombre visible.
- `phone`: teléfono (opcional).
- `created`: fecha de alta.
- `from`, `bd`, `ac`, `ap`, `br`, `nick`, `nopub`, `bau`, `con`, `dis`, `mn`, `nt`, `pic`: metadatos opcionales usados por diferentes vistas o funciones.
- El ID de documento es la clave de miembro referenciada por asistencia, devocionales, seguimientos, puntos y perfiles.

**Operaciones:** la consulta de fichas se realiza mediante la función protegida `getPrivateMembers`. La edición administrativa se hace únicamente mediante `adminUpdateMember`, con rol admin/administrador/pastor y una lista permitida de campos; los campos históricos no enviados se conservan. La ficha no se modifica desde el perfil público.

## Colecciones que deben mantenerse compatibles

| Colección / ruta | Estructura observada | Estado en reconstrucción |
|---|---|---|
| `users/{uid}` | `name`, `user`, `role` | Se lee para validar la sesión. |
| `members/{id}` | ficha de joven; ver arriba | Consulta en tiempo real de solo lectura. |
| `attendance/{fecha}_{servicio}` | `{ r: { [memberId]: { s, h, e, rs, n, ... } } }` | Pendiente. No cambiar el ID ni aplanar `r`. |
| `devotionals/{semana}` | `{ r: { [memberId]: { ok, at, n, rf, ... } } }` | Pendiente. |
| `followups/{id}` | `m`, `d`, `t`, `n`, `c`, `u`, opcional `nx` | Pendiente. |
| `visitors/{id}` | `name`, `phone`, `created`, `vs`, `by`, `st`, opcional `mid` | Pendiente. |
| `prayers/{id}` | `m`, `t`, `d`, `st`, `u`, `c`, opcional `rd` | Pendiente. |
| `events/{id}` | `t`, `d`, `h`, `p`, `n`, `by`, `cf`, `pg`, `q` | Pendiente. |
| `settings/main` | ajustes anidados, incluyendo `pub`, `pts`, `goal`, `rt`, `jw` | Pendiente. |
| `checkins/{code}_{memberId}` | `m`, `d`, `s`, `c`, `t` | Pendiente; no implementar sin validar el flujo QR y sus reglas. |
| `public/ranking` | resumen agregado del ranking | Pendiente. |
| `photos/{memberId}` | avatar, accesorios, saldo y puntos | Pendiente; validar titularidad y reglas. |
| `fotoPend/{memberId}` | `p`, `c` | Pendiente. |
| `bonus/{id}` | `m`, `p`, `why`, `d`, `u`, `c` | Pendiente. |
| `pastoral/{id}` | `m`, `t`, `d`, `u`, `c` | Pendiente; restringido por rol. |
| `turnos/{semana}` | `{ r: { [ministerio]: [memberId, ...] } }` | Pendiente. |
| `inbox/{id}` | `k`, `i`, `n`, `t`, `d`, `c` | Pendiente; contenido potencialmente privado. |
| `audit/{id}` | `t`, `u`, `x` y metadatos opcionales | Pendiente; mantener histórico append-only. |
| `backups/{id}` | `d`, `k`, `j`, `n`, `t`, `by`, `x` | No implementar hasta revisar permisos y privacidad. |

## Entorno y seguridad

- El proyecto de desarrollo bloquea el ID Firebase `jovenes-de-fuego`.
- No se deben pegar credenciales de cuentas de servicio ni contraseñas en el frontend.
- No desplegar reglas antiguas sin revisión. El análisis estático detectó permisos amplios en varias colecciones.
- Antes de probar, usar un proyecto Firebase independiente, cuentas ficticias y datos sintéticos.
- Las nuevas escrituras descritas en esta sección se ejecutan por Cloud Functions; no se abren reglas de cliente en Firestore.


## Portal juvenil — nuevas colecciones aisladas

Estas colecciones pertenecen a la nueva experiencia juvenil. No reemplazan ni reescriben los contratos históricos anteriores.

### `weeklyActivities/{id}`
Campos creados por `adminSaveWeeklyActivity`: `title`, `description`, `date` (AAAA-MM-DD), `time` (HH:mm opcional), `location`, `published`, `createdAt`, `updatedAt`, `updatedBy`. La lectura pública devuelve únicamente actividades con `published === true`. La creación/edición requiere usuario autenticado con rol admin, administrador o pastor. Las actividades se muestran en el portal durante la semana calendario actual.

### `publicPrayerRequests/{id}`
Campos: `requester`, `category`, `message`, `status`, `createdAt`, `source`; cambios de estado añaden `updatedAt` y `updatedBy`. El joven puede enviar una solicitud pública mediante Cloud Function; la consulta y actualización de estado requieren rol admin, administrador o pastor. No se publica el contenido de las solicitudes a los demás jóvenes.

### `publicPrayerRateLimits/{hash}`
Control diario de hasta 50 envíos por dirección de red anonimizada mediante SHA-256, para evitar bloquear grupos que comparten una red Wi-Fi. Contiene contador, día y `expiresAt` como Timestamp de Firestore para retención limitada. Configurar una política TTL en Firestore para `expiresAt` cuando el proyecto de Staging esté preparado.

### Funciones administrativas y públicas

- `getMyApplicationProfile`: valida la sesión y lee `users/{uid}` desde servidor, sin conceder al navegador lectura directa de la colección `users`.
- `getPublicProfiles`: lee perfiles publicados, devuelve campos públicos y puntos, y excluye perfiles marcados `nopub` tanto en `publicProfiles` como en `members`.
- `getPrivateMembers`: devuelve fichas a usuarios autenticados con rol admin, administrador, pastor o líder. Para líderes devuelve solo ID, nombre, apodo y foto; administración/pastoral reciben la ficha completa. La edición de fichas mediante `adminUpdateMember` sigue restringida a admin, administrador y pastor. La sincronización opcional de `members` y `publicProfiles` se realiza con un batch atómico.
- `adminUpdateMember`: actualiza una lista permitida de campos de `members/{id}`; mantiene los campos históricos no enviados. Si existe `publicProfiles/{id}`, sincroniza nombre, apodo, foto y `nopub` en una operación batch.
- `getPublicWeeklyActivities`, `adminListWeeklyActivities`, `adminSaveWeeklyActivity`.
- `getAttendanceMeetings`, `createAttendanceMeeting`, `saveMeetingAttendance`: gestionan únicamente `attendanceMeetings`; la consulta de jóvenes se valida contra `members/{id}`.
- `submitPublicPrayerRequest`, `adminGetPrayerRequests`, `adminUpdatePrayerStatus`.
- `getPublicHallOfFame`: el top 3 se ordena por el campo público `points`/`puntos`; el top 10 suma únicamente reuniones de `attendanceMeetings/{id}.participants[]` con `status === "Presente"` y cuyo `memberId` coincide con un perfil público visible. Escanea hasta las 1.000 reuniones nuevas más recientes y devuelve `attendanceLimited` si hay más registros. No interpreta ni modifica el formato histórico `attendance/{fecha}_{servicio}.r`.

## Personalización cosmética

Los marcos y fondos elegidos en el portal se guardan en el almacenamiento local del navegador bajo una clave ligada al ID público del perfil. No escriben datos en Firebase ni prueban la identidad del joven. Las partidas y sus puntos siguen siendo locales/no oficiales: no se envían al ranking hasta diseñar una verificación de identidad y un flujo servidor anti-trampas.

## Estado de despliegue

El código de Cloud Functions y frontend debe compilarse y probarse en Staging, y las funciones nuevas deben desplegarse en el proyecto Firebase `jovenes-de-fuego-staging` antes de que las nuevas llamadas funcionen. Las reglas de Firestore se mantienen cerradas; no desplegar cambios de reglas como parte de esta fase.


### `attendanceMeetings/{id}` — reuniones de la reconstrucción

Colección nueva y aislada para el módulo de asistencia de esta reconstrucción. Campos: `name`, `date` (AAAA-MM-DD), `createdBy`, `createdAt`, `participants` (lista de `{ memberId, name, status }`) y, después del primer guardado, `updatedAt`/`updatedBy`. Las funciones `getAttendanceMeetings`, `createAttendanceMeeting` y `saveMeetingAttendance` requieren autenticación y un rol reconocido. La función vuelve a consultar el nombre real del joven en `members/{id}` y valida los estados permitidos. Esta colección no reemplaza ni modifica `attendance/{fecha}_{servicio}`.

## Extensiones protegidas de la reconstrucción

Las siguientes funciones usan Firebase Admin SDK desde Cloud Functions. El navegador no debe leer ni escribir directamente estas colecciones para que los módulos funcionen:

| Callable | Colección histórica/nueva | Permisos |
|---|---|---|
| getFollowups, createFollowup, updateFollowupStatus, deleteFollowup | followups | Autenticado con rol staff; líderes solo consultan/modifican sus propios registros. |
| getVisitors, createVisitor, updateVisitorStatus, deleteVisitor | visitors | Autenticado con rol staff; teléfono/correo/notas solo para admin/pastor o propietario del registro. |
| getDevotionals, createDevotional, deleteDevotional | devotionals | Lectura staff; escritura admin/pastor. |
| getManagedRecords, createManagedRecord, updateManagedRecord, updateManagedRecordStatus, deleteManagedRecord | inbox, turnos | Lista cerrada de colecciones y campos; Bandeja solo admin/pastor, Turnos staff. |
| getCheckins, createCheckin | attendanceMeetings | Autenticado con rol staff; servidor valida miembro/fecha/servicio y previene duplicados. QR comparte el historial nuevo de Asistencia. |
| getPhotos, createPhotoRequest, approvePhoto, rejectPhoto, deleteApprovedPhoto | fotoPend, photos | Lectura/envío staff; moderación admin/pastor; enlaces HTTPS. |
| getManagementData, createManagementRecord | bonus, pastoral, users, audit, settings | Lectura y escritura con allowlist; notas pastorales admin/pastor; módulos de administración restringidos. |

Todas las funciones requieren identidad Firebase cuando manejan datos internos. Las validaciones de rol se realizan en el servidor leyendo users/{uid}; los botones ocultos en React son únicamente experiencia de usuario y no sustituyen autorización.

Los registros temporales que antes estaban codificados en las pantallas de Seguimiento y Visitantes se han retirado. Esas pantallas ahora utilizan las colecciones existentes followups y visitors, con metadatos createdBy, createdAt, updatedBy y updatedAt. Los datos ficticios no se migran ni se guardan.

## Acceso juvenil a perfiles públicos

El callable getPublicProfiles se ejecuta en la región us-central1 por defecto. El cliente usa la misma región; puede configurarse mediante VITE_FIREBASE_FUNCTIONS_REGION, pero el valor del frontend y la región de despliegue deben coincidir. Una respuesta functions/not-found significa que el callable no está publicado en el proyecto/región consultado; un deploy de Vercel no despliega Firebase Functions.

El archivo FIREBASE-STAGING-DEPLOY.md documenta un flujo manual que despliega únicamente Functions al proyecto jovenes-de-fuego-staging. No despliega reglas Firestore, Hosting ni recursos de producción.
