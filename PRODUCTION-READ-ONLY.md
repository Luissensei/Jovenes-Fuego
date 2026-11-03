# Conexión con Firebase original en modo solo lectura

La reconstrucción puede conectarse al proyecto original `jovenes-de-fuego`
sin desplegar Cloud Functions y sin habilitar escrituras desde la interfaz.

## Configuración de Vercel

Configura estas variables únicamente en el entorno **Production** del proyecto
Vercel que servirá la nueva aplicación:

- `VITE_FIREBASE_PROJECT_ID=jovenes-de-fuego`
- `VITE_FIREBASE_READ_ONLY_PRODUCTION=true`
- `VITE_FIREBASE_API_KEY`: API key de la app web original.
- `VITE_FIREBASE_AUTH_DOMAIN=jovenes-de-fuego.firebaseapp.com`
- `VITE_FIREBASE_APP_ID`: app ID web original.
- `VITE_FIREBASE_MESSAGING_SENDER_ID=222344810816`
- `VITE_FIREBASE_STORAGE_BUCKET=jovenes-de-fuego.firebasestorage.app`

Los valores web públicos se consultan en Firebase Console → Configuración del
proyecto → General → Tus aplicaciones → app web → configuración del SDK.

Mantén **Preview** y **Development** apuntando a
`jovenes-de-fuego-staging` con
`VITE_FIREBASE_READ_ONLY_PRODUCTION=false`. No copies las variables originales
en Preview ni Development.

## Esquema original confirmado

La antigua aplicación publica el selector de perfiles y los datos del ranking
en el documento `public/ranking`. El campo `all` contiene los perfiles
publicados. La aplicación original construye esa lista excluyendo los jóvenes
con `members/{id}.nopub === true`, y aplica antes el formato de nombre público
configurado por el administrador.

La nueva interfaz lee solamente:

1. `users/{uid}`: documento del usuario que ha iniciado sesión, para validar
   su propio rol.
2. `public/ranking`: documento público de ranking; de su campo `all` se usan
   únicamente `i` (ID), `n` (nombre público) y `t` (puntos del mes).
3. `photos/{memberId}`: documentos de fotos de los IDs que ya aparecen en
   `public/ranking.all`; solo se utiliza el campo público `p` (foto JPEG).

No se consulta `members` desde el navegador, y no se consulta la colección
inventada `publicProfiles`. Así se conserva el selector original y se respeta
la lista de privacidad que ya publica la aplicación anterior.

## Acceso y funciones

- Firebase Authentication inicia sesión en el proyecto original.
- Tras iniciar sesión, se lee exclusivamente `users/{uid}`.
- Firebase Functions no se inicializa en este modo.
- El entorno de producción limita la navegación a Clasificación, Juegos y
  Perfil público.
- El portal público puede leer el ranking y los perfiles publicados. Las
  operaciones del portal que todavía dependan de Cloud Functions no estarán
  disponibles hasta migrarlas de manera segura.

## Escrituras bloqueadas

Los repositorios de Firestore comprueban el modo de solo lectura antes de
crear, editar, aprobar, rechazar o eliminar documentos. Los módulos
administrativos no se muestran en producción. No se inicializan callable
Functions en este modo.

Los juegos actuales mantienen sus resultados en el navegador; no se envían
puntos al ranking original.

## Reglas existentes: no reemplazar ni desplegar

Las reglas suministradas para el proyecto original ya permiten:

- Leer `users/{uid}` cuando el UID coincide con el usuario autenticado.
- Obtener el documento `public/ranking` sin iniciar sesión.
- Leer `photos` para mostrar las fotos públicas.
- Leer `members` solo después de autenticar una cuenta con documento
  `users/{uid}`.

No hace falta añadir una regla para `publicProfiles`: esa colección no forma
parte del esquema original usado por el selector heredado.

**No desplegar** el archivo `firestore.rules` de este repositorio sobre el
proyecto original. Ese archivo local corresponde al entorno de desarrollo y
deniega todas las lecturas y escrituras. Tampoco cambies las reglas originales
como parte de esta conexión.

Si `public/ranking` no existe o tiene `off: true`, el selector mostrará una
lista vacía. En ese caso, el administrador debe activar la pantalla pública
desde la aplicación original para que su proceso normal publique el documento.
