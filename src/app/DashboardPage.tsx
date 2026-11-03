import { useCallback, useEffect, useState } from 'react';
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
  UserPlus,
  HeartHandshake,
  QrCode,
  Sparkles,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from './AuthContext';
import { modules } from './modules';
import {getDashboardSummary, type DashboardSummary} from '../services/dashboard';

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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!configured) return;
    setSummaryLoading(true);
    setSummaryError('');
    try {
      setSummary(await getDashboardSummary());
    } catch (cause) {
      setSummaryError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen.');
    } finally {
      setSummaryLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

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
          <span className="dashboard-section-note">ESTADO DE APLICACIÓN</span>
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

      <section className="dashboard-briefing">
        <div className="dashboard-section-title">
          <div>
            <span className="dashboard-section-kicker">ACTIVIDAD DE LA COMUNIDAD</span>
            <h2>Resumen actualizado</h2>
          </div>
          <button
            type="button"
            className="dashboard-summary-refresh"
            onClick={() => void loadSummary()}
            disabled={!configured || summaryLoading}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>

        {summaryError && (
          <div className="attendance-error" role="alert">{summaryError}</div>
        )}

        {!configured ? (
          <p className="dashboard-summary-state">Conecta Firebase Staging para consultar las estadísticas reales.</p>
        ) : summaryLoading && !summary ? (
          <p className="dashboard-summary-state" role="status">Consultando datos de la comunidad...</p>
        ) : summary ? (
          <div className="dashboard-stats dashboard-live-stats">
            <article className="dashboard-stat">
              <span className="dashboard-stat-index">01</span>
              <div className="dashboard-stat-icon"><Users size={19} /></div>
              <div className="dashboard-stat-copy">
                <small>JÓVENES REGISTRADOS</small>
                <strong>{summary.memberCount}</strong>
                <span>Perfiles que pueden mostrarse según privacidad</span>
              </div>
            </article>
            {summary.role !== 'user' && (
              <>
                <article className="dashboard-stat">
                  <span className="dashboard-stat-index">02</span>
                  <div className="dashboard-stat-icon"><CalendarDays size={19} /></div>
                  <div className="dashboard-stat-copy">
                    <small>REUNIONES DEL MES</small>
                    <strong>{summary.meetingsThisMonth}</strong>
                    <span>Reuniones nuevas registradas</span>
                  </div>
                </article>
                <article className="dashboard-stat">
                  <span className="dashboard-stat-index">03</span>
                  <div className="dashboard-stat-icon"><CheckCircle2 size={19} /></div>
                  <div className="dashboard-stat-copy">
                    <small>ASISTENCIAS PRESENTES</small>
                    <strong>{summary.attendancePresent}</strong>
                    <span>Registros de presencia del mes</span>
                  </div>
                </article>
              </>
            )}
            {summary.followupsPending !== null && (
              <article className="dashboard-stat">
                <span className="dashboard-stat-index">04</span>
                <div className="dashboard-stat-icon"><ClipboardList size={19} /></div>
                <div className="dashboard-stat-copy">
                  <small>SEGUIMIENTOS PENDIENTES</small>
                  <strong>{summary.followupsPending}</strong>
                  <span>Registros que requieren acompañamiento</span>
                </div>
              </article>
            )}
            {summary.visitorsNew !== null && (
              <article className="dashboard-stat">
                <span className="dashboard-stat-index">05</span>
                <div className="dashboard-stat-icon"><UserPlus size={19} /></div>
                <div className="dashboard-stat-copy">
                  <small>VISITANTES NUEVOS</small>
                  <strong>{summary.visitorsNew}</strong>
                  <span>Personas por contactar o integrar</span>
                </div>
              </article>
            )}
            {summary.prayersPending !== null && (
              <article className="dashboard-stat">
                <span className="dashboard-stat-index">06</span>
                <div className="dashboard-stat-icon"><HeartHandshake size={19} /></div>
                <div className="dashboard-stat-copy">
                  <small>PETICIONES PENDIENTES</small>
                  <strong>{summary.prayersPending}</strong>
                  <span>Solicitudes sin atender</span>
                </div>
              </article>
            )}
            <article className="dashboard-stat">
              <span className="dashboard-stat-index">07</span>
              <div className="dashboard-stat-icon"><BookOpen size={19} /></div>
              <div className="dashboard-stat-copy">
                <small>PRÓXIMAS ACTIVIDADES</small>
                <strong>{summary.upcomingActivities}</strong>
                <span>Actividades publicadas por venir</span>
              </div>
            </article>
          </div>
        ) : (
          <p className="dashboard-summary-state">Aún no hay información para mostrar.</p>
        )}
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
