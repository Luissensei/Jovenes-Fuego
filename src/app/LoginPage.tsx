import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Flame, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { firebaseReadOnly } from '../services/firebase/client';
import { GamingButton } from '../components/gaming/GamingUI';

export function LoginPage() {
  const { login, configured, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="jf-login-scene">
        <section className="jf-login-art" aria-labelledby="jf-welcome-title">
          <span className="jf-login-art__orb jf-login-art__orb--one" />
          <span className="jf-login-art__orb jf-login-art__orb--two" />
          <div className="jf-login-art__brand">
            <span className="jf-login-art__brand-mark"><Flame size={28} /></span>
            <div>
              <strong>JÓVENES DE FUEGO</strong>
              <small>GAMING COMMUNITY EXPERIENCE</small>
            </div>
          </div>
          <span className="jf-login-art__eyebrow"><Sparkles size={14} /> FE · COMUNIDAD · PROPÓSITO</span>
          <h1 id="jf-welcome-title">Una generación <span>que mantiene</span> la llama.</h1>
          <p className="jf-login-art__copy">
            Un espacio para crecer en la fe, descubrir tus talentos, compartir con la comunidad y superar nuevos desafíos.
          </p>
          <p className="jf-login-art__motto">Conectados por la fe. Unidos con propósito.</p>
        </section>

        <section className="jf-login-panel" aria-labelledby="jf-login-title">
          <span className="jf-login-panel__icon"><LockKeyhole size={21} /></span>
          <p className="jf-eyebrow">ACCESO DE EQUIPO</p>
          <h2 id="jf-login-title">Bienvenido de vuelta</h2>
          <p className="jf-login-panel__intro">{firebaseReadOnly
            ? 'Ingresa con tu cuenta original para consultar los módulos disponibles, sin modificar los datos de la comunidad.'
            : 'Ingresa con tu cuenta autorizada de Firebase Staging para acceder a los módulos internos.'}</p>

          {!configured && (
            <div className="setup-warning" role="status">
              <ShieldCheck size={18} />
              <span><strong>Firebase todavía no está configurado.</strong><br />La interfaz puede revisarse, pero el inicio de sesión requiere completar las variables de entorno del proyecto elegido.</span>
            </div>
          )}

          {(error || authError) && <p className="jf-login-error" role="alert">{error || authError}</p>}

          <form className="jf-login-form" onSubmit={submit}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" required disabled={busy} />
            <label htmlFor="password">Contraseña</label>
            <input id="password" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña de staging" required disabled={busy} />
            <GamingButton type="submit" size="lg" fullWidth loading={busy} disabled={!configured} leadingIcon={!busy ? <LockKeyhole size={17} /> : undefined}>
              {busy ? 'Verificando acceso…' : 'Ingresar al centro'}
            </GamingButton>
          </form>

          <div className="jf-login-divider"><span>¿VIENES A PARTICIPAR?</span></div>
          <Link className="jf-youth-access" to="/portal-joven">
            <span className="jf-youth-access__icon"><Users size={19} /></span>
            <span className="jf-youth-access__copy">
              <strong>Entrar al Portal Joven</strong>
              <small>Explora los perfiles y desafíos de la comunidad.</small>
              <small className="jf-youth-access__notice">La selección de perfil es pública y no valida identidad.</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>

          <p className="jf-login-safe"><ShieldCheck size={16} /> {firebaseReadOnly
            ? 'Acceso a las cuentas originales. Los datos están protegidos en modo de solo lectura.'
            : 'Acceso protegido por Firebase Staging. No uses contraseñas de producción durante el desarrollo.'}</p>
        </section>
      </div>
    </main>
  );
}
