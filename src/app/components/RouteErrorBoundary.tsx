import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type RouteErrorBoundaryState = {
  hasError: boolean;
};

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

/**
 * Evita que un error de renderizado de un módulo deje toda la aplicación en blanco.
 * Se reinicia al cambiar de ruta; los errores persistentes permiten recargar la app.
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error al abrir un módulo de Jóvenes de Fuego:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="jf-route-error" role="alert" aria-labelledby="jf-route-error-title">
        <span className="jf-route-error-icon" aria-hidden="true">
          <AlertTriangle size={25} />
        </span>
        <span className="jf-route-error-eyebrow">MÓDULO NO DISPONIBLE</span>
        <h2 id="jf-route-error-title">No pudimos abrir esta sección</h2>
        <p>
          Ocurrió un problema al mostrar el módulo. Puedes volver al panel principal
          o recargar la aplicación para intentar abrirlo nuevamente.
        </p>
        <div className="jf-route-error-actions">
          <button type="button" onClick={() => window.location.reload()}>
            <RotateCcw size={16} />
            Recargar aplicación
          </button>
          <a href="/">Volver al panel principal</a>
        </div>
      </section>
    );
  }
}
