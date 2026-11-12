import styles from './styles/DashboardPage.module.css';
import { motion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
const PointsChart = lazy(() => import('./components/PointsChart'));
import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight, CalendarDays, Users, Trophy, BookOpen, ClipboardCheck, Bell,
  Sparkles, ShieldCheck, Clock3, MapPin, ArrowRight,
  LayoutDashboard, UserRound, Medal, Star, ChartNoAxesCombined,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getPublicRankingMetrics, type PublicRankingMetric } from '../services/publicProfiles';
import {listAttendanceMeetings, type AttendanceMeeting} from '../services/attendance';
import { getWeeklyActivities, type WeeklyActivity } from '../services/youthPortal';
import { firebaseProjectId, firebaseReadOnlyMode } from '../services/firebase/client';

const shortcuts = [
  { label: 'Jóvenes', detail: 'Directorio y perfiles', path: '/jovenes', moduleId: 'members', adminOnly: false, icon: Users },
  { label: 'Asistencia', detail: 'Registro de servicios', path: '/asistencia', moduleId: 'attendance', adminOnly: false, icon: ClipboardCheck },
  { label: 'Agenda', detail: 'Actividades y eventos', path: '/eventos', moduleId: 'events', adminOnly: false, icon: CalendarDays },
  { label: 'Devocionales', detail: 'Contenido de crecimiento', path: '/devocionales', moduleId: 'devotionals', adminOnly: false, icon: BookOpen },
  { label: 'Informes', detail: 'Reportes y estadísticas', path: '/informes', moduleId: 'reports', adminOnly: false, icon: ChartNoAxesCombined },
  { label: 'Notificaciones', detail: 'Pendientes y novedades', path: '/notificaciones', moduleId: 'notifications', adminOnly: false, icon: Bell },
  { label: 'Líderes', detail: 'Roles y permisos', path: '/lideres', moduleId: 'leaders', icon: ShieldCheck, adminOnly: true },
];
function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

export default function DashboardPage() {
  const { profile, user, configured } = useAuth();
  const role = String(profile?.role ?? '').toLowerCase();
  const isAdmin = ['admin', 'administrador'].includes(role);
  const isPastor = role === 'pastor';
  const isLeader = ['lider', 'líder'].includes(role);
  const leaderPermissions = Array.isArray(profile?.permissions)
    ? profile.permissions.filter((item): item is string => typeof item === 'string')
    : ['attendance', 'reports', 'ranking', 'games', 'profile'];
  const leaderHasReports = Array.isArray(profile?.permissions) ? profile.permissions.includes('reports') : false;
  const canReadAttendance = isAdmin || isPastor || (isLeader && (leaderPermissions.includes('attendance') || leaderHasReports));
  const firstName = String(profile?.name ?? user?.email?.split('@')[0] ?? 'equipo').trim().split(/\s+/)[0] || 'equipo';
  const [people, setPeople] = useState<PublicRankingMetric[]>([]);
  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [attendanceMeetings, setAttendanceMeetings] = useState<AttendanceMeeting[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) { setPeople([]); setActivities([]); setAttendanceMeetings([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError('');
    Promise.allSettled([
      getPublicRankingMetrics(),
      getWeeklyActivities(),
      canReadAttendance
        ? listAttendanceMeetings(isLeader && !leaderHasReports ? 'attendance' : 'reports')
        : Promise.resolve([] as AttendanceMeeting[]),
    ]).then((results) => {
      if (!active) return;
      if (results[0].status === 'fulfilled') setPeople(results[0].value);
      else setError('No se pudieron consultar los perfiles y puntos públicos.');
      if (results[1].status === 'fulfilled') setActivities(results[1].value);
      else setError((old) => old || 'No se pudo consultar la agenda publicada.');
      if (results[2].status === 'fulfilled') setAttendanceMeetings(results[2].value);
      else setError((old) => old || 'No se pudo consultar la asistencia del periodo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [configured, canReadAttendance, isLeader, leaderHasReports]);

  const ranked = useMemo(() => [...people].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name, 'es')), [people]);
  const totalPoints = useMemo(
    () => people.reduce((sum, item) => sum + (item.points ?? 0), 0),
    [people],
  );
  const today = localDateKey(new Date());
  const upcoming = useMemo(() => activities.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 4), [activities, today]);
  const canOpenModule = (moduleId: string) => {
    if (isAdmin || isPastor) return true;
    return isLeader && leaderPermissions.includes(moduleId);
  };
  const availableShortcuts = shortcuts.filter((item) =>
    item.adminOnly ? isAdmin : canOpenModule(item.moduleId),
  );
  const currentMonth = localDateKey(new Date()).slice(0, 7);
  const attendanceMetric = useMemo(() => {
    const participants = attendanceMeetings
      .filter((meeting) => meeting.date.startsWith(currentMonth))
      .flatMap((meeting) => meeting.participants);
    if (!participants.length) return {value: '—', note: 'Sin registros este mes'};
    const present = participants.filter((item) => item.status === 'Presente' || item.status === 'Tarde').length;
    return {
      value: `${Math.round((present / participants.length) * 100)}%`,
      note: `${present} de ${participants.length} registros del mes`,
    };
  }, [attendanceMeetings, currentMonth]);
  const topThree = ranked.slice(0, 3);
  const chartData = useMemo(
    () => ranked.slice(0, 6).map((person) => ({ name: person.name, value: Math.max(0, person.points ?? 0) })),
    [ranked],
  );
  const maxPoints = Math.max(1, ...chartData.map((person) => person.value));
  const attendanceChartData = useMemo(
    () => [...attendanceMeetings]
      .filter((meeting) => meeting.participants.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6)
      .map((meeting) => {
        const total = meeting.participants.length;
        const present = meeting.participants.filter((person) => person.status === 'Presente' || person.status === 'Tarde').length;
        return {
          name: new Date(meeting.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
          value: Math.round((present / total) * 100),
        };
      }),
    [attendanceMeetings],
  );
  const metricCards = [
    { label: 'PERFILES PÚBLICOS', value: loading ? '…' : configured ? String(people.length) : '—', note: 'Perfiles visibles del ranking', icon: Users },
    { label: 'ACTIVIDADES PRÓXIMAS', value: loading ? '…' : configured ? String(upcoming.length) : '—', note: 'Eventos publicados desde hoy', icon: CalendarDays },
    { label: 'PUNTOS ACUMULADOS', value: loading ? '…' : configured ? totalPoints.toLocaleString('es-CO') : '—', note: 'Total del ranking público', icon: Star },
    { label: 'LÍDER DEL RANKING', value: loading ? '…' : ranked[0]?.name || '—', note: ranked[0] ? `${(ranked[0].points ?? 0).toLocaleString('es-CO')} puntos` : 'Sin datos publicados', icon: Trophy },
    ...(canReadAttendance ? [{label: 'ASISTENCIA DEL MES', value: loading ? '…' : attendanceMetric.value, note: attendanceMetric.note, icon: ClipboardCheck}] : []),
  ];

  return (
    <main className={styles.scope}>
      <header className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <span className={styles.eyebrow}><i /> PANEL DE ADMINISTRACIÓN <span>/</span> RESUMEN GENERAL</span>
          <h1>¡Bienvenido de nuevo, <em>{firstName}</em>!</h1>
          <p>Una comunidad que crece cuando cada persona cuenta. Aquí tienes el estado de la actividad y la participación.</p>
          {(canOpenModule('members') || canOpenModule('attendance')) && (
            <div className={styles.welcomeActions}>
              {canOpenModule('members') && (
                <NavLink to="/jovenes" className={styles.primaryAction}>
                  <Users size={16} /> {isLeader ? 'Consultar jóvenes' : 'Gestionar jóvenes'} <ArrowUpRight size={15} />
                </NavLink>
              )}
              {canOpenModule('attendance') && (
                <NavLink to="/asistencia" className={styles.secondaryAction}>Registrar asistencia <ArrowUpRight size={15} /></NavLink>
              )}
            </div>
          )}
        </div>
        <div className={styles.welcomeVisual} aria-hidden="true"><div className={styles.visualHalo} /><div className={styles.visualCore}><ChartNoAxesCombined size={64} /></div><span>COMUNIDAD<br />EN MOVIMIENTO</span></div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores generales">
        {metricCards.map(({ label, value, note, icon: Icon }, index) => (
          <motion.article
            className={styles.metricCard}
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3, delay: index * 0.055, ease: 'easeOut' }}
          >
            <div className={styles.metricTop}><span>{label}</span><i><Icon size={19} /></i></div>
            <strong title={value}>{value}</strong><small>{note}</small>
            <div className={styles.metricSpark} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></div>
          </motion.article>
        ))}
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.featureGrid}>
        <article className={styles.panel + ' ' + styles.podiumPanel}>
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>CLASIFICACIÓN DE LA COMUNIDAD</span><h2>Ranking general</h2><p>Los tres perfiles con mayor puntuación.</p></div>
            <NavLink to="/ranking">Ver ranking <ArrowRight size={14} /></NavLink>
          </div>
          {topThree.length ? <div className={styles.podium}>
            {[topThree[1], topThree[0], topThree[2]].map((person, visualIndex) => {
              if (!person) return <div className={styles.podiumEmpty} key={visualIndex} />;
              const position = ranked.findIndex((item) => item.id === person.id) + 1;
              return <div className={styles.podiumPerson} data-place={position} key={person.id}>
                <div className={styles.avatarWrap}><div className={styles.avatar}>{initials(person.name)}</div><span>{position === 1 ? <Medal size={17} /> : position}</span></div>
                <b title={person.name}>{person.name}</b><small><Star size={12} fill="currentColor" /> {(person.points ?? 0).toLocaleString('es-CO')} pts</small>
                <div className={styles.podiumBase}><strong>{position === 1 ? '1º' : position === 2 ? '2º' : '3º'}</strong></div>
              </div>;
            })}
          </div> : <div className={styles.empty}><Trophy size={25} /><b>{loading ? 'Consultando el ranking…' : 'Aún no hay posiciones publicadas'}</b><span>Los datos aparecerán cuando existan perfiles con puntuación.</span></div>}
        </article>

        <article className={styles.panel + ' ' + styles.chartPanel}>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>RENDIMIENTO</span><h2>Puntos por participante</h2><p>Comparativo de los seis primeros lugares.</p></div><ChartNoAxesCombined size={20} /></div>
          {chartData.length ? (
            <div className={styles.chart}>
              <Suspense fallback={<div className={styles.empty} role="status">Preparando gráfico interactivo…</div>}><PointsChart data={chartData} ariaLabel="Puntos de los seis primeros participantes del ranking" /></Suspense>
              <div className={styles.chartFoot}>
                <span>0 puntos</span>
                <span>Mayor puntuación: {maxPoints.toLocaleString('es-CO')}</span>
              </div>
            </div>
          ) : <div className={styles.empty}><ChartNoAxesCombined size={25} /><b>{loading ? 'Preparando estadísticas…' : 'No hay datos para graficar'}</b><span>El gráfico utiliza las puntuaciones reales del ranking.</span></div>}
        </article>
      </section>

      <section className={styles.lowerGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>CALENDARIO</span><h2>Próximas actividades</h2><p>Agenda publicada para la comunidad.</p></div><NavLink to="/eventos">Ver todas <ArrowRight size={14} /></NavLink></div>
          {upcoming.length ? upcoming.map((item) => <div className={styles.eventRow} key={item.id}><div className={styles.dateTile}><b>{item.date.slice(8, 10)}</b><span>{new Date(item.date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()}</span></div><div className={styles.eventInfo}><b>{item.title}</b><p>{item.description || 'Actividad publicada'}</p><small>{item.time && <><Clock3 size={12} /> {item.time}</>}{item.location && <><MapPin size={12} /> {item.location}</>}</small></div></div>) : <div className={styles.empty}><CalendarDays size={24} /><b>{loading ? 'Consultando agenda…' : 'No hay actividades próximas'}</b><span>Las actividades publicadas aparecerán aquí.</span></div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>NAVEGACIÓN RÁPIDA</span><h2>Accesos a módulos</h2><p>Atajos a las tareas más utilizadas.</p></div><LayoutDashboard size={20} /></div>
          <div className={styles.shortcuts}>{availableShortcuts.map((item) => { const Icon = item.icon; return <NavLink to={item.path} key={item.path}><i><Icon size={17} /></i><span><b>{item.label}</b><small>{item.detail}</small></span><ArrowUpRight size={15} /></NavLink>; })}</div>
        </article>

        {canReadAttendance && (
          <article className={styles.panel + ' ' + styles.attendanceChartPanel}>
            <div className={styles.panelHeading}>
              <div><span className={styles.kicker}>PARTICIPACIÓN</span><h2>Asistencia por reunión</h2><p>Porcentaje de presentes y llegadas tarde en las últimas reuniones registradas.</p></div>
              <ClipboardCheck size={20} />
            </div>
            {attendanceChartData.length ? (
              <div className={styles.chart}>
                <Suspense fallback={<div className={styles.empty} role="status">Preparando gráfico…</div>}>
                  <PointsChart data={attendanceChartData} valueSuffix="%" ariaLabel="Porcentaje de asistencia en las últimas reuniones registradas" />
                </Suspense>
              </div>
            ) : <div className={styles.empty}><ClipboardCheck size={24} /><b>{loading ? 'Consultando asistencia…' : 'Aún no hay reuniones con registros'}</b><span>La gráfica aparecerá cuando existan registros de asistencia.</span></div>}
          </article>
        )}
        <article className={styles.assistantCard}><div className={styles.assistantIcon}><Sparkles size={22} /></div><div><span className={styles.kicker}>ASISTENTE</span><h2>Fuego AI</h2><p>Apoyo para preparar actividades, comunicaciones e informes.</p></div>{isAdmin ? <NavLink to="/asistente">Abrir asistente <ArrowUpRight size={14} /></NavLink> : <small>Acceso administrativo</small>}</article>

        <article className={styles.systemCard}><span className={styles.kicker}>ESTADO DEL SISTEMA</span><div><ShieldCheck size={18} /><b>{firebaseReadOnlyMode ? 'Base original protegida' : 'Firebase original conectado'}</b></div><p>{configured ? (firebaseReadOnlyMode ? 'Las operaciones de escritura están bloqueadas.' : `Proyecto conectado: ${firebaseProjectId}`) : 'Vista previa sin conexión a Firebase.'}</p><small><UserRound size={13} /> Sesión: {String(profile?.name ?? user?.email ?? 'sin identificar')}</small></article>
      </section>
    </main>
  );
}
