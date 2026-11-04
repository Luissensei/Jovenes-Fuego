# Sistema de diseño de Jóvenes de Fuego

Este documento es el contrato visual del producto. Se aplica a pantallas administrativas y juveniles, escritorio y móvil. Los nuevos módulos y cualquier rediseño deben seguirlo antes de añadir efectos decorativos.

## Dirección visual

La aplicación debe sentirse como una herramienta real de gestión comunitaria: clara, cálida, estable y fácil de usar. La identidad de la iglesia aparece en el logotipo, el vocabulario, la fotografía y un acento cálido; no se construye con efectos visuales en cada componente.

### Lo que sí usamos
- Fondos neutros y superficies sólidas.
- Un color de acción principal: terracota / brasa.
- Una jerarquía clara: título de pantalla, contexto breve, contenido principal y acciones.
- Tablas y listas para información repetida; tarjetas solo para agrupar información que realmente pertenece junta.
- Bordes finos, radios moderados y sombras muy discretas.
- Tipografía DM Sans con tamaños y pesos consistentes.
- Estados con texto e icono además del color.
- Avatares y recursos del juego pueden conservar personalidad y color porque cumplen una función de identidad.

### Lo que evitamos
- Gradientes multicolor en botones, paneles o cabeceras de cada módulo.
- Glassmorphism, blur de fondo, transparencias apiladas y reflejos.
- Brillos, neones, partículas, meteoros, sombras luminosas y halos permanentes.
- Tarjetas dentro de tarjetas sin una razón de información.
- Esquinas excesivamente redondeadas en todos los elementos.
- Animaciones continuas, rebotes, inclinación 3D o desplazamiento de tarjetas al pasar el cursor.
- Etiquetas en mayúsculas y tracking exagerado para el contenido normal.
- Repetir la misma métrica, título o llamada a la acción en varias secciones.

## Tokens

La implementación vive en `src/styles/professional-ui.css`. Es la última hoja importada desde `src/main.tsx`, así que prevalece sobre estilos históricos que deben migrarse gradualmente.

### Modo claro
- Lienzo: `#F5F3EF`
- Superficie: `#FFFFFF`
- Texto principal: `#2B2926`
- Texto secundario: `#625D56`
- Borde: `#E6E0D8`
- Acción/acento: `#8F3E22`
- Navegación: carbón cálido `#24211E`

### Modo oscuro
- Lienzo: `#151412`
- Superficie: `#201E1A`
- Texto principal: `#F2EEE8`
- Texto secundario: `#B9B1A6`
- Borde: `#39352E`
- Acción/acento: `#D58A5C`

## Escala de interfaz

- Espaciado base de 4 px: 4, 8, 12, 16, 24, 32 y 40 px.
- Controles: altura objetivo de 40–44 px.
- Botones y campos: radio de 8 px.
- Tarjetas: radio de 12 px.
- Panel o cabecera destacada: radio máximo de 12–16 px.
- Una acción primaria por bloque; las acciones secundarias se presentan como botones discretos o enlaces.
- En escritorio, usar columnas solo cuando ayuden a comparar o completar tareas relacionadas. En móvil, apilar sin perder el orden de lectura.

## Accesibilidad y estados

- Texto normal: contraste mínimo WCAG AA de 4.5:1.
- Texto grande y componentes/gráficos esenciales: mínimo 3:1.
- No comunicar éxito, error, asistencia, selección o prioridad solo por el color: añadir texto, icono o forma.
- Los elementos interactivos deben tener foco visible y etiquetas accesibles.
- Respetar `prefers-reduced-motion`; las animaciones no deben ser necesarias para entender una tarea.
- Evitar texto secundario demasiado pálido sobre superficies claras.

## Criterios antes de cerrar una pantalla

1. ¿Se entiende el objetivo y la acción principal sin leer cada tarjeta?
2. ¿Hay información repetida o contenedores que pueden eliminarse?
3. ¿La pantalla usa el mismo sistema de tipografía, espacios, bordes y botones?
4. ¿El modo claro tiene fondo neutro, superficies legibles y contraste suficiente?
5. ¿El modo oscuro mantiene el mismo orden visual y no cambia el significado de colores?
6. ¿Funciona con teclado, zoom y pantallas pequeñas?
7. ¿Se han eliminado animaciones, brillos o gradientes que no aportan información?

## Referencias de diseño y accesibilidad

- W3C, WCAG 2.2, contraste mínimo (SC 1.4.3): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C, WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Nielsen Norman Group, *Good from Afar, But Far from Good: AI Prototyping in Real Design Contexts* (revisión 19-08-2026): https://www.nngroup.com/articles/ai-prototyping/
- Nielsen Norman Group, *Prompt to Design Interfaces: Why Vague Prompts Fail and How to Fix Them* (05-12-2025): https://www.nngroup.com/articles/vague-prototyping/
- Material Design 3, superficies y elevación tonal: https://developer.android.com/develop/ui/compose/designsystems/material3

El propósito de estas referencias no es copiar una plantilla. Se usan para establecer criterios verificables: jerarquía, consistencia, familiaridad, contraste y menor ruido visual.
