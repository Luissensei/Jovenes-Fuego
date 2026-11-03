# Sistema de diseño JDF

La identidad **Jóvenes de Fuego — Gaming Community Experience** se centraliza en:

- `src/design-system/gaming-system.css`: tokens de color, tema claro/oscuro, superficies, tipografía, navegación, formularios, tablas, login y transiciones.
- `src/components/gaming/GamingUI.tsx`: componentes React accesibles y reutilizables.
- `src/components/gaming/gaming-ui.css`: estilos de los componentes.

## Componentes disponibles

`GamingButton`, `GlassCard`, `AnimatedCard`, `NeonBadge`, `PlayerAvatar`, `PlayerProfileCard`, `RankBadge`, `ExperienceBar`, `StatCard`, `GamingModal`, `LoadingScreen`, `BackgroundEffects`, `GamingNavbar`, `GamingSidebar`, `ToastProvider` y `useToast`.

## Ejemplo

```tsx
import { GamingButton, GlassCard, useToast } from '../../components/gaming';

export function ExamplePanel() {
  const toast = useToast();

  return (
    <GlassCard>
      <h2>Panel de ejemplo</h2>
      <GamingButton onClick={() => toast({
        title: 'Acción completada',
        tone: 'success',
      })}>
        Confirmar
      </GamingButton>
    </GlassCard>
  );
}
```

Los botones deshabilitan la interacción durante `loading`. Los modales responden a Escape y clic fuera. Las notificaciones anuncian cambios con regiones accesibles. Las animaciones respetan `prefers-reduced-motion`.

## Temas

El tema activo se define con `document.documentElement.dataset.theme` como `dark` o `light`. Los tokens empiezan por `--jf-`. No se deben crear nuevas paletas por módulo: las variaciones deben resolverse con modificadores de componente.

## Reglas de datos

Los componentes son visuales; no escriben directamente en Firebase. Cada módulo debe seguir los repositorios/Cloud Functions autorizados y el contrato documentado en `DATA-CONTRACTS.md`. No añadir permisos amplios a Firestore para resolver errores de interfaz.
