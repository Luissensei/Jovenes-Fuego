# Propuestas de mejora — Jóvenes de Fuego

Este documento organiza las mejoras funcionales, visuales y técnicas de la reconstrucción. Las propuestas no autorizan cambios en producción: primero se revisan los contratos de datos y se valida todo en Firebase Staging.

## Objetivo

Conservar las funciones y la información que utiliza la iglesia, pero ofrecer una aplicación moderna, rápida, adaptable a celulares y computadores, con navegación clara y controles de acceso seguros.

## Prioridad inmediata — estabilidad y seguridad

| Estado | Mejora | Resultado esperado |
|---|---|---|
| En esta rama | Corregir Informes para consultar reuniones y jóvenes mediante Cloud Functions protegidas. | La página deja de importar suscripciones inexistentes y no depende de lectura directa de Firestore. |
| Pendiente de validar | Compilación TypeScript, construcción Vite y previsualización Vercel. | No integrar cambios hasta que la compilación de Staging termine sin errores. |
| Pendiente | Auditar todas las lecturas y escrituras de Firestore que siguen en el navegador. | Ningún módulo dependerá de permisos amplios o reglas abiertas en el cliente. |
| Pendiente | Completar el inventario de colecciones, campos, documentos históricos y roles. | Cada función nueva tendrá un contrato compatible con los datos existentes. |
| Pendiente | Añadir pruebas a los permisos por rol y a las funciones críticas. | Verificar que un joven, líder, pastor y administrador solo puedan hacer lo permitido. |

## Mejoras funcionales por módulo

### Panel principal
- Mostrar un resumen del mes: asistencia, visitantes, actividades y peticiones pendientes.
- Añadir accesos rápidos a las tareas frecuentes.
- Mostrar avisos importantes sin saturar la pantalla.

### Jóvenes y perfiles
- Búsqueda por nombre o apodo y filtros por estado.
- Fichas más claras con datos agrupados y edición según permisos.
- Mantener el control de privacidad para que un perfil marcado como no público no aparezca en el portal ni en el ranking.
- Evitar mostrar teléfonos, fechas de nacimiento y notas privadas a roles que no los necesitan.

### Asistencia y Check-in QR
- Unificar el flujo de asistencia para evitar que el registro normal y el QR generen historiales incompatibles.
- Prevenir registros duplicados por joven, reunión y fecha.
- Permitir corregir una asistencia con historial de quién realizó el cambio.
- Añadir filtros por fecha, servicio y grupo.
- Exportar informes completos por periodo, no solo un resumen visual.

### Seguimiento y visitantes
- Registrar responsable, fecha de contacto, resultado y próximo paso.
- Crear recordatorios de seguimiento y alertas de visitas pendientes.
- Mantener un historial de contactos para no perder el acompañamiento.

### Devocionales y actividades
- Calendario semanal y mensual.
- Estado de entrega o cumplimiento por joven.
- Publicación programada y avisos de actividades próximas.
- Validar fechas y horarios antes de guardar.

### Peticiones y bandeja de entrada
- Separar solicitudes nuevas, en proceso y atendidas.
- Restringir las peticiones sensibles a los roles autorizados.
- Registrar quién atendió una petición y cuándo.
- Añadir límites antiabuso sin bloquear a toda la congregación que comparte una misma red.

### Fotos y galería
- Flujo de envío, revisión, aprobación y rechazo.
- Validar enlaces y tamaño de imágenes.
- Registrar quién aprobó o retiró una publicación.
- Permitir ocultar una imagen sin borrar el registro de auditoría.

### Ranking, perfiles y juegos
- Mantener Ranking como centro de juegos, perfiles y retos.
- Pantalla inicial para seleccionar el perfil juvenil sin pedir una contraseña individual, sin convertir esa selección en una autenticación administrativa.
- Separar los puntos por actividad y conservar el historial de cambios.
- Añadir retos bíblicos, preguntas por categorías, niveles y recompensas.
- Evitar que el navegador pueda asignar puntos o alterar rankings directamente.

### Informes
- Filtros por mes, rango de fechas y tipo de reunión.
- Indicadores de asistencia, ausencias justificadas y participación.
- Exportación CSV con todos los registros del periodo.
- Comparación entre periodos y gráficos sencillos.

### Administración y auditoría
- Roles definidos en el servidor, no solo ocultando botones.
- Historial de acciones importantes: quién cambió un perfil, asistencia, puntos o publicación.
- Confirmación para acciones destructivas y posibilidad de corregir errores con trazabilidad.
- Configuración de usuarios y permisos con acceso exclusivo para administración.

## Mejoras visuales y de experiencia

1. Mantener modo claro y oscuro, con preferencia guardada.
2. Diseñar primero para celular: botones cómodos, tablas desplazables y formularios cortos.
3. Unificar colores, tipografías, tamaños, tarjetas, iconos y estados de botones.
4. Añadir búsqueda, filtros, paginación y mensajes claros de carga, error y éxito.
5. Mejorar accesibilidad: contraste, etiquetas, navegación por teclado y textos alternativos.
6. Evitar pantallas vacías: explicar qué falta y qué acción puede realizar el usuario.

## Mejoras técnicas recomendadas

- Mantener Firebase Staging separado de producción y verificar el ID de proyecto antes de cualquier despliegue.
- Encapsular las operaciones de datos en servicios y Cloud Functions validadas por rol.
- Aplicar paginación y límites en consultas grandes.
- Añadir validación tanto en el navegador como en el servidor.
- Incorporar pruebas automáticas para compilación, reglas, funciones y flujos principales.
- Añadir registro de errores sin guardar contraseñas, tokens ni datos privados innecesarios.
- Revisar dependencias y actualizar versiones de forma controlada.
- Preparar una PWA instalable después de estabilizar la versión web.
- Definir copias de seguridad y un procedimiento de recuperación antes de cualquier migración.

## Orden sugerido de ejecución

| Etapa | Alcance | Criterio para darla por terminada |
|---|---|---|
| 1. Estabilización | Compilación, login, perfiles, permisos e informes. | Build de Vercel correcto y pruebas básicas aprobadas en Staging. |
| 2. Datos y módulos | Auditoría de contratos y migración segura de módulos que usan Firestore directamente. | Cada módulo funciona con reglas cerradas y datos de prueba controlados. |
| 3. Experiencia | Diseño adaptable, navegación, formularios, búsqueda y accesibilidad. | Pruebas en celular y computador sin errores visuales críticos. |
| 4. Ranking y juegos | Selección de perfil, retos, puntos e historial. | Los puntos se validan en servidor y no se pueden modificar desde el navegador. |
| 5. Lanzamiento | PWA, copias de seguridad, monitoreo y plan de reversión. | Staging aprobado; despliegue de producción revisado y autorizado por separado. |

## Límites que se deben respetar

- No abrir reglas de Firestore para que la aplicación funcione.
- No desplegar funciones, reglas ni hosting a producción durante esta etapa.
- No cambiar nombres de colecciones o campos históricos sin documentar su uso y compatibilidad.
- No copiar ni migrar datos reales a Staging; utilizar cuentas y registros de prueba.
- No considerar una previsualización exitosa hasta comprobar el build y probar los flujos principales.


## Hallazgos de la revisión del código actual

Estos puntos se observaron en los archivos de esta rama y deben considerarse antes de habilitar todos los módulos:

| Archivo o módulo | Estado observado | Trabajo necesario |
|---|---|---|
| `src/services/repositories/devotionals.ts` y `DevotionalsPage.tsx` | Consulta, creación y eliminación directamente en Firestore. | Migrar a funciones protegidas y definir quién puede publicar o eliminar. |
| `src/services/repositories/managedRecords.ts` y `ManagedRecordsPage.tsx` | Lecturas y escrituras directas para registros administrados. | Revisar colección por colección, esquema y roles antes de crear endpoints. |
| `InboxPage.tsx` y `TurnsPage.tsx` | Reutilizan la pantalla de registros administrados. | Dependen de la migración de `managedRecords.ts`. |
| `src/services/repositories/checkins.ts` y `CheckinPage.tsx` | Consulta y creación de registros QR directamente en Firestore. | Migrar y unificar con la asistencia protegida, evitando duplicados. |
| `src/services/repositories/photos.ts` y `PhotosPage.tsx` | Lectura, aprobación, rechazo y eliminación directas en Firestore. | Crear endpoints por rol y definir el flujo de moderación. |
| `src/app/pages/ManagementPages.tsx` | Lee colecciones y escribe puntos extra, notas pastorales y ajustes directamente; también consulta usuarios y auditoría. | Separar permisos de administración y pastoral en el servidor. Nunca exponer notas pastorales ni datos de usuarios mediante reglas abiertas. |
| `src/services/repositories/members.ts` | Conserva una suscripción directa a la colección `members`. | Revisar si quedan consumidores; sustituirlos por el servicio protegido o retirar el código antiguo. |
| `FollowupPage.tsx` | Actualmente usa registros de ejemplo guardados solo en el estado de la pantalla. | Conectar el módulo a almacenamiento persistente con historial y responsables. |
| `VisitorsPage.tsx` | Actualmente usa visitantes de ejemplo guardados solo en el estado de la pantalla. | Implementar almacenamiento persistente, permisos y protección de datos de contacto. |
| `ReportsPage.tsx` | En esta rama ya consulta asistencia y jóvenes mediante Cloud Functions protegidas. | Validar el build y probar los cálculos con datos ficticios de Staging. |

**Importante:** con las reglas actuales de Firestore cerradas, los módulos que todavía usan el SDK directamente no podrán completar esas operaciones. No se deben abrir las reglas para resolverlo. Primero hay que diseñar y probar endpoints con validación de identidad, rol, campos permitidos y límites de consulta.

Los módulos de seguimiento y visitantes tienen datos de demostración locales; no deben tratarse como registros persistentes ni utilizarse para almacenar información real hasta terminar su conexión segura.

## Actualización de implementación — 2 de noviembre de 2026

Se han implementado en esta rama las siguientes migraciones de datos:

| Módulo | Implementado en esta rama | Validación pendiente |
|---|---|---|
| Acceso juvenil y perfiles públicos | Mensajes de error según código de Firebase, función y región explícitas, normalización de perfiles y filtro nopub. | Desplegar getPublicProfiles en Staging y probar con perfiles ficticios. |
| Informes | Consulta protegida de reuniones y miembros; actualización y CSV con protección frente a fórmulas. | Revisar totales con datos de prueba. |
| Seguimiento | Alta, consulta, estado y eliminación mediante Cloud Functions; líderes limitados a sus propios registros. | Pruebas de roles y persistencia en Staging. |
| Visitantes | Alta, consulta, estado y eliminación mediante Cloud Functions; datos privados limitados por rol/propietario. | Pruebas de privacidad por rol. |
| Devocionales | Lectura y cambios mediante Functions; publicación y eliminación solo para administración/pastoral. | Verificar compatibilidad de documentos históricos. |
| Bandeja y Turnos | CRUD por endpoints con colecciones y campos permitidos; la Bandeja queda para administración/pastoral. | Verificar campos históricos y autorización. |
| Check-in QR | Consulta/registro por servidor y unificación con attendanceMeetings, con prevención de duplicados. | Probar conflictos concurrentes y reuniones antiguas. |
| Fotos | Lectura, envío, aprobación, rechazo y eliminación por Functions; moderación admin/pastor. | Probar compatibilidad de imágenes/estados antiguos. |
| Puntos extra, notas pastorales, usuarios, auditoría y ajustes | Lecturas allowlist y escrituras controladas mediante Functions. | Revisar los esquemas históricos y permisos reales de cada rol. |

### Pendientes que no deben resolverse abriendo Firestore

- Desplegar las Cloud Functions en jovenes-de-fuego-staging. El despliegue de Vercel no publica Cloud Functions. El flujo manual está documentado en FIREBASE-STAGING-DEPLOY.md.
- Ejecutar los workflows de compilación. Se añadió cancelación de validaciones antiguas en cola para priorizar el commit más reciente.
- Confirmar la región us-central1 o configurar VITE_FIREBASE_FUNCTIONS_REGION para que coincida con la región desplegada.
- Terminar el mapeo y las pruebas de compatibilidad con los datos históricos. No se ha hecho migración de datos.
- El sistema de puntos oficiales de juegos sigue pendiente: las puntuaciones actuales de las partidas son locales y no deben enviarse al ranking por un perfil público seleccionable. Antes se necesita una identidad juvenil vinculada a una cuenta autenticada y verificación de respuestas en servidor.
- Terminar PWA instalable, panel resumen, filtros/paginación, accesibilidad, pruebas automatizadas y revisión integral en dispositivos móviles.

### Estado de pruebas y despliegue

El código de esta rama ha generado workflows de validación de frontend y Functions, pero sus ejecuciones más recientes están en cola. Vercel ha devuelto el estado build-rate-limit, que es un límite de builds del proveedor y no un error TypeScript. Ninguna de estas condiciones se considera una compilación aprobada.

No se han desplegado Functions, reglas ni Hosting desde esta conversación. No se ha tocado producción. Firestore Rules permanecen cerradas.


### Actualización adicional del panel y la instalación

- El panel principal ahora consume getDashboardSummary y muestra indicadores reales con respuesta distinta según el rol. Las cuentas juveniles solo reciben agregados públicos; no ven métricas internas de seguimiento, visitantes o peticiones.
- La aplicación ya cuenta con manifest, iconos instalables y service worker. El service worker está limitado a la carcasa estática y recursos del mismo origen; no almacena respuestas de Firebase ni documentos privados. Se añadió el icono de inicio de iOS.
- El repositorio conserva una capa de compatibilidad para subscribeMembers, pero ahora obtiene los datos a través de la callable protegida en lugar de Firestore directo.


### Validación técnica adicional — 2 de noviembre de 2026

- En la revisión del commit 38d8b6de9c1d35898724d9f291e4fc086b7e0636, GitHub Actions ejecutó correctamente ESLint y TypeScript de Firebase Functions.
- El build del frontend también se había completado correctamente en una ejecución anterior; el último commit añadió únicamente el aviso visual sobre puntuaciones de práctica, y su ejecución asociada aún debe concluir.
- Los errores de ESLint que bloqueaban Functions se corrigieron alineando reglas heredadas de formato con TypeScript. Los errores de tipos de la configuración de Bandeja/Turnos se corrigieron con un tipo explícito.
- La aprobación de scripts npm queda limitada a @firebase/util, esbuild y protobufjs en versiones concretas; re2 permanece bloqueado.
- El límite de Vercel build-rate-limit sigue siendo externo a la compilación del código y ha impedido obtener una nueva previsualización en Vercel.
