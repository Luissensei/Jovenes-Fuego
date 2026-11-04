import { FireAtmosphere } from './FireAtmosphere';
import { useEffect, useState } from 'react';
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
  Moon,
  Sun,
  Crown,
  ShieldCheck,
  X,
  LogOut,
  UserRound,
  FlaskConical,
  LockKeyhole,
  ShieldAlert,
  Search,
  Sparkles,
} from 'lucide-react';

import { modules } from './modules';
import {
  firebaseProjectId,
  firebaseReadOnlyMode,
} from '../services/firebase/client';
import { AuthProvider, useAuth } from './AuthContext';
import { useThemePreference } from './useThemePreference';

import { LoginPage } from './LoginPage';
import { MembersPage } from './MembersPage';

import DashboardPage from './DashboardPage';
import AttendancePage from './AttendancePage';
import FollowupPage from './FollowupPage';
import DevotionalsPage from './DevotionalsPage';
import VisitorsPage from './VisitorsPage';
import RankingPage from './RankingPage';
import YouthPortalPage from './YouthPortalPage';
import AdminAssistantPage from './pages/AdminAssistantPage';
import LeadersAdminPage from './pages/LeadersAdminPage';

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
    error: authError,
    logout,
  } = useAuth();

  const { theme, nextThemeLabel, toggleTheme } = useThemePreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (loading) {
    return (
      <main className="loading-shell jf-auth-loading" role="status" aria-live="polite">
        <FireAtmosphere />
        <div className="jf-auth-loader">
          <span className="jf-auth-loader-emblem">
            <Flame size={31}/>
            <i aria-hidden="true"/>
          </span>
          <strong>Jóvenes de Fuego</strong>
          <span>Verificando sesión y permisos</span>
          <span className="jf-auth-loader-track"><i/></span>
          <small>Conexión segura · Firebase</small>
        </div>
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
  const defaultLeaderModules = ['members','attendance','followups','devotionals','visitors','events','prayers','checkins','turns','ranking','games','profile'];
  const leaderPermissions = Array.isArray(profile?.permissions)
    ? profile.permissions.filter((item): item is string => typeof item === 'string')
    : defaultLeaderModules;

  const visibleModules = modules.filter((item) => {
    // La conexión al Firebase original no debe ocultar módulos completos.
    // La visibilidad sigue dependiendo del perfil y del rol autenticado.
    if (item.id === 'assistant') return isAdmin;

    if (isLeader) return item.id === 'dashboard' || leaderPermissions.includes(item.id);

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

  const filteredModules = visibleModules.filter((item) => {
    const query = moduleSearch.trim().toLocaleLowerCase('es');
    if (!query) return true;
    return `${item.label} ${item.description}`.toLocaleLowerCase('es').includes(query);
  });

  const currentModule = [...visibleModules]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => (
      item.path === location.pathname ||
      (item.path !== '/' && location.pathname.startsWith(`${item.path}/`))
    )) ?? visibleModules[0] ?? modules[0];

  const ModuleIcon = currentModule.icon;
  const EnvironmentIcon = !configured
    ? ShieldAlert
    : firebaseReadOnlyMode
      ? LockKeyhole
      : FlaskConical;
  const environmentStatus = !configured
    ? 'Vista previa · sin Firebase'
    : firebaseReadOnlyMode
      ? 'Producción · solo lectura'
      : 'Staging conectado';
  const environmentTone = !configured
    ? 'preview'
    : firebaseReadOnlyMode
      ? 'readonly'
      : 'staging';

  function renderModule(
    id: string,
    label: string,
    description: string,
  ) {
    switch (id) {
      case 'dashboard':
        return <DashboardPage />;

      case 'assistant':
        return <AdminAssistantPage />;

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
        return <LeadersAdminPage />;

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

        <span className="brand-mark church-brand-mark">
          <img src="/church-logo.webp" alt="" />
        </span>

        <strong>Jóvenes de Fuego</strong>

        <button
          className="icon-button"
          aria-label={`Cambiar a ${nextThemeLabel}`}
          title={`Cambiar a ${nextThemeLabel}`}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={19} /> : theme === 'light' ? <Crown size={19} /> : <Moon size={19} />}
        </button>
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark church-brand-mark">
            <img src="/church-logo.webp" alt="" />
          </span>

          <div>
            <strong>Jóvenes de Fuego</strong>
            <small>Iglesia Cristiana Cuadrangular Alfa y Omega</small>
          </div>
        </div>

        <div className="env-chip">
          <span className="pulse" />
          {configured
            ? firebaseReadOnlyMode
              ? 'PRODUCCIÓN · SOLO LECTURA'
              : `STAGING · ${firebaseProjectId}`
            : 'VISTA PREVIA · SIN FIREBASE'}
        </div>

        <label className="module-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={moduleSearch} onChange={(event) => setModuleSearch(event.target.value)} placeholder="Buscar módulo..." aria-label="Buscar un módulo" />
          {moduleSearch && <button type="button" onClick={() => setModuleSearch('')} aria-label="Limpiar búsqueda">×</button>}
        </label>
        <nav className="jf-module-navigation" aria-label="Módulos">
          {filteredModules.length === 0 ? <p className="module-search-empty">No se encontraron módulos.</p> : [
            {label:'Inicio', ids:['dashboard','assistant']},
            {label:'Personas', ids:['members','leaders','visitors','followups']},
            {label:'Actividades', ids:['attendance','devotionals','events','prayers','checkins','turns']},
            {label:'Comunidad', ids:['ranking','games','profile','photos']},
            {label:'Gestión', ids:['bonus','pastoral','inbox','reports','audit','settings']},
          ].map((group) => {
            const items = filteredModules.filter((item) => group.ids.includes(item.id));
            if (!items.length) return null;
            const activeGroup = items.some((item) => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path + '/')));
            return <details className="jf-nav-group" key={group.label} open={activeGroup || Boolean(moduleSearch.trim()) || group.label === 'Inicio'}>
              <summary><span>{group.label}</span><span className="jf-nav-count">{items.length}</span></summary>
              <div className="jf-nav-group-items">{items.map((item) => (
                <NavLink key={item.id} to={item.path} end={item.path === '/'} onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-item-icon" aria-hidden="true"><item.icon size={17} strokeWidth={1.9}/></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}</div>
            </details>;
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="safe-note">
            <ShieldCheck size={17} />

            <span>
              {firebaseReadOnlyMode
                ? 'Base original protegida'
                : 'Producción protegida'}
              <br />
              <small>
                {firebaseReadOnlyMode
                  ? 'Solo consultas; edición deshabilitada.'
                  : 'Entorno independiente de pruebas.'}
              </small>
            </span>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Cambiar a ${nextThemeLabel}`}
            title={`Cambiar a ${nextThemeLabel}`}
          >
            {theme === 'dark' ? <Sun size={17} /> : theme === 'light' ? <Crown size={17} /> : <Moon size={17} />}
            Cambiar a {nextThemeLabel}
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

      <div className="main">
        <div className="topline">
          <button className="topline-menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Cerrar panel de módulos' : 'Abrir panel de módulos'}>
            {menuOpen ? <X size={19}/> : <Menu size={19}/>}
          </button>
          <div className={`topline-status ${environmentTone}`} aria-live="polite">
            <span className="topline-status-environment">
              <span className="dot" aria-hidden="true" />
              <EnvironmentIcon size={14} aria-hidden="true" />
              <span>{environmentStatus}</span>
            </span>
            <span className="topline-status-divider" aria-hidden="true" />
            <span className="topline-status-module">
              <ModuleIcon size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>{currentModule.label}</span>
            </span>
          </div>

          {isAdmin && <button className="topline-ai-trigger" type="button" onClick={() => navigate('/asistente')}><Sparkles size={16}/> Fuego AI</button>}
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
            element={
              <Navigate
                to={firebaseReadOnlyMode ? '/ranking' : '/'}
                replace
              />
            }
          />
        </Routes>

        <footer>
          Jóvenes de Fuego · reconstrucción independiente ·{' '}
          {configured
            ? firebaseReadOnlyMode
              ? 'producción · solo lectura'
              : 'staging'
            : 'vista previa'}
        </footer>
      </div>
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
