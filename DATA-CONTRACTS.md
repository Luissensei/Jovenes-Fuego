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

**Operaciones de esta reconstrucción:** lectura en tiempo real y búsqueda local por nombre, apodo o teléfono. No se añade, edita ni elimina ningún documento. La seguridad efectiva depende de las reglas Firestore.

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
| `public/ranking` | resumen agregado del ranking | Pendiente de validar con los datos originales. |
| `publicProfiles/{memberId}` | proyección pública `name`, `nick`, `pic` y `points` opcional | Usada por el selector y la clasificación; lectura mediante callable allowlisted. No se escribe desde el frontend. Su origen y sincronización con los miembros todavía deben validarse. |
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
