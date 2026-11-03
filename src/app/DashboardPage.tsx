import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Crosshair,
  Flame,
  Gamepad2,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from './AuthContext';
import { modules } from './modules';

const quickActions = [
  {
    title: 'Ranking',
    eyebrow: 'COMPETENCIA',
    description: 'Clasificación, puntos y progreso de la comunidad.',
    icon: Trophy,
    path: '/ranking',
    code: '01',
    accent: 'amber',
  },
  {
    title: 'Zona de juegos',
    eyebrow: 'DESAFÍOS',
    description: 'Siete experiencias para aprender jugando.',
    icon: Gamepad2,
    path: '/juegos',
    code: '02',
    accent: 'violet',
  },
  {
    title: 'Jóvenes',
    eyebrow: 'COMUNIDAD',
    description: 'Fichas, perfiles y datos de participantes.',
    icon: Users,
    path: '/jovenes',
    code: '03',
    accent: 'orange',
  },
  {
    title: 'Asistencia',
    eyebrow: 'CONTROL',
    description: 'Reuniones, presencia y seguimiento.',
    icon: CalendarDays,
    path: '/asistencia',
    code: '04',
    accent: 'blue',
  },
  {
    title: 'Check-in QR',
    eyebrow: 'ACCESO',
    description: 'Registro de llegada y lectura de códigos.',
    icon: QrCode,
    path: '/checkin',
    code: '05',
    accent: 'green',
  },
  {
    title: 'Devocionales',
    eyebrow: 'CRECIMIENTO',
    description: 'Contenido para fortalecer la vida espiritual.',
    icon: BookOpen,
    path: '/devocionales',
    code: '06',
    accent: 'rose',
  },
];

export default function DashboardPage() {
  const { profile, user, configured } = useAuth();
  const firstName = String(profile?.name ?? user?.email?.split('@')[0] ?? 'equipo')
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="dashboard-page tactical-dashboard">
      <div className="dashboard-commandline">
        <div className="dashboard-commandline-left">
          <span className="dashboard-live-dot" />
          <span>JDF / CENTRO DE OPERACIONES</span>
          <span className="dashboard-command-separator">/</span>
          <span className="dashboard-command-muted">PANEL PRINCIPAL</span>
        </div>
        <span className="dashboard-env">
          <ShieldCheck size={13} />
          {configured ? 'STAGING ACTIVO' : 'MODO VISTA PREVIA'}
        </span>
      </div>

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-kicker">
            <Flame size={15} />
            FE · COMUNIDAD · PROPÓSITO
          </span>

          <p className="dashboard-hero-index">01 / CENTRO DE MANDO</p>

          <h1>
            Mantén la
            <br />
            <span>llama encendida.</span>
          </h1>

          <p className="dashboard-hero-description">
            Hola, {firstName}. Este es el punto de partida para organizar,
            acompañar y activar a nuestra generación.
          </p>

          <div className="dashboard-hero-actions">
            <NavLink to="/ranking" className="dashboard-primary">
              <Gamepad2 size={17} />
              Entrar a desafíos
              <ArrowUpRight size={16} />
            </NavLink>
            <NavLink to="/jovenes" className="dashboard-secondary">
              Ver comunidad
              <ArrowDownRight size={16} />
            </NavLink>
          </div>

          <div className="dashboard-hero-foot">
            <span><span className="dashboard-live-dot" /> SISTEMA EN LÍNEA</span>
            <span>JÓVENES DE FUEGO / 2026</span>
          </div>
        </div>

        <div className="dashboard-hero-art" aria-hidden="true">
          <div className="dashboard-art-grid" />
          <div className="dashboard-art-orbit orbit-one" />
          <div className="dashboard-art-orbit orbit-two" />
          <div className="dashboard-art-core">
            <Flame size={96} strokeWidth={1.25} />
          </div>
          <span className="dashboard-art-tag tag-top">
            <Crosshair size={13} /> VISIÓN
          </span>
          <span className="dashboard-art-tag tag-side">
            <Sparkles size={13} /> PROPÓSITO
          </span>
          <span className="dashboard-art-coordinates">10°23' N / 75°30' W</span>
          <span className="dashboard-art-vertical">BUILT ON FAITH</span>
        </div>
      </section>

      <section className="dashboard-briefing">
        <div className="dashboard-section-title">
          <div>
            <span className="dashboard-section-kicker">INFORMACIÓN DEL SISTEMA</span>
            <h2>Estado de la operación</h2>
          </div>
          <span className="dashboard-section-note">DATOS DE CONFIGURACIÓN · NO ESTADÍSTICAS</span>
        </div>

        <div className="dashboard-stats">
          <article className="dashboard-stat stat-wide">
            <span className="dashboard-stat-index">01</span>
            <div className="dashboard-stat-icon"><Activity size={19} /></div>
            <div className="dashboard-stat-copy">
              <small>SECCIONES EN EL PANEL</small>
              <strong>{String(modules.length).padStart(2, '0')}</strong>
              <span>Módulos disponibles en navegación</span>
            </div>
            <span className="dashboard-stat-mark">JDF / CORE</span>
          </article>

          <article className="dashboard-stat">
            <span className="dashboard-stat-index">02</span>
            <div className="dashboard-stat-icon"><Swords size={19} /></div>
            <div className="dashboard-stat-copy">
              <small>JUEGOS BÍBLICOS</small>
              <strong>07</strong>
              <span>Experiencias en la zona de retos</span>
            </div>
          </article>

          <article className="dashboard-stat">
            <span className="dashboard-stat-index">03</span>
            <div className="dashboard-stat-icon"><ShieldCheck size={19} /></div>
            <div className="dashboard-stat-copy">
              <small>ENTORNO ACTUAL</small>
              <strong className="dashboard-stat-word">{configured ? 'TEST' : 'DEMO'}</strong>
              <span>{configured ? 'Firebase de pruebas' : 'Sin conexión a Firebase'}</span>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-launch">
        <div className="dashboard-section-title">
          <div>
            <span className="dashboard-section-kicker">ACCESO DIRECTO</span>
            <h2>Selecciona tu siguiente movimiento</h2>
          </div>
          <span className="dashboard-section-note">06 RUTAS RÁPIDAS</span>
        </div>

        <div className="dashboard-shortcuts">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                to={item.path}
                className={`dashboard-shortcut shortcut-${item.accent}`}
                key={item.path}
              >
                <span className="dashboard-shortcut-code">{item.code}</span>
                <span className="dashboard-shortcut-icon"><Icon size={21} /></span>
                <span className="dashboard-shortcut-copy">
                  <small>{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <ArrowUpRight className="dashboard-arrow" size={18} />
              </NavLink>
            );
          })}
        </div>
      </section>

      <section className="dashboard-bottom-note">
        <span className="dashboard-bottom-icon"><Flame size={21} /></span>
        <div>
          <span className="dashboard-section-kicker">IDENTIDAD JDF</span>
          <strong>Una generación que no apaga su fuego.</strong>
          <p>Un espacio para crecer en la fe, servir con propósito y caminar juntos.</p>
        </div>
        <span className="dashboard-bottom-mark">JDF<span>®</span></span>
      </section>
    </div>
  );
}
