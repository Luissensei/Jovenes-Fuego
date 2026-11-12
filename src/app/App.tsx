import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
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
  ShieldCheck,
  X,
  LogOut,
  UserRound,
  LockKeyhole,
  ShieldAlert,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

import { modules } from './modules';
import {
  firebaseProjectId,
  firebaseReadOnlyMode,
} from '../services/firebase/client';
import { AuthProvider, useAuth } from './AuthContext';
import { useThemePreference } from './useThemePreference';
import { SkeletonList } from './components/Skeleton';
const FuegoFloatingAssistant = lazy(() => import('./components/FuegoFloatingAssistant'));

const LoginPage = lazy(() => import('./LoginPage').then((module) => ({default: module.LoginPage})));
const MembersPage = lazy(() => import('./MembersPage').then((module) => ({default: module.MembersPage})));

const DashboardPage = lazy(() => import('./DashboardPage'));
const AttendancePage = lazy(() => import('./AttendancePage'));
const FollowupPage = lazy(() => import('./FollowupPage'));
const DevotionalsPage = lazy(() => import('./DevotionalsPage'));
const VisitorsPage = lazy(() => import('./VisitorsPage'));
const RankingPage = lazy(() => import('./RankingPage'));
const YouthPortalPage = lazy(() => import('./YouthPortalPage'));
const AdminAssistantPage = lazy(() => import('./pages/AdminAssistantPage'));
const LeadersAdminPage = lazy(() => import('./pages/LeadersAdminPage'));

const PrayersPage = lazy(() => import('./pages/PrayersPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const TurnsPage = lazy(() => import('./pages/TurnsPage'));

const CheckinPage = lazy(() => import('./pages/CheckinPage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const BonusPage = lazy(() => import('./pages/ManagementPages').then((module) => ({default: module.BonusPage})));
const PastoralPage = lazy(() => import('./pages/ManagementPages').then((module) => ({default: module.PastoralPage})));
const AuditPage = lazy(() => import('./pages/ManagementPages').then((module) => ({default: module.AuditPage})));
const SettingsPage = lazy(() => import('./pages/SettingsHubPage'));

const adminModulePreloaders: Record<string, () => Promise<unknown>> = {
  dashboard: () => import('./DashboardPage'),
  assistant: () => import('./pages/AdminAssistantPage'),
  members: () => import('./MembersPage'),
  attendance: () => import('./AttendancePage'),
  followups: () => import('./FollowupPage'),
  devotionals: () => import('./DevotionalsPage'),
  visitors: () => import('./VisitorsPage'),
  ranking: () => import('./RankingPage'),
  games: () => import('./RankingPage'),
  profile: () => import('./RankingPage'),
  prayers: () => import('./pages/PrayersPage'),
  events: () => import('./pages/EventsPage'),
  inbox: () => import('./pages/InboxPage'),
  notifications: () => import('./pages/NotificationsPage'),
  turns: () => import('./pages/TurnsPage'),
  checkins: () => import('./pages/CheckinPage'),
  photos: () => import('./pages/PhotosPage'),
  reports: () => import('./pages/ReportsPage'),
  settings: () => import('./pages/SettingsHubPage'),
  audit: () => import('./pages/ManagementPages'),
  bonus: () => import('./pages/ManagementPages'),
  pastoral: () => import('./pages/ManagementPages'),
  leaders: () => import('./pages/LeadersAdminPage'),
};
const preloadedAdminModules = new Set<string>();
function preloadAdminModule(id: string) {
  const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
  if (connection?.saveData || preloadedAdminModules.has(id)) return;
  const preload = adminModulePreloaders[id];
  if (!preload) return;
  preloadedAdminModules.add(id);
  void preload().catch(() => preloadedAdminModules.delete(id));
}

function PageLoading({label = 'Cargando módulo'}: {label?: string}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 150);
    return () => window.clearTimeout(timeout);
  }, []);
  return (
    <div className="jf-module-loading" role="status" aria-live="polite" aria-label={label}>
      {visible ? <SkeletonList count={2}/> : <span className="jf-sr-only">{label}</span>}
    </div>
  );
}

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
    retryProfile,
  } = useAuth();

  const {theme, toggleTheme, nextThemeLabel} = useThemePreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); setBottomMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setBottomMenuOpen(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  if (loading) {
    return (
      <main className="loading-shell jf-auth-loading" role="status" aria-live="polite">
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
    return <Suspense fallback={<PageLoading label="Abriendo acceso"/>}><LoginPage /></Suspense>;
  }

  const role = String(profile?.role ?? '').trim().toLowerCase();

  if (configured && user && !profile) {
    return (
      <main className="loading-shell access-denied-shell">
        <div className="access-denied-card" role="alert">
          <ShieldCheck size={34} />
          <h1>Perfil de acceso no disponible</h1>
          <p>{authError || 'No se pudo validar tu perfil de aplicación. Por seguridad, no se abrirán los módulos internos.'}</p>
          <div className="access-denied-actions">
            <button type="button" onClick={retryProfile}>
              <RefreshCw size={17} /> Reintentar validación
            </button>
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
          <p className="access-denied-help">
            El acceso se valida mediante el backend de Vercel conectado al proyecto Firebase original.
            Revisa los registros de Vercel y la variable FIREBASE_SERVICE_ACCOUNT_JSON; no es necesario crear Cloud Functions para este flujo.
          </p>

        </div>
      </main>
    );
  }


  const isAdmin = ['admin', 'administrador'].includes(role);
  const isPastor = role === 'pastor';
  const isLeader = ['lider', 'líder'].includes(role);
  const isStaff = isAdmin || isPastor || isLeader;
  // Least privilege: un líder sin permisos explícitos recibe solo herramientas operativas básicas.
  const defaultLeaderModules = [
    'members', 'attendance', 'reports', 'followups', 'devotionals', 'visitors',
    'events', 'checkins', 'turns', 'ranking', 'games', 'profile',
  ];
  const leaderPermissions = Array.isArray(profile?.permissions)
    ? profile.permissions.filter((item): item is string => typeof item === 'string')
    : defaultLeaderModules;

  const visibleModules = modules.filter((item) => {
    // La conexión al Firebase original no debe ocultar módulos completos.
    // La visibilidad sigue dependiendo del perfil y del rol autenticado.
    if (item.id === 'assistant') return isAdmin;
    if (item.id === 'notifications') return isAdmin || isPastor;

    if (isLeader) {
      // Las peticiones contienen información privada; su bandeja queda reservada
      // a administración y pastoral. La agenda sí usa permiso de módulo.
      if (['prayers', 'inbox'].includes(item.id)) return false;
      return item.id === 'dashboard' || leaderPermissions.includes(item.id);
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
      : ShieldCheck;
  const environmentStatus = !configured
    ? 'Vista previa · sin Firebase'
    : firebaseReadOnlyMode
      ? 'Producción · solo lectura'
      : 'Firebase original conectado';
  const environmentTone = !configured
    ? 'preview'
    : firebaseReadOnlyMode
      ? 'readonly'
      : 'connected';

  const mobileNavIds = isStaff
    ? ['dashboard', 'attendance', 'ranking', 'games', 'profile']
    : ['dashboard', 'ranking', 'games', 'profile'];
  const mobileNavItems = mobileNavIds
    .map((id) => visibleModules.find((item) => item.id === id))
    .filter((item): item is (typeof visibleModules)[number] => Boolean(item));

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

      case 'notifications':
        return <NotificationsPage />;

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
    <MotionConfig reducedMotion="user">
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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

      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <span className="brand-mark church-brand-mark">
            <img src="/church-logo.webp" alt="" />
          </span>

          <div>
            <strong>Jóvenes de Fuego</strong>
            <small>Iglesia Cristiana Cuadrangular Alfa y Omega</small>
          </div>
        </div>

        <button
          className="sidebar-collapse-toggle"
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="env-chip">
          <span className="pulse" />
          {configured
            ? firebaseReadOnlyMode
              ? 'PRODUCCIÓN · SOLO LECTURA'
              : `FIREBASE · ${firebaseProjectId}`
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
            {label:'Gestión', ids:['notifications','bonus','pastoral','inbox','reports','audit','settings']},
          ].map((group) => {
            const items = filteredModules.filter((item) => group.ids.includes(item.id));
            if (!items.length) return null;
            const activeGroup = items.some((item) => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path + '/')));
            return <details className="jf-nav-group" key={group.label} open={sidebarCollapsed || activeGroup || Boolean(moduleSearch.trim()) || false}>
              <summary><span>{group.label}</span><span className="jf-nav-count">{items.length}</span></summary>
              <div className="jf-nav-group-items">{items.map((item) => (
                <NavLink key={item.id} to={item.path} end={item.path === '/'} title={sidebarCollapsed ? item.label : undefined} onPointerEnter={() => preloadAdminModule(item.id)} onTouchStart={() => preloadAdminModule(item.id)} onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
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
                  : 'Acceso protegido por rol y permisos.'}
              </small>
            </span>
          </div>


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
          <button
            className="topline-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
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

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="jf-route-stage"
            key={location.pathname}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Routes>
              {visibleModules.map((item) => (
                <Route
                  key={item.id}
                  path={item.path}
                  element={<Suspense fallback={<PageLoading label={item.label}/>}>{renderModule(
                    item.id,
                    item.label,
                    item.description,
                  )}</Suspense>}
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
          </motion.div>
        </AnimatePresence>

        <footer>
          Jóvenes de Fuego · reconstrucción independiente ·{' '}
          {configured
            ? firebaseReadOnlyMode
              ? 'producción · solo lectura'
              : 'conectado'
            : 'vista previa'}
        </footer>
      </div>
      {user && (
        <nav className={`jf-bottom-nav ${bottomMenuOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
          <AnimatePresence>
            {bottomMenuOpen && (
              <motion.div
                className="jf-bottom-nav-menu"
                initial={{ opacity: 0, y: 22, scale: .94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: .96 }}
                transition={{ duration: .22, ease: 'easeOut' }}
              >
                {mobileNavItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ delay: index * .035, duration: .18 }}
                  >
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      title={item.label}
                      className={({ isActive }) => `jf-bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="jf-bottom-nav-icon"><item.icon size={19} strokeWidth={2.1} /></span>
                      <span>{item.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            className="jf-bottom-nav-toggle"
            aria-expanded={bottomMenuOpen}
            aria-label={bottomMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            onClick={() => setBottomMenuOpen((open) => !open)}
          >
            <span className="jf-bottom-nav-toggle-icon">{bottomMenuOpen ? <X size={21}/> : <Menu size={21}/>}</span>
            <span>{bottomMenuOpen ? 'Cerrar' : 'Menú'}</span>
            <span className={`jf-bottom-nav-chevron ${bottomMenuOpen ? 'turned' : ''}`}>⌃</span>
          </button>
        </nav>
      )}
      {user && profile && (
        <Suspense fallback={null}>
          <FuegoFloatingAssistant
            audience={isStaff ? 'admin' : 'youth'}
            quickPrompts={isStaff ? [
              'Prepara un cronograma para un encuentro juvenil.',
              'Redacta una invitación para el próximo servicio.',
              'Organiza una vigilia con lista de tareas.',
              'Diseña una estructura de informe mensual.',
            ] : [
              'Explícame un versículo de la Biblia de forma sencilla.',
              'Ayúdame a preparar mi devocional de hoy.',
              'Hazme tres preguntas para reflexionar sobre mi fe.',
            ]}
          />
        </Suspense>
      )}
    </div>
    </MotionConfig>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/portal-joven/*"
        element={<MotionConfig reducedMotion="user"><Suspense fallback={<PageLoading label="Abriendo portal juvenil"/>}><YouthPortalPage /></Suspense></MotionConfig>}
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
