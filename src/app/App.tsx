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
import AttendancePage from './AttendancePage';
import FollowupPage from './FollowupPage';
import DevotionalsPage from './DevotionalsPage';
import VisitorsPage from './VisitorsPage';
import RankingPage from './RankingPage';
import YouthPortalPage from './YouthPortalPage';

import PrayersPage from './pages/PrayersPage';
import EventsPage from './pages/EventsPage';
import InboxPage from './pages/InboxPage';
import TurnsPage from './pages/TurnsPage';

import CheckinPage from './pages/CheckinPage';
import PhotosPage from './pages/PhotosPage';
import ReportsPage from './pages/ReportsPage';
import {
  BonusPage,
  PastoralPage,
  LeadersPage,
  AuditPage,
  SettingsPage,
} from './pages/ManagementPages';

function ModulePage({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <section className="page-card">
      <div className="eyebrow">MÓDULO EN DESARROLLO</div>
      <h1>{label}</h1>
      <p className="lead">{description}</p>

      <div className="notice">
        <ShieldCheck size={19} />
        <div>
          <strong>Entorno de pruebas</strong>
          <p>
            Esta sección todavía necesita completar sus funciones.
            Estamos trabajando en su implementación.
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

  const [dark, setDark] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('jf-theme');
      return savedTheme ? savedTheme === 'dark' : true;
    } catch {
      return true;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem('jf-theme', theme);
    } catch {
      // El cambio de tema sigue funcionando aunque el navegador bloquee el almacenamiento local.
    }
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

  const role = String(profile?.role ?? '').trim().toLowerCase();

  const isAdmin = ['admin', 'administrador'].includes(role);
  const isPastor = role === 'pastor';

  const visibleModules = modules.filter((item) => {
    if (item.id === 'pastoral') {
      return isPastor || isAdmin;
    }

    if (['leaders', 'settings', 'bonus', 'audit'].includes(item.id)) {
      return isAdmin;
    }

    return true;
  });

  function renderModule(
    id: string,
    label: string,
    description: string,
  ) {
    switch (id) {
      case 'dashboard':
        return <DashboardPage />;

      case 'members':
        return <MembersPage />;

      case 'attendance':
        return <AttendancePage />;

      case 'followups':
        return <FollowupPage />;

      case 'devotionals':
        return <DevotionalsPage />;

      case 'visitors':
        return <VisitorsPage />;

      case 'prayers':
        return <PrayersPage />;

      case 'events':
        return <EventsPage />;

      case 'inbox':
        return <InboxPage />;

      case 'turns':
        return <TurnsPage />;

      case 'ranking':
        return <RankingPage key={id} initialTab="ranking" />;

      case 'games':
        return <RankingPage key={id} initialTab="games" />;

      case 'profile':
        return <RankingPage key={id} initialTab="profiles" />;
      
      case 'checkins':
        return <CheckinPage />;

      case 'photos':
        return <PhotosPage />;

      case 'reports':
        return <ReportsPage />;

      case 'settings':
        return <SettingsPage />;

      case 'audit':
        return <AuditPage />;

      case 'leaders':
        return <LeadersPage />;

      case 'pastoral':
        return <PastoralPage />;

      case 'bonus':
        return <BonusPage />;
        
      default:
        return (
          <ModulePage
            label={label}
            description={description}
          />
        );
    }
  }

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
              <small>Entorno independiente de pruebas.</small>
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
            No se pudo cargar el perfil de aplicación.
          </div>
        )}

        <Routes>
          {visibleModules.map((item) => (
            <Route
              key={item.id}
              path={item.path}
              element={renderModule(
                item.id,
                item.label,
                item.description,
              )}
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
