# Jóvenes de Fuego

Aplicación web para la gestión de la comunidad juvenil de la Iglesia Cristiana Cuadrangular Alfa y Omega. El frontend utiliza React, TypeScript y Vite; los módulos administrativos y el portal juvenil comparten un sistema visual oscuro, adaptable a escritorio y móvil.

## Proyecto y entorno

Este repositorio está conectado al proyecto Firebase original:

- Firebase Project ID: `jovenes-de-fuego`
- Alias predeterminado de Firebase CLI: `jovenes-de-fuego`
- Aplicación web: `jovenes-fuego.vercel.app`
- Rama de trabajo: `main`

No configures este repositorio para `jovenes-de-fuego-staging`. El archivo `.firebaserc` ya selecciona el proyecto original. La configuración web pública está enlazada en `src/services/firebase/client.ts`; no es una credencial administrativa. Las claves privadas y cuentas de servicio nunca deben guardarse en el frontend ni subirse al repositorio.

## Desarrollo local

Requisitos: Node.js 22 o una versión compatible con Vite 6.

```bash
npm ci
npm run dev
```

Validaciones locales:

```bash
npm run build
npm run lint
```

Para el backend:

```bash
cd functions
npm ci
npm run lint
npm run build
```

Copia `.env.example` a `.env.local` solo si necesitas definir una clave pública de sitio para Firebase App Check. El cliente usa el proyecto original y no lee variables de entorno para cambiar de proyecto.

## Módulos incluidos

- Panel administrativo y directorio de jóvenes.
- Asistencia, historial e informes.
- Check-in por código QR y búsqueda manual.
- Seguimientos, visitantes, devocionales y agenda.
- Peticiones y bandeja de entrada.
- Ranking, juegos bíblicos y perfiles juveniles.
- Fotografías, puntos extra, notas pastorales, turnos y auditoría.
- Administración de líderes, permisos y Fuego AI.
- Portal juvenil con actividades, personalización de perfil y avatar 3D.

Las rutas administrativas se cargan bajo demanda. Los juegos y el lector QR se descargan cuando se abren, para reducir el peso de la primera carga.

## Firebase, permisos y reglas

Las operaciones privilegiadas deben ejecutarse mediante Cloud Functions autenticadas y con validación de rol y permiso en el servidor. No abras colecciones privadas mediante reglas genéricas como `allow read, write: if request.auth != null`.

**Importante sobre Firestore Rules:** el archivo `firestore.rules` incluido actualmente es una configuración de cierre seguro que deniega todas las lecturas y escrituras desde clientes. No lo despliegues como solución definitiva ni lo reemplaces por reglas abiertas. Antes de habilitar operaciones directas desde el navegador hay que definir reglas granulares por colección, rol y propiedad del registro, y probarlas con las cuentas autorizadas.

La compilación del frontend no confirma que las reglas remotas ni las Cloud Functions estén desplegadas. Comprueba el estado del proyecto original en Firebase Console antes de habilitar operaciones administrativas en producción.

## Despliegue de Cloud Functions

El repositorio contiene el flujo manual `.github/workflows/deploy-firebase-original.yml`. Utiliza el entorno de GitHub `firebase-production` y el secreto:

```text
FIREBASE_SERVICE_ACCOUNT_JOVENES_DE_FUEGO
```

El flujo despliega solamente Functions en `jovenes-de-fuego`, después de ejecutar lint y build. No despliega Firestore Rules ni Hosting. Ejecuta ese flujo únicamente cuando la cuenta de servicio y el código de Functions hayan sido revisados.

## Calidad y validación continua

El workflow `.github/workflows/validate-app.yml` ejecuta:

1. Instalación limpia de dependencias.
2. Build de TypeScript y Vite.
3. ESLint para el frontend.
4. Build de Firebase Cloud Functions.

Estas comprobaciones detectan errores de compilación y estilo, pero no sustituyen pruebas funcionales de inicio de sesión, permisos, lectura/escritura en Firestore, cámara QR ni validación visual en dispositivos reales.

## Notas de seguridad

- No subas archivos `.env.local`, credenciales privadas ni JSON de cuentas de servicio.
- No uses reglas globales que permitan acceso a cualquier usuario autenticado.
- No copies datos personales reales a cuentas de prueba.
- Revisa permisos de líderes y usuarios en el servidor, no solamente la visibilidad de botones.
- Verifica manualmente el diseño responsive y los flujos de cada módulo antes de publicar cambios.
