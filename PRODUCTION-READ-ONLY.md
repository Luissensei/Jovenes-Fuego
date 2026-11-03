# Conexión de producción en modo solo lectura

Esta reconstrucción puede conectarse al Firebase original `jovenes-de-fuego`
sin inicializar Firebase Cloud Functions y sin habilitar escrituras desde la
interfaz.

## Configuración de Vercel

Configura estas variables únicamente en el entorno **Production** del proyecto
de Vercel:

- `VITE_FIREBASE_PROJECT_ID=jovenes-de-fuego`
- `VITE_FIREBASE_READ_ONLY_PRODUCTION=true`
- `VITE_FIREBASE_API_KEY`: valor de la aplicación web original en Firebase.
- `VITE_FIREBASE_AUTH_DOMAIN`: valor de la aplicación web original.
- `VITE_FIREBASE_APP_ID`: valor de la aplicación web original.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: valor original, si está configurado.
- `VITE_FIREBASE_STORAGE_BUCKET`: valor original, si está configurado.

Obtén esos valores en Firebase Console → Configuración del proyecto →
General → Tus aplicaciones → aplicación web → configuración del SDK.

Mantén las variables de **Preview** y **Development** apuntando a
`jovenes-de-fuego-staging` y con
`VITE_FIREBASE_READ_ONLY_PRODUCTION=false`. No copies la configuración
original en Preview ni en Development.

## Lecturas habilitadas

- Firebase Authentication autentica contra el proyecto elegido por las
  variables del entorno.
- Después del inicio de sesión se lee únicamente
  `users/{uid}` del usuario autenticado para validar su rol.
- El selector público consulta únicamente `publicProfiles`, con
  `nopub == false` y un máximo de 200 documentos.
- No se consulta la colección privada `members` desde el navegador.
- Firebase Functions no se inicializa en el modo de producción de solo lectura.
- La navegación interna de producción se limita a Clasificación, Juegos y
  Perfil público.

Los documentos de `publicProfiles` deben contener únicamente campos
aprobados para mostrarse públicamente y tener `nopub: false`. Los perfiles
sin ese indicador explícito no se mostrarán. La colección debe estar
sincronizada con el estado de publicación de los miembros antes de activar
esta lectura pública.

## Escrituras bloqueadas

Los repositorios de Firestore comprueban el modo de solo lectura antes de
crear, editar, aprobar, rechazar o borrar documentos. Las funciones callable
no se inicializan en este modo. Las otras secciones administrativas no se
muestran.

Las funciones del portal que todavía dependen de Cloud Functions (por ejemplo,
actividades, salón de la fama basado en asistencias y envío de peticiones)
no quedan habilitadas por este cambio. Deben migrarse por separado con reglas
de seguridad adecuadas antes de activarlas.

## Reglas de Firestore: revisión obligatoria

No desplegar `firestore.rules` de este repositorio en producción: ese archivo
contiene una regla global que deniega todo acceso y corresponde al entorno
de desarrollo.

Antes de activar Production, inspecciona las reglas que ya existen en el
proyecto original. Para que las dos lecturas anteriores funcionen, las reglas
existentes deben restringir el acceso al propio documento de usuario y a los
documentos públicos explícitos. Como referencia conceptual, los permisos
mínimos son:

```javascript
match /users/{uid} {
  allow get: if request.auth != null && request.auth.uid == uid;
  allow list, create, update, delete: if false;
}

match /publicProfiles/{profileId} {
  allow get: if resource.data.nopub == false;
  allow list: if resource.data.nopub == false
    && request.query.limit <= 200;
  allow create, update, delete: if false;
}
```

Este fragmento es una referencia para revisión, no una regla lista para
reemplazar las reglas existentes. Las reglas de Firestore se combinan por
concesión: cualquier otra regla que permita una lectura más amplia puede
seguir permitiéndola. Además, Firestore Rules no oculta campos individuales
de un documento; por eso `publicProfiles` debe contener exclusivamente datos
públicos.

Si las reglas actuales niegan estas lecturas, la aplicación mostrará el error
de permisos y no intentará abrir permisos automáticamente. No cambiar las
reglas originales sin auditar el archivo completo y los documentos reales.
