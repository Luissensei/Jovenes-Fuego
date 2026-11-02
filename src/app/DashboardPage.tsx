import {
  Users,
  CalendarCheck,
  Flame,
  Trophy,
  BookOpen,
  HeartHandshake,
  ArrowUpRight,
  Clock3,
  Gamepad2,
  ClipboardList,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const stats = [
  { label: 'Jóvenes registrados', value: '—', detail: 'Conectar colección', icon: Users },
  { label: 'Asistencias', value: '—', detail: 'Conectar registros', icon: CalendarCheck },
  { label: 'Puntos acumulados', value: '—', detail: 'Conectar ranking', icon: Trophy },
  { label: 'Actividades', value: '—', detail: 'Conectar eventos', icon: Flame },
];

const shortcuts = [
  { title: 'Jóvenes', description: 'Consultar perfiles y fichas', icon: Users, path: '/jovenes' },
  { title: 'Asistencia', description: 'Controlar asistencia', icon: ClipboardList, path: '/asistencia' },
  { title: 'Ranking', description: 'Puntos, niveles y posiciones', icon: Trophy, path: '/ranking' },
  { title: 'Juegos bíblicos', description: 'Retos y competencias', icon: Gamepad2, path: '/juegos' },
  { title: 'Devocionales', description: 'Lecturas y crecimiento', icon: BookOpen, path: '/devocionales' },
  { title: 'Seguimiento', description: 'Acompañamiento juvenil', icon: HeartHandshake, path: '/seguimiento' },
];

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">COMUNIDAD · FE · CRECIMIENTO</span>
          <h1>¡Bienvenido a Jóvenes de Fuego!</h1>
          <p>Un espacio para organizar, acompañar e impulsar el crecimiento de nuestra juventud.</p>
          <NavLink to="/jovenes" className="dashboard-primary">
            Explorar jóvenes <ArrowUpRight size={17} />
          </NavLink>
        </div>
        <div className="dashboard-flame"><Flame size={76} /></div>
      </section>

      <div className="dashboard-section-heading">
        <div>
          <span className="eyebrow">RESUMEN GENERAL</span>
          <h2>Estado de la comunidad</h2>
        </div>
        <span className="dashboard-period"><Clock3 size={14} /> Datos pendientes de conexión</span>
      </div>

      <section className="dashboard-stats">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="dashboard-stat" key={item.label}>
              <div className="dashboard-stat-top">
                <span>{item.label}</span>
                <span className="dashboard-stat-icon"><Icon size={19} /></span>
              </div>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          );
        })}
      </section>

      <div className="dashboard-section-heading">
        <div>
          <span className="eyebrow">ACCESO RÁPIDO</span>
          <h2>¿Qué deseas hacer?</h2>
        </div>
      </div>

      <section className="dashboard-shortcuts">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink to={item.path} className="dashboard-shortcut" key={item.path}>
              <span className="dashboard-shortcut-icon"><Icon size={21} /></span>
              <span className="dashboard-shortcut-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowUpRight className="dashboard-arrow" size={17} />
            </NavLink>
          );
        })}
      </section>

      <section className="dashboard-bottom-note">
        <Flame size={20} />
        <div>
          <strong>Una generación que sigue encendida</strong>
          <p>Este panel se conectará progresivamente con los módulos y datos reales del entorno de pruebas.</p>
        </div>
      </section>
    </div>
  );
}
