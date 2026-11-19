# Sistema de diseño de Jóvenes de Fuego

Este documento es el contrato visual del producto. Se aplica al panel administrativo y al portal juvenil, en escritorio y móvil. La referencia visual prioritaria son los videos **Dashboard V32** y **Glassy Dashboard V24** descritos en el plan de mejoras del 19 de noviembre de 2026.

## Dirección visual: Fuego en vidrio

La identidad combina la energía cálida del fuego con superficies de vidrio esmerilado. Debe sentirse moderna, juvenil y profesional, sin parecer una plantilla genérica ni sacrificar legibilidad o rendimiento.

### Referencias visuales que prevalecen

- **Dashboard V32 (Mercato):** panel oscuro, barra lateral por secciones con textura discreta, botones hundidos, acento naranja, reloj digital, gráficas de barras, modo claro/oscuro, esqueletos de carga y formularios limpios.
- **Glassy Dashboard V24:** superficies de vidrio cálido sobre fondo ambiental, tarjeta principal coral/naranja con anillo de progreso y avatares, calendario semanal, tarjetas de datos con mini gráficas, saludo, navegación lateral en escritorio y barra inferior en móvil, transiciones suaves.

La decisión «Fuego en vidrio» de la sección 15 del plan prevalece sobre las reglas visuales anteriores que prohibían el vidrio. La decisión más reciente del producto también autoriza **Tailwind CSS** como sistema de utilidades. Se mantiene el resto de las restricciones y el orden de trabajo del documento.

## Paleta y tokens

Los colores deben conservar el mismo significado en ambos temas.

### Modo oscuro
- Lienzo noche: `#111126`
- Superficie elevada: `#1D1A3A`
- Texto principal: `#F7F4FF`
- Texto secundario: `#C7BFDF`
- Borde: `#403765`
- Acción fuego/coral: `#FF713B`
- Logros: `#FFD45E`
- Comunidad: `#A36BFF`
- Progreso: `#39D4A5`
- Azul informativo: `#43B0FF`

### Modo claro
- Lienzo crema cálido: `#F7F3EF`
- Superficie: `#FFFFFF`
- Texto principal: `#28203D`
- Texto secundario: `#625A78`
- Borde: `#E8DDD5`
- Acción fuego/coral: `#D94F2B`
- Logros: `#94620A`
- Comunidad: `#7042B8`
- Progreso: `#147653`
- Azul informativo: `#2368B7`

Los tokens deben centralizarse en `src/styles/tokens.css` y exponerse a Tailwind mediante el mecanismo de tema/configuración que corresponda a la versión instalada. No duplicar valores de color en cada componente.

## Uso del vidrio y rendimiento

- El desenfoque real (`backdrop-filter`) se reserva para elementos de navegación y una superficie principal. Máximo **3 elementos por pantalla**.
- Las tarjetas repetidas usan fondos translúcidos, borde claro de 1 px y brillo interior; no aplicar desenfoque vivo a cada tarjeta.
- Si el dispositivo no soporta `backdrop-filter`, usar un fondo sólido legible mediante `@supports`.
- Respetar `prefers-reduced-transparency` y `prefers-reduced-motion`.
- Si el desenfoque afecta el rendimiento en móviles de gama baja, reducirlo o eliminarlo antes que comprometer la interacción.
- Animar solo `transform` y `opacity`; máximo 3 animaciones infinitas en toda la aplicación.
- Elevación de tarjetas solo en dispositivos con puntero (`@media (hover: hover)`); en táctil usar respuesta de presión breve.

## Componentes que deben existir

1. Tarjeta principal de progreso coral/naranja, con anillo SVG y acciones reales.
2. Tarjetas de datos con cifras y mini gráficas basadas en datos reales.
3. Tarjeta de semana/calendario con próximas actividades.
4. Barra lateral de escritorio agrupada por secciones.
5. Barra inferior móvil con cinco destinos prioritarios y áreas táctiles cómodas.
6. Barra superior con saludo, búsqueda y notificaciones cuando el módulo las soporte.
7. Esqueletos de carga y estados vacíos con una acción útil.
8. Modo claro cálido y modo oscuro noche, conservando el significado de los colores.

No inventar métricas, actividad, notificaciones, progreso ni datos para completar el diseño. Si no hay datos, mostrar un estado vacío claro.

## Tailwind y arquitectura de estilos

- Tailwind CSS es el sistema de utilidades elegido para los nuevos componentes y las pantallas que se migren.
- Integrar Tailwind de forma compatible con Vite y TypeScript, manteniendo sincronizados `package.json` y `package-lock.json`. No editar el lockfile manualmente ni dejar dependencias desalineadas.
- Migrar por pantalla, empezando por **Inicio del portal joven**, y esperar validación visual antes de extender el patrón.
- Los estilos específicos complejos pueden permanecer en CSS Modules; los tokens compartidos viven en `tokens.css`.
- No agregar nuevas hojas globales de correcciones ni otra capa de overrides.
- Eliminar estilos antiguos solo después de comprobar que ningún otro componente los utiliza.
- La librería de movimiento existente es `motion`; importar desde `motion/react`. No instalar `framer-motion`.

## Escala y accesibilidad

- Espaciado base: 4, 8, 12, 16, 24, 32 y 40 px.
- Texto mínimo 14 px; campos de formulario mínimo 16 px.
- Áreas táctiles objetivo de 48 px.
- Contraste WCAG AA: 4.5:1 para texto normal y 3:1 para texto grande y elementos gráficos esenciales.
- Estados con texto e icono además del color.
- Formularios con etiquetas, validación clara, foco visible y mensajes en español cercano.
- Sin tarjeta dentro de tarjeta salvo que exista una razón funcional clara.
- Mostrar campos opcionales solo cuando tengan valor; evitar datos personales innecesarios, especialmente en fichas de menores.
- Respetar zoom, teclado y preferencias de movimiento/transparencia reducidos.

## Orden de trabajo visual

1. Integrar Tailwind correctamente y centralizar tokens y tipografía.
2. Portal joven: Inicio, Ranking y Tienda de Llamas.
3. Lista de Jóvenes y Asistencia.
4. Resto del panel administrativo.
5. Efectos y animaciones al final, una vez estabilizada la base visual.

## Proceso obligatorio por pantalla

1. Describir en cinco líneas la jerarquía visual y qué se elimina.
2. Implementar la pantalla sin alterar sus reglas de negocio ni el contrato de Firebase.
3. Revisar en 360 px y 1280 px, en modo claro y oscuro.
4. Revisar carga, estados vacíos, accesibilidad, desplazamiento horizontal y rendimiento.
5. Pasar el checklist de este documento y corregir antes de continuar.

## Criterios antes de cerrar una pantalla

1. ¿Se entiende el objetivo y la acción principal de inmediato?
2. ¿Se eliminaron repeticiones, cajas innecesarias y campos vacíos?
3. ¿El vidrio está limitado y mantiene contraste suficiente?
4. ¿Los datos y gráficas proceden de fuentes reales?
5. ¿El modo claro y oscuro conservan jerarquía y significado?
6. ¿Funciona con teclado, zoom y pantallas pequeñas?
7. ¿Las animaciones respetan las preferencias del usuario y no perjudican el rendimiento?

## Referencias de accesibilidad

- W3C, WCAG 2.2, contraste mínimo: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C, WCAG 2.2: https://www.w3.org/TR/WCAG22/
