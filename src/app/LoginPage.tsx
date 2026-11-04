import { FireAtmosphere } from './FireAtmosphere';
import { useState, type FormEvent } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, configured, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`login-shell ${busy ? "is-verifying" : ""}`}>
      <FireAtmosphere density="cinematic" />
      <section className={`login-card ${error || authError ? "has-error" : ""}`}>
        <span className="login-logo church-login-logo">
          <img src="/church-logo.webp" alt="Logo de la Iglesia Cristiana Cuadrangular Alfa y Omega" />
        </span>
        <p className="eyebrow">ENTORNO SEGURO DE PRUEBAS</p>
        <h1>Jóvenes de Fuego</h1>
        <p className="login-church-name">Iglesia Cristiana Cuadrangular Alfa y Omega</p>
        <p className="login-intro">Inicia sesión con tu usuario o correo de la aplicación original.</p>
        {!configured && (
          <div className="setup-warning">
            <ShieldCheck size={18} />
            <span><strong>Firebase todavía no está configurado.</strong><br />La interfaz puede revisarse, pero el inicio de sesión requiere completar .env.local con la configuración del proyecto de pruebas.</span>
          </div>
        )}
        {(error || authError) && <p className="form-error" role="alert">{error || authError}</p>}
        <form onSubmit={submit}>
          <label htmlFor="email">Usuario o correo electrónico</label>
          <input id="email" autoComplete="username" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin o correo@ejemplo.com" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña habitual" required />
          <button className={`login-submit ${busy ? 'is-busy' : ''}`} type="submit" disabled={!configured || busy} aria-busy={busy}>
            <span className="login-submit-icon">
              {busy ? <span className="login-verification-spinner"><ShieldCheck size={18}/></span> : <LockKeyhole size={17}/>}
            </span>
            <span>{busy ? 'Verificando identidad…' : 'Iniciar sesión'}</span>
            {!busy && <ShieldCheck size={16} className="login-submit-shield"/>}
          </button>
          {busy && (
            <div className="login-verification" role="status" aria-live="polite">
              <span className="login-verification-dot"/>
              <span>Comprobando credenciales, sesión y permisos seguros.</span>
            </div>
          )}
        </form>
        <p className="login-foot"><ShieldCheck size={15} /> La autenticación se valida con Firebase original.</p>
      </section>
    </main>
  );
}
