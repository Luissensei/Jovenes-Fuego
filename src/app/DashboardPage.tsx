import styles from './styles/DashboardPage.module.css';
import {useEffect, useMemo, useState} from 'react';
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
  ChartNoAxesColumnIncreasing,
  Medal,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from './AuthContext';
import { modules } from './modules';
import {getPublicRankingMetrics, type PublicRankingMetric} from '../services/publicProfiles';
import {firebaseProjectId, firebaseReadOnlyMode} from '../services/firebase/client';

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

  const [publicProfiles, setPublicProfiles] = useState<PublicRankingMetric[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(configured);
  const [profilesError, setProfilesError] = useState('');

  useEffect(() => {
    let active = true;

    if (!configured) {
      setPublicProfiles([]);
      setProfilesLoading(false);
      setProfilesError('');
      return () => {
        active = false;
      };
    }

    setProfilesLoading(true);
    setProfilesError('');

    getPublicRankingMetrics()
      .then((rows) => {
        if (active) setPublicProfiles(rows);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setProfilesError(
          cause instanceof Error
            ? cause.message
            : 'No se pudieron consultar las puntuaciones públicas.',
        );
      })
      .finally(() => {
        if (active) setProfilesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [configured]);

  const rankedProfiles = useMemo(
    () => [...publicProfiles].sort(
      (a, b) => (b.points ?? 0) - (a.points ?? 0) ||
        a.name.localeCompare(b.name, 'es'),
    ),
    [publicProfiles],
  );

  const totalPoints = publicProfiles.reduce(
    (total, item) => total + (item.points ?? 0),
    0,
  );
  const topScore = rankedProfiles[0]?.points ?? 0;
  const topFive = rankedProfiles.slice(0, 5);

  const scoreBands = useMemo(() => {
    const ranges = [
      {label: '0–99 puntos', min: 0, max: 100},
      {label: '100–249 puntos', min: 100, max: 250},
      {label: '250–499 puntos', min: 250, max: 500},
      {label: '500 o más', min: 500, max: Number.POSITIVE_INFINITY},
    ];

    return ranges.map((range) => ({
      ...range,
      count: publicProfiles.filter((item) =>
        (item.points ?? 0) >= range.min &&
        (item.points ?? 0) < range.max,
      ).length,
    }));
  }, [publicProfiles]);

  return (
    <div className={`${styles.scope} dashboard-page tactical-dashboard`}>
      <div className="dashboard-commandline">
        <div className="dashboard-commandline-left">
          <span className="dashboard-live-dot" />
          <span>JDF / CENTRO DE OPERACIONES</span>
          <span className="dashboard-command-separator">/</span>
          <span className="dashboard-command-muted">PANEL PRINCIPAL</span>
        </div>
        <span className="dashboard-env">
          <ShieldCheck size={13} />
          {configured
            ? firebaseReadOnlyMode
              ? 'PRODUCCIÓN · SOLO LECTURA'
              : `STAGING · ${firebaseProjectId}`
            : 'MODO VISTA PREVIA'}
        </span>
      </div>

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-kicker">
            <Flame size={15} />
            FE · COMUNIDAD · PROPÓSITO
          </span>

          <p className="dashboard-hero-index">01 / CENTRO DE MANDO</p>

          <h1 className="jf-title-reveal">
            Mantén la
            <br />
            <span>llama encendida.</span>
          </h1>

          <p className="dashboard-hero-description">
            Hola, <strong className="jf-name-reveal">{firstName}</strong>. Este es el punto de partida para organizar,
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
            <span><span className="dashboard-live-dot" /> {configured ? 'FIREBASE CONECTADO' : 'VISTA PREVIA LOCAL'}</span>
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
              <strong className="dashboard-stat-word">
                {configured ? firebaseReadOnlyMode ? 'PROD RO' : 'STAGING' : 'DEMO'}
              </strong>
              <span>
                {configured
                  ? firebaseReadOnlyMode
                    ? 'Firebase original protegido'
                    : `Firebase ${firebaseProjectId}`
                  : 'Sin conexión a Firebase'}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-analytics" aria-labelledby="community-pulse-title">
        <div className="dashboard-section-title">
          <div>
            <span className="dashboard-section-kicker">INDICADORES DE COMUNIDAD</span>
            <h2 id="community-pulse-title">Pulso de la comunidad</h2>
            <p className="dashboard-analytics-intro">
              Resumen construido con los perfiles y puntos que el ranking tiene publicados.
            </p>
          </div>
          <span className="dashboard-section-note">FUENTE: RANKING PÚBLICO</span>
        </div>

        <div className="dashboard-community-stats">
          <article className="dashboard-community-stat">
            <span className="dashboard-community-stat-icon"><Users size={19}/></span>
            <div>
              <small>PARTICIPANTES</small>
              <strong>{profilesLoading ? '…' : profilesError ? '—' : publicProfiles.length}</strong>
              <span>Perfiles visibles en el ranking</span>
            </div>
          </article>
          <article className="dashboard-community-stat">
            <span className="dashboard-community-stat-icon points"><Flame size={19}/></span>
            <div>
              <small>PUNTOS ACUMULADOS</small>
              <strong>{profilesLoading ? '…' : profilesError ? '—' : totalPoints.toLocaleString('es-CO')}</strong>
              <span>Suma de los puntos publicados</span>
            </div>
          </article>
          <article className="dashboard-community-stat">
            <span className="dashboard-community-stat-icon leader"><Trophy size={19}/></span>
            <div>
              <small>PUNTAJE MÁS ALTO</small>
              <strong>{profilesLoading ? '…' : profilesError ? '—' : topScore.toLocaleString('es-CO')}</strong>
              <span>{rankedProfiles[0]?.name ?? 'Sin líder publicado'}</span>
            </div>
          </article>
        </div>

        {profilesError ? (
          <div className="dashboard-chart-state" role="alert">
            <ShieldCheck size={20}/>
            <div>
              <strong>No se pudieron cargar las gráficas</strong>
              <p>{profilesError}</p>
            </div>
          </div>
        ) : !configured ? (
          <div className="dashboard-chart-state">
            <ChartNoAxesColumnIncreasing size={22}/>
            <div>
              <strong>Gráficas pendientes de conexión</strong>
              <p>Al conectar Firebase se mostrarán aquí las estadísticas reales del ranking público.</p>
            </div>
          </div>
        ) : profilesLoading ? (
          <div className="dashboard-chart-state" aria-live="polite">
            <span className="dashboard-chart-spinner"/>
            <div>
              <strong>Actualizando indicadores</strong>
              <p>Consultando perfiles y puntos publicados.</p>
            </div>
          </div>
        ) : publicProfiles.length === 0 ? (
          <div className="dashboard-chart-state">
            <Users size={22}/>
            <div>
              <strong>El ranking todavía no tiene participantes</strong>
              <p>Cuando se publiquen perfiles, las gráficas aparecerán automáticamente.</p>
            </div>
          </div>
        ) : (
          <div className="dashboard-charts-grid">
            <article className="dashboard-chart-card dashboard-score-chart">
              <header className="dashboard-chart-header">
                <div>
                  <span>01 / TABLA DE RENDIMIENTO</span>
                  <h3>Top 5 por puntos</h3>
                  <p>Los participantes con mayor puntuación publicada.</p>
                </div>
                <span className="dashboard-chart-header-icon"><Medal size={20}/></span>
              </header>
              <div className="dashboard-bar-chart" role="list" aria-label="Cinco participantes con mayor puntuación">
                {topFive.map((item, index) => {
                  const points = item.points ?? 0;
                  const width = topScore > 0 ? Math.max(4, (points / topScore) * 100) : 0;
                  return (
                    <div className="dashboard-bar-row" key={item.id} role="listitem">
                      <span className="dashboard-bar-rank">{String(index + 1).padStart(2, '0')}</span>
                      <div className="dashboard-bar-main">
                        <div className="dashboard-bar-label">
                          <strong title={item.name}>{item.name}</strong>
                          <span>{points.toLocaleString('es-CO')} pts</span>
                        </div>
                        <div
                          className="dashboard-bar-track"
                          role="progressbar"
                          aria-label={`Puntos de ${item.name}`}
                          aria-valuemin={0}
                          aria-valuemax={topScore}
                          aria-valuenow={points}
                        >
                          <span style={{width: `${width}%`}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <footer className="dashboard-chart-foot">
                <span>Mayor puntuación</span>
                <strong>{topScore.toLocaleString('es-CO')} puntos</strong>
              </footer>
            </article>

            <article className="dashboard-chart-card dashboard-distribution-chart">
              <header className="dashboard-chart-header">
                <div>
                  <span>02 / DISTRIBUCIÓN DE PUNTOS</span>
                  <h3>Rangos de puntuación</h3>
                  <p>Cómo se distribuyen los perfiles visibles.</p>
                </div>
                <span className="dashboard-chart-header-icon distribution"><ChartNoAxesColumnIncreasing size={20}/></span>
              </header>
              <div className="dashboard-distribution-list" role="list" aria-label="Participantes por rango de puntos">
                {scoreBands.map((band) => {
                  const percent = publicProfiles.length > 0
                    ? (band.count / publicProfiles.length) * 100
                    : 0;
                  return (
                    <div className="dashboard-distribution-row" key={band.label} role="listitem">
                      <div className="dashboard-distribution-label">
                        <strong>{band.label}</strong>
                        <span>{band.count} {band.count === 1 ? 'perfil' : 'perfiles'}</span>
                      </div>
                      <div
                        className="dashboard-distribution-track"
                        role="progressbar"
                        aria-label={band.label}
                        aria-valuemin={0}
                        aria-valuemax={publicProfiles.length}
                        aria-valuenow={band.count}
                      >
                        <span style={{width: `${percent}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <footer className="dashboard-chart-foot">
                <span>Perfiles incluidos</span>
                <strong>{publicProfiles.length}</strong>
              </footer>
            </article>
          </div>
        )}
        <p className="dashboard-analytics-disclaimer">
          Las gráficas reflejan únicamente los datos públicos disponibles. No representan asistencia ni actividad histórica.
        </p>
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
