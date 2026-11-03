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
