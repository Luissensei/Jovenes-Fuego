
import { useEffect, useState } from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import {
  Flame,
  Menu,
  Moon,
  Sun,
  ShieldCheck,
  X,
  LogOut,
  UserRound,
} from 'lucide-react';

import { modules } from './modules';
import { firebaseProjectId } from '../services/firebase/client';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { MembersPage } from './MembersPage';
import DashboardPage from './DashboardPage';
import RankingPage from './RankingPage';
import AttendancePage from './AttendancePage';
import YouthPortalPage from './YouthPortalPage';
import FollowupPage from './FollowupPage';
import DevotionalsPage from './DevotionalsPage';
import VisitorsPage from './VisitorsPage';

function ModulePage({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <section className="page-card">
      <div className="eyebrow">MÓDULO EN RECONSTRUCCIÓN</div>
      <h1>{label}</h1>
      <p className="lead">{description}</p>

      <div className="notice">
        <ShieldCheck size={19} />
        <div>
          <strong>Entorno de pruebas</strong>
          <p>
            Esta pantalla es una base de navegación.
            La lógica de datos se implementará y probará por módulo.
          </p>
        </div>
      </div>
    </section>
  );
}

function AdminApp() {
  const {
    user,
    profile,
    loading,
    configured,
    logout,
  } = useAuth();

  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  if (loading) {
    return (
      <main className="loading-shell">
        <div className="spinner" />
        Verificando sesión y permisos…
      </main>
    );
  }

  if (configured && !user) {
    return <LoginPage />;
  }

  const role = String(profile?.role ?? '').toLowerCase();
  const isAdmin = ['admin', 'administrador'].includes(role);
  const isPastor = role === 'pastor';

  const visibleModules = modules.filter((item) => {
    if (item.id === 'youth') return false;

    if (item.id === 'pastoral') {
      return isPastor || isAdmin;
    }

    if (['leaders', 'settings', 'bonus', 'audit'].includes(item.id)) {
      return isAdmin;
    }

    return true;
  });

  return (
    <div className="layout">
      <header className="mobile-header">
        <button
          className="icon-button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <span className="brand-mark">
          <Flame size={20} />
        </span>

        <strong>Jóvenes de Fuego</strong>

        <button
          className="icon-button"
          aria-label="Cambiar tema"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <Flame size={23} />
          </span>
          <div>
            <strong>Jóvenes de Fuego</strong>
            <small>Comunidad · Crecimiento</small>
          </div>
        </div>

        <div className="env-chip">
          <span className="pulse" />
          {configured
            ? `STAGING · ${firebaseProjectId}`
            : 'VISTA PREVIA · SIN FIREBASE'}
        </div>

        <nav aria-label="Módulos">
          {visibleModules.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="safe-note">
            <ShieldCheck size={17} />
            <span>
              Producción protegida
              <br />
              <small>Sin escrituras de negocio en esta fase.</small>
            </span>
          </div>

          <button
            className="theme-toggle"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {user && (
            <button
              className="theme-toggle"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Cerrar menú"
          className="scrim"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main">
        <div className="topline">
          <div>
            <span className="dot" />
            {configured
              ? 'Sesión autenticada · entorno de pruebas'
              : 'Vista previa · sin datos reales'}
          </div>

          <span className="project-label">
            {user ? (
              <>
                <UserRound size={13} />
                {String(profile?.name ?? user.email ?? 'Usuario')}
                {' · '}
                {role || 'sin rol'}
              </>
            ) : (
              'Firebase: no configurado'
            )}
          </span>
        </div>

        {!configured && (
          <div className="preview-warning">
            <ShieldCheck size={17} />
            Vista previa únicamente. No se leen ni escriben datos.
          </div>
        )}

        {configured && !profile && user && (
          <div className="preview-warning">
            La cuenta no tiene un perfil de aplicación válido.
          </div>
        )}

        <Routes>
          {visibleModules.map((item) => (
            <Route
              key={item.id}
              path={item.path}
              element={ 
                item.id === 'dashboard' ? (
                  <DashboardPage />
                ) : item.id === 'members' ? (
                  <MembersPage />
                ) : item.id === 'ranking' ? (
                  <RankingPage />
                ) : item.id === 'attendance' ? (
                  <AttendancePage />
                ) : item.id === 'followup' ? (
                 <FollowupPage />
                ) : item.id === 'devotionals' ? (
                  <DevotionalsPage />
                ) : item.id === 'visitors' ? (
                  <VisitorsPage />
                ) :(
                  <ModulePage
                    label={item.label}
                    description={item.description}
                  />
                )
              }
            />
          ))}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>

        <footer>
          Jóvenes de Fuego · reconstrucción independiente ·{' '}
          {configured ? 'staging' : 'vista previa'}
        </footer>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/portal-joven/*"
        element={<YouthPortalPage />}
      />

      <Route
        path="/*"
        element={
          <AuthProvider>
            <AdminApp />
          </AuthProvider>
        }
      />
    </Routes>
  );
}
