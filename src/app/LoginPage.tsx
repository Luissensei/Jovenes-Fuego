import { useState, type FormEvent } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, configured, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const busy = submitting || authLoading;
  const visibleError = error || authError || '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;

    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`login-shell ${busy ? 'is-verifying' : ''}`}>
      <section className={`login-card ${visibleError ? 'has-error' : ''}`} aria-labelledby="login-title">
        <span className="login-logo church-login-logo">
          <img src="/church-logo.webp" alt="Logo de la Iglesia Cristiana Cuadrangular Alfa y Omega" />
        </span>
        <p className="eyebrow">ÁREA ADMINISTRATIVA · ACCESO SEGURO</p>
        <h1 id="login-title">Bienvenido de nuevo</h1>
        <p className="login-church-name">Iglesia Cristiana Cuadrangular Alfa y Omega</p>
        <p className="login-intro">Ingresa con las credenciales de tu cuenta para continuar al panel de administración.</p>

        {!configured && (
          <div className="setup-warning" role="status">
            <ShieldCheck size={18} />
            <span><strong>Firebase todavía no está configurado.</strong><br />El acceso requiere la configuración del proyecto original en las variables de entorno.</span>
          </div>
        )}

        {visibleError && <p className="form-error" role="alert">{visibleError}</p>}

        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="email">Usuario o correo electrónico</label>
          <input
            id="email"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Tu usuario o correo"
            required
            disabled={busy || !configured}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            required
            disabled={busy || !configured}
          />

          <button className={`login-submit ${busy ? 'is-busy' : ''}`} type="submit" disabled={!configured || busy || !email.trim() || !password} aria-busy={busy}>
            {busy ? (
              <>
                <span className="login-progress-spinner" aria-hidden="true" />
                <span>Verificando acceso…</span>
              </>
            ) : (
              <>
                <LockKeyhole size={17} aria-hidden="true" />
                <span>Entrar al panel</span>
                <ShieldCheck size={16} className="login-submit-shield" aria-hidden="true" />
              </>
            )}
          </button>

          {busy && (
            <div className="login-verification" role="status" aria-live="polite">
              <span className="login-progress-track"><span /></span>
              <span>Validando credenciales, perfil y permisos.</span>
            </div>
          )}
        </form>

        <p className="login-foot"><ShieldCheck size={15} aria-hidden="true" /> Conexión protegida con Firebase original.</p>
      </section>
    </main>
  );
}
