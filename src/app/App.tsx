import { lazy, Suspense, useEffect, useState } from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  Flame,
  Menu,
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';
import { PlayerAvatar } from '../components/gaming/GamingUI';

import { modules } from './modules';
import { firebaseProjectId, firebaseReadOnly } from '../services/firebase/client';
import { AuthProvider, useAuth } from './AuthContext';

import { LoadingScreen } from '../components/gaming/GamingUI';

const LoginPage = lazy(() => import('./LoginPage').then((module) => ({ default: module.LoginPage })));
const MembersPage = lazy(() => import('./MembersPage').then((module) => ({ default: module.MembersPage })));
const DashboardPage = lazy(() => import('./DashboardPage'));
const AttendancePage = lazy(() => import('./AttendancePage'));
const FollowupPage = lazy(() => import('./FollowupPage'));
const DevotionalsPage = lazy(() => import('./DevotionalsPage'));
const VisitorsPage = lazy(() => import('./VisitorsPage'));
const RankingPage = lazy(() => import('./RankingPage'));
const YouthPortalPage = lazy(() => import('./YouthPortalPage'));
const PrayersPage = lazy(() => import('./pages/PrayersPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const TurnsPage = lazy(() => import('./pages/TurnsPage'));
const CheckinPage = lazy(() => import('./pages/CheckinPage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const BonusPage = lazy(() => import('./pages/ManagementPages').then((module) => ({ default: module.BonusPage })));
const PastoralPage = lazy(() => import('./pages/ManagementPages').then((module) => ({ default: module.PastoralPage })));
const LeadersPage = lazy(() => import('./pages/ManagementPages').then((module) => ({ default: module.LeadersPage })));
const AuditPage = lazy(() => import('./pages/ManagementPages').then((module) => ({ default: module.AuditPage })));
const SettingsPage = lazy(() => import('./pages/ManagementPages').then((module) => ({ default: module.SettingsPage })));

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
    error: authError,
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
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

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

  if (configured && user && !profile) {
    return (
      <main className="loading-shell access-denied-shell">
        <div className="access-denied-card" role="alert">
          <ShieldCheck size={34} />
          <h1>Perfil de acceso no disponible</h1>
          <p>{authError || 'No se pudo validar tu perfil de aplicación. Por seguridad, no se abrirán los módulos internos.'}</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut size={17} /> Cerrar sesión
          </button>
        </div>
      </main>
    );
  }


  const isAdmin = ['admin', 'administrador'].includes(role);
  const isPastor = role === 'pastor';
  const isLeader = ['lider', 'líder'].includes(role);
  const isStaff = isAdmin || isPastor || isLeader;

  const visibleModules = modules.filter((item) => {
    if (firebaseReadOnly) {
      return ['ranking', 'games', 'profile'].includes(item.id);
    }

    if (item.id === 'pastoral') {
      return isPastor || isAdmin;
    }

    if (['leaders', 'settings', 'bonus', 'audit'].includes(item.id)) {
      return isAdmin;
    }

    // Estos módulos nuevos tienen endpoints de administración/pastoral.
    if (item.id === 'members') {
      return isAdmin || isPastor || isLeader;
    }

    if (['prayers', 'events'].includes(item.id)) {
      return isAdmin || isPastor;
    }

    // Una cuenta de joven no debe entrar al panel operativo.
    if (!isStaff) {
      return ['dashboard', 'ranking', 'games', 'profile'].includes(item.id);
    }

    return true;
  });

  const currentModule = visibleModules.find((item) => item.path === location.pathname);
  const navigationGroups = [
    { label: 'LOBBY Y PROGRESO', ids: ['dashboard', 'ranking', 'games', 'profile'] },
    { label: 'VIDA DE COMUNIDAD', ids: ['members', 'attendance', 'visitors', 'followups', 'devotionals', 'photos', 'events', 'checkins', 'prayers', 'inbox', 'turns'] },
    { label: 'GESTIÓN Y CONTROL', ids: ['bonus', 'pastoral', 'leaders', 'reports', 'audit', 'settings'] },
  ].map((group) => ({
    ...group,
    items: visibleModules.filter((item) => group.ids.includes(item.id)),
  })).filter((group) => group.items.length > 0);

  function renderModule(
    id: string,
    label: string,
    description: string,
  ) {
    switch (id) {
      case 'dashboard':
        return <DashboardPage />;

      case 'members':
        return <MembersPage canEdit={isAdmin || isPastor} />;

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
          {firebaseReadOnly
            ? 'SOLO LECTURA · PRODUCCIÓN'
            : configured
              ? `STAGING · ${firebaseProjectId}`
              : 'VISTA PREVIA · SIN FIREBASE'}
        </div>

        <nav className="jf-navigation" aria-label="Módulos">
          {navigationGroups.map((group) => (
            <div className="jf-navigation__group" key={group.label}>
              <button
                className="jf-navigation__toggle"
                type="button"
                aria-expanded={!collapsedGroups.includes(group.label)}
                onClick={() => setCollapsedGroups((current) =>
                  current.includes(group.label)
                    ? current.filter((label) => label !== group.label)
                    : [...current, group.label],
                )}
              >
                <span className="jf-navigation__label">{group.label}</span>
                <ChevronDown size={14} className={collapsedGroups.includes(group.label) ? '' : 'is-expanded'} aria-hidden="true" />
              </button>
              {!collapsedGroups.includes(group.label) && group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-item-icon" aria-hidden="true">
                    <item.icon size={17} strokeWidth={2.1} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="safe-note">
            <ShieldCheck size={17} />

            <span>
              {firebaseReadOnly ? 'Conexión de solo lectura' : 'Producción protegida'}
              <br />
              <small>{firebaseReadOnly
                ? 'No se permiten cambios en los datos originales.'
                : 'Entorno independiente de pruebas.'}</small>
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
          <div className="jf-topline-context">
            <span className="dot" />
            {firebaseReadOnly
              ? 'Sesión autenticada · datos originales en solo lectura'
              : configured
                ? 'Sesión autenticada · entorno de pruebas'
                : 'Vista previa · sin datos reales'}
            <span className="jf-topline-divider">/</span>
            <strong>{currentModule?.label ?? 'Panel principal'}</strong>
          </div>

          <span className="project-label">
            {user ? (
              <>
                <PlayerAvatar name={String(profile?.name ?? user.email ?? 'Usuario')} size="sm" frame="cyan" />
                <span>{String(profile?.name ?? user.email ?? 'Usuario')}</span>
                <span className="jf-role-chip">{role || 'sin rol'}</span>
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
              element={
                <div className="jf-route-screen" key={item.id}>
                  {renderModule(item.id, item.label, item.description)}
                </div>
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
    <Suspense fallback={<LoadingScreen label="Preparando tu espacio…" />}>
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
    </Suspense>
  );
}
