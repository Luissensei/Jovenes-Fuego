# Auditoría de dependencias — Jóvenes de Fuego

## Entornos separados

- **Frontend Vite:** compilado como aplicación web de navegador; usa Firebase Web SDK.
- **Cloud Functions:** carpeta `functions/`, Node.js 22, `firebase-admin` y `firebase-functions`.
- **Firebase Staging:** proyecto de pruebas independiente. Ningún cambio de este branch modifica producción ni despliega reglas o funciones.

## Dependencias principales

| Área | Versión / entorno | Estado |
|---|---|---|
| Firebase Web SDK | 13.1.0 (al aprobarse la actualización automatizada) | Build y lint verificados; ver nota gRPC |
| React Router DOM | 7.18.0 | Versión con corrección de los avisos de redirección conocidos |
| Firebase Admin | 13.10.0 | Dependencia servidor en `functions/` |
| Firebase Functions | 7.4.0 | Dependencia servidor en `functions/` |
| Cloud Functions Node | 22 | Revisado por separado en CI |

## Aviso gRPC transitivo del SDK web

El paquete `@firebase/firestore` incluye una dependencia para transporte gRPC de Node en el rango `~1.9.0`, que puede resolver `@grpc/grpc-js@1.9.16`. Los avisos GHSA-m9gg-hp2v-232j y GHSA-f596-whhp-79r4 afectan a versiones anteriores a 1.13.6 (y a algunos rangos 1.14.x anteriores a 1.14.5).

Para este frontend, Firestore se ejecuta en navegador y usa WebChannel, no el transporte gRPC de Node. El proyecto de Firebase documenta que la copia gRPC incluida por Firestore no se carga en aplicaciones web-only. Por eso CI clasifica esa cadena transitiva y la mantiene visible como aviso pendiente, sin forzar un override fuera del rango declarado por Firebase.

**No debe considerarse resuelto upstream.** Debe revisarse nuevamente cuando Firebase amplíe el rango de `@grpc/grpc-js`. Si se incorpora SSR, Firebase Admin o ejecución Node de Firestore en el frontend, se debe reevaluar antes de desplegar.

## Backend Functions

El lockfile independiente de `functions/` resuelve `@grpc/grpc-js@1.14.7`, versión posterior a los parches indicados. CI ejecuta instalación, build, lint y `npm audit --omit=dev` de Functions por separado.

## Verificación

La rama de rediseño ejecuta:

1. `npm ci`, `npm run build` y `npm run lint` del frontend.
2. Instalación, build y lint de `functions/` con Node 22.
3. Auditoría runtime del frontend y de Functions por separado.

No utilizar `npm audit fix --force` ni overrides amplios para ocultar avisos. Toda actualización mayor debe pasar build, lint y validación funcional en Staging antes de fusionarse.
