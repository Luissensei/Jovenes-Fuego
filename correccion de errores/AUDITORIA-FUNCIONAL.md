# Auditoría funcional y mejoras — Jóvenes de Fuego

Fecha de revisión: 5 de noviembre de 2026  
Rama revisada: `main`  
Proyecto de datos esperado: Firebase original `jovenes-de-fuego`

## Criterio de revisión

Esta revisión inspecciona el registro de módulos, el enrutamiento, las pantallas React, los servicios cliente y las funciones callable de Firebase. "Conectado en código" significa que la interfaz tiene una ruta de lectura/escritura identificable y una validación de servidor; no equivale a una prueba real con una cuenta o datos de producción. Las pruebas de interacción en navegador y la verificación visual en Vercel siguen pendientes.

## Matriz de módulos

| Módulo | Estado observado en código | Observaciones / mejora |
|---|---|---|
| Panel principal | Conectado | Ranking y agenda usan datos reales; se añadió indicador mensual de asistencia para roles con permiso. |
| Fuego AI | Conectado | Carga diferida; requiere revisar límites, errores y disponibilidad del modelo en producción. |
| Jóvenes | Conectado | Consulta privada y edición mediante callable; los líderes reciben campos reducidos. |
| Asistencia | Conectado | Reuniones modernas e historial legado; registro de asistencia mediante Functions. |
| Seguimiento | Mejorado | Ahora permite seleccionar un joven real y persiste su `memberId`; la función valida el registro en servidor. Los registros históricos siguen en solo lectura. |
| Devocionales | Conectado en código | Usa endpoints administrativos; falta prueba de publicación y lectura con perfiles reales. |
| Visitantes | Conectado | CRUD mediante funciones administradas; los registros legados se muestran como históricos. |
| Peticiones | Conectado | Lectura y cambio de estado restringidos a administración/pastoral; peticiones antiguas preservadas. |
| Agenda y eventos | Conectado | Actividades publicadas y borradores; registro de cambios en auditoría añadido. |
| Check-in QR | Conectado | Lector cargado bajo demanda y validación de duplicados en servidor. |
| Clasificación | Conectado en código | Usa perfiles públicos y métricas; falta prueba con perfiles ocultos y ranking legado. |
| Juegos bíblicos | Conectado en código | Vistas y bancos de preguntas presentes; falta prueba manual de todas las modalidades y persistencia de puntos. |
| Perfil público | Conectado en código | Se renderiza desde las pestañas del ranking; verificar edición, personalización y saldo real. |
| Fotos y aprobaciones | Conectado | Revisión y publicación mediante funciones; la nueva bandeja detecta solicitudes pendientes en `fotoPend`. |
| Puntos extra | Conectado | Selección de joven y escritura mediante callable; el registro se conserva en `bonus`. |
| Notas pastorales | Conectado | Selección de joven y escritura privada; acceso reservado a administración/pastoral. |
| Bandeja de entrada | Conectado | Mensajes modernos y legados; los registros legados no se editan. |
| Turnos | Conectado | CRUD y validación de fecha/horas en servidor. |
| Informes | Conectado | Calcula asistencia desde reuniones reales y exporta CSV; los datos están sujetos a los límites de consulta existentes. |
| Líderes y usuarios | Conectado | Crear, editar permisos y suspender/restaurar acceso mediante Functions. |
| Auditoría | Parcial, ampliada | Ya existía lectura de registros. Se amplió el registro de cambios de fichas, eventos, asistencia, check-in, peticiones y CRUD administrado. No todos los cambios históricos o de módulos están cubiertos todavía. |
| Configuración | Conectado | Guarda ajustes en `settings`; requiere documentar qué claves afectan comportamiento y cuáles son informativas. |
| Notificaciones | Nuevo módulo | Centro agregado para pendientes reales de seguimientos, visitantes, peticiones, mensajes y fotos. Se calcula desde las colecciones actuales; no crea duplicados ni requiere un nuevo esquema de datos. |

## Correcciones realizadas durante esta fase

1. Se añadió el centro de notificaciones al menú y a las rutas administrativas. La consulta se protege en servidor para administración y pastoral.
2. Se corrigió la selección de permisos de líderes: se retiró "Peticiones" del editor porque la bandeja de peticiones está reservada en servidor a administración y pastoral; no debe ofrecerse un permiso que la interfaz no puede respetar.
3. Seguimientos ahora vincula cada registro nuevo con un documento real de `members`. El servidor vuelve a comprobar que el joven exista y obtiene su nombre desde la base, evitando depender del texto escrito en el navegador.
4. El panel añade porcentaje mensual de asistencia a partir de los registros existentes, solo para roles que tienen permiso de asistencia o informes.
5. Se amplió el historial de auditoría para acciones administrativas importantes sin guardar notas privadas ni contenido sensible en los metadatos.
6. La cuadrícula de indicadores del panel se adapta a la cantidad de tarjetas que vea cada rol.

## Pendientes antes de declarar la aplicación terminada

- Probar inicio de sesión, permisos, rutas directas y cierre de sesión con cuentas reales de administrador, pastor, líder y joven.
- Probar crear/editar/cambiar estado/eliminar en cada módulo CRUD y comprobar el resultado en el Firebase original.
- Probar las funciones QR con cámara real y duplicados simultáneos.
- Probar cada juego, guardar puntos y verificar que el ranking los refleje una sola vez.
- Revisar edición de perfil, fotos, aprobaciones y perfiles ocultos.
- Ampliar auditoría a las acciones que aún no generan evento y definir retención/consulta paginada.
- Añadir paginación real a listados que actualmente usan límites fijos de consulta.
- Revisar reglas Firestore y mantenerlas cerradas hasta confirmar que todos los accesos del cliente pasan por Functions o por reglas precisas.
- Ejecutar compilación completa, lint, pruebas automatizadas y verificación visual en escritorio/móvil.
- Confirmar despliegue de Functions y frontend en el proyecto correcto; no se ha ejecutado un despliegue de Firebase ni de Vercel en esta fase.

## Seguridad y compatibilidad

No se modificaron reglas de Firestore ni se desplegaron Functions. Las funciones nuevas deben desplegarse en el proyecto original antes de que el centro de notificaciones y los nuevos campos de seguimiento funcionen en producción. Los registros legados se mantienen consultables y de solo lectura cuando no pueden vincularse de forma fiable.
