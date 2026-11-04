# Jóvenes de Fuego — frontend React (staging)

Este repositorio es el **andamiaje técnico inicial**, no una reconstrucción funcional terminada. Incluye React + TypeScript + Vite, navegación para los módulos detectados y una barrera que impide inicializar Firebase si el `projectId` es exactamente `jovenes-de-fuego`.

## Requisitos
- Node.js 20 o posterior recomendado
- Proyecto Firebase separado para staging

## Preparar
1. Copia `.env.example` a `.env.local`.
2. Rellena solo los valores de la aplicación web Firebase de **staging**.
3. Comprueba que `VITE_FIREBASE_PROJECT_ID` sea el ID de staging, nunca `jovenes-de-fuego`.
4. Instala dependencias: `npm install`.
5. Ejecuta `npm run dev`.
6. Comprueba compilación con `npm run build`.

## Seguridad
- No pegues contraseñas, claves privadas ni JSON de cuentas de servicio.
- La configuración web Firebase no es una credencial administrativa, pero el acceso debe estar protegido por Authentication y reglas.
- No conectes este frontend a producción.
- No se incluyen reglas de Firestore para desplegar; las reglas originales requieren una revisión separada.
- Se añadió el flujo inicial de autenticación con Firebase Auth y verificación del documento `users/<uid>`. El módulo Jóvenes ya consulta `members` en tiempo real y permite buscar por nombre, apodo o teléfono; es de solo lectura. El resto de los módulos siguen en reconstrucción.
- La PWA incluye manifest; el service worker y las políticas de caché se agregarán después de definir explícitamente qué recursos pueden almacenarse. No cachear respuestas privadas.

## Próximas fases
1. Completar el esquema real de cada colección/campo y matriz de permisos (ver `DATA-CONTRACTS.md`).
2. Configurar staging y Firebase Emulator Suite.
3. Implementar autenticación y repositorios tipados.
4. Implementar cada módulo y pruebas de contrato.
5. Pruebas por rol y pruebas responsive/PWA.
6. Publicación solo con autorización explícita y plan de reversión.

## Configuración de Firebase staging

El archivo `.env.local` de este paquete está preparado para el proyecto `jovenes-de-fuego-staging` que se indicó al registrar la app web. No contiene credenciales de cuenta de servicio. Antes de iniciar sesión, en Firebase Console debes habilitar **Authentication → Sign-in method → Email/Password** y crear la base de **Firestore Database** en este proyecto de staging. Después crea un usuario de prueba en Authentication y su documento `users/{UID}` con campos `name`, `user` y `role` (por ejemplo `admin`). Las reglas de staging deben permitir los accesos requeridos; no publiques las reglas originales sin revisión. No copies datos personales reales de producción.

Para iniciar en un computador: `npm install`, luego `npm run dev`. Para compilar: `npm run build`. El archivo `.env.local` se excluye de Git mediante `.gitignore`; para Netlify debes configurar las mismas variables `VITE_FIREBASE_*` en el contexto de deploy de prueba, nunca en el sitio de producción por accidente.


## Fuego AI y nueva administración

La nueva interfaz incorpora dos experiencias de Fuego AI: acompañamiento devocional para el portal juvenil y asistencia de planificación/redacción para administración. La conexión utiliza Firebase AI Logic con Gemini y solo se habilita en el proyecto Firebase Staging.

Para habilitarla en Staging:
1. En Firebase Console del proyecto `jovenes-de-fuego-staging`, completa el asistente **AI Logic** y habilita Gemini Developer API.
2. Registra/activa una clave de sitio de reCAPTCHA v3 para la app web y configura App Check para Firebase AI Logic.
3. Añade `VITE_FIREBASE_APP_CHECK_SITE_KEY` al entorno Preview/Staging de Vercel. No la configures en Production.
4. Despliega los cambios de frontend en Preview/Staging y prueba con cuentas y perfiles ficticios.
5. La interfaz mantiene la conversación solo en memoria del navegador; no se almacenan chats devocionales ni se comparten con líderes.

La gestión avanzada de líderes debe utilizar exclusivamente las Cloud Functions administrativas protegidas. No otorgues permisos de lectura directa de `users` al navegador ni despliegues estas funciones en producción como parte de la prueba.


### Gestión avanzada de líderes

La administración de líderes se ejecuta mediante las callable Cloud Functions `adminListLeaders`, `adminCreateLeader` y `adminUpdateLeader`. Estas funciones exigen rol `admin` o `administrador`; las cuentas nuevas reciben un enlace de configuración de contraseña y no se guarda una contraseña temporal en el sistema. La suspensión deshabilita Authentication y conserva `users/{uid}`, grupos, permisos y auditoría para permitir una restauración. Los permisos de módulos se leen desde el perfil autenticado. Despliega estas funciones únicamente en el proyecto Firebase Staging y comprueba App Check/reglas antes de probar.


### Bloqueo adicional de escrituras en producción

Los formularios antiguos de puntos extra, notas pastorales y ajustes generales pasan por `assertFirebaseWritesAllowed()`. Las Cloud Functions que escriben miembros, actividades, peticiones, reuniones, asistencias y cuentas de líderes verifican además que el proyecto de ejecución sea exactamente `jovenes-de-fuego-staging`. Un despliegue accidental de estas funciones en otro proyecto rechazará las operaciones.
