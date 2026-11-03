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
- Ninguna escritura de negocio se ha añadido en esta fase.


## Portal juvenil — nuevas colecciones aisladas

Estas colecciones pertenecen a la nueva experiencia juvenil. No reemplazan ni reescriben los contratos históricos anteriores.

### `weeklyActivities/{id}`
Campos creados por `adminSaveWeeklyActivity`: `title`, `description`, `date` (AAAA-MM-DD), `time` (HH:mm opcional), `location`, `published`, `createdAt`, `updatedAt`, `updatedBy`. La lectura pública devuelve únicamente actividades con `published === true`. La creación/edición requiere usuario autenticado con rol admin, administrador o pastor. Las actividades se muestran en el portal durante la semana calendario actual.

### `publicPrayerRequests/{id}`
Campos: `requester`, `category`, `message`, `status`, `createdAt`, `source`; cambios de estado añaden `updatedAt` y `updatedBy`. El joven puede enviar una solicitud pública mediante Cloud Function; la consulta y actualización de estado requieren rol admin, administrador o pastor. No se publica el contenido de las solicitudes a los demás jóvenes.

### `publicPrayerRateLimits/{hash}`
Control diario de hasta tres envíos por dirección de red anonimizada mediante SHA-256. Contiene contador, día y una fecha `expiresAt` prevista para retención limitada. Configurar una política TTL en Firestore para `expiresAt` cuando el proyecto de Staging esté preparado.

### Funciones administrativas y públicas

- `getPublicProfiles`: lee perfiles publicados y devuelve campos públicos y puntos.
- `getPrivateMembers`: devuelve fichas solo a usuarios admin/pastor.
- `adminUpdateMember`: actualiza una lista permitida de campos de `members/{id}`; mantiene los campos históricos no enviados. Si existe `publicProfiles/{id}`, sincroniza nombre, apodo y foto.
- `getPublicWeeklyActivities`, `adminListWeeklyActivities`, `adminSaveWeeklyActivity`.
- `submitPublicPrayerRequest`, `adminGetPrayerRequests`, `adminUpdatePrayerStatus`.
- `getPublicHallOfFame`: el top 3 se ordena por el campo público `points`/ `puntos`; el top 10 suma únicamente `attendance/{id}.participants[]` con `status === "Presente"` y cuyo `memberId` coincide con un documento de `publicProfiles`. No interpreta el formato histórico `attendance/{fecha}_{servicio}.r`, por lo que no debe presentarse como un conteo histórico completo.

## Personalización cosmética

Los marcos y fondos elegidos en el portal se guardan en el almacenamiento local del navegador bajo una clave ligada al ID público del perfil. No escriben datos en Firebase ni prueban la identidad del joven. Las partidas y sus puntos siguen siendo locales/no oficiales: no se envían al ranking hasta diseñar una verificación de identidad y un flujo servidor anti-trampas.

## Estado de despliegue

El código de Cloud Functions y frontend debe compilarse y probarse en Staging, y las funciones nuevas deben desplegarse en el proyecto Firebase `jovenes-de-fuego-staging` antes de que las nuevas llamadas funcionen. Las reglas de Firestore se mantienen cerradas; no desplegar cambios de reglas como parte de esta fase.
