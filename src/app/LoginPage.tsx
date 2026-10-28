import { useState, type FormEvent } from 'react';
import { Flame, LockKeyhole, ShieldCheck } from 'lucide-react';
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
    <main className="login-shell">
      <section className="login-card">
        <span className="login-logo"><Flame size={28} /></span>
        <p className="eyebrow">ENTORNO SEGURO DE PRUEBAS</p>
        <h1>Jóvenes de Fuego</h1>
        <p className="login-intro">Inicia sesión con una cuenta creada en Firebase staging.</p>
        {!configured && (
          <div className="setup-warning">
            <ShieldCheck size={18} />
            <span><strong>Firebase todavía no está configurado.</strong><br />La interfaz puede revisarse, pero el inicio de sesión requiere completar .env.local con la configuración del proyecto de pruebas.</span>
          </div>
        )}
        {(error || authError) && <p className="form-error" role="alert">{error || authError}</p>}
        <form onSubmit={submit}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" autoComplete="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu-correo@ejemplo.com" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña de staging" required />
          <button className="login-submit" type="submit" disabled={!configured || busy}>
            <LockKeyhole size={17} /> {busy ? 'Comprobando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="login-foot"><ShieldCheck size={15} /> No uses aquí contraseñas de producción durante el desarrollo.</p>
      </section>
    </main>
  );
}
