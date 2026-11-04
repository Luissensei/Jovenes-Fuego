import styles from './styles/RankingPage.module.css';

import { useEffect, useMemo, useState } from 'react';

import {
  Trophy,
  Gamepad2,
  UserRound,
  Flame,
  Star,
  LockKeyhole,
  BookOpen,
  Brain,
  Timer,
  Swords,
  Puzzle,
  ChevronRight,
  Medal,
  Sparkles,
  RefreshCw,
  Crown,
  ShieldCheck,
  Search,
  CheckCircle2,
  BadgeCheck,
  UserSearch,
} from 'lucide-react';

import {
  getPublicProfiles,
  type PublicProfile,
} from '../services/publicProfiles';
import {
  getHallOfFame,
  type FaithfulPlayer,
} from '../services/youthPortal';

import TriviaGame from './TriviaGame';
import VerseGame from './VerseGame';
import { TrueFalseGame, WhoAmIGame } from './QuickBibleGames';
import {
  MemoryGame,
  ChallengeGame,
  SurvivalGame,
  DuelGame,
  OrderVerseGame,
} from './MoreBibleGames';

type Tab = 'ranking' | 'games' | 'profiles';

const games = [
  {
    id: 'trivia',
    title: 'Trivia bíblica',
    description: 'Demuestra cuánto sabes de la Biblia.',
    detail: 'Preguntas, respuestas y puntuación.',
    icon: BookOpen,
    color: 'orange',
    available: true,
  },
  {
    id: 'verse',
    title: 'Completa el versículo',
    description: 'Recuerda y completa las Escrituras.',
    detail: 'Pon a prueba tu memoria bíblica.',
    icon: Star,
    color: 'purple',
    available: true,
  },
  {
    id: 'memory',
    title: 'Memoria bíblica',
    description: 'Encuentra las parejas correctas.',
    detail: 'Relaciona personajes y acontecimientos.',
    icon: Brain,
    color: 'blue',
    available: true,
  },
  {
    id: 'challenge',
    title: 'Reto de 60 segundos',
    description: 'Responde antes de que termine el tiempo.',
    detail: 'Responde rápido y consigue puntos.',
    icon: Timer,
    color: 'green',
    available: true,
  },
  {
    id: 'survival',
    title: 'Supervivencia',
    description: '¿Cuántas preguntas puedes superar?',
    detail: 'Avanza de nivel sin perder oportunidades.',
    icon: Flame,
    color: 'red',
    available: true,
  },
  {
    id: 'duel',
    title: 'Duelo 1 contra 1',
    description: 'Compite con otro joven.',
    detail: 'Demuestra tus conocimientos.',
    icon: Swords,
    color: 'purple',
    available: true,
  },
  {
    id: 'order',
    title: 'Ordena el versículo',
    description: 'Organiza las palabras correctamente.',
    detail: 'Reconstruye versículos.',
    icon: Puzzle,
    color: 'blue',
    available: true,
  },
  {id:'truefalse',title:'Verdadero o falso',description:'Identifica afirmaciones correctas e incorrectas.',detail:'20 afirmaciones para entrenar tu conocimiento.',icon:BadgeCheck,color:'green',available:true},
  {id:'whoami',title:'¿Quién soy?',description:'Adivina el personaje con pistas progresivas.',detail:'Gana más puntos si necesitas menos pistas.',icon:UserSearch,color:'purple',available:true},
];

export default function RankingPage({
  initialTab = 'ranking',
}: {
  initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingScope, setRankingScope] = useState<'all' | '10' | '25'>('all');
  const [expandedRankingId, setExpandedRankingId] = useState<string | null>(null);

  const [selectedProfile, setSelectedProfile] =
    useState<PublicProfile | null>(null);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [faithfulPlayers, setFaithfulPlayers] = useState<FaithfulPlayer[]>([]);
  const [faithfulLoading, setFaithfulLoading] = useState(true);
  const [attendanceLimited, setAttendanceLimited] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    setError('');

    try {
      const result = await getPublicProfiles();
      setProfiles(result);
    } catch (err) {
      console.error('Error cargando perfiles públicos:', err);

      setError(
        'No se pudieron cargar los perfiles. Verifica Firebase Staging y sus permisos.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadProfiles();
    getHallOfFame()
      .then((result) => {
        if (!active) return;
        setFaithfulPlayers(result.faithful ?? []);
        setAttendanceLimited(result.attendanceLimited === true);
      })
      .catch((cause) => {
        console.warn('No se pudo consultar el cuadro de honor:', cause);
      })
      .finally(() => {
        if (active) setFaithfulLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Búsqueda independiente para la sección de perfiles.
  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();

    return profiles.filter((profile) =>
      `${profile.name ?? ''} ${profile.nick ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [profiles, search]);

  // La clasificación siempre utiliza todos los perfiles.
  // No depende del texto escrito en el buscador.
  const ranking = useMemo(() => {
    const sorted = [...profiles].sort(
      (a, b) =>
        (b.points ?? 0) - (a.points ?? 0) ||
        a.name.localeCompare(b.name, 'es'),
    );

    // Los empates comparten posición: 1, 2, 2, 4.
    let position = 0;
    let previousPoints: number | null = null;

    return sorted.map((profile, index) => {
      const points = profile.points ?? 0;
      if (previousPoints === null || points !== previousPoints) {
        position = index + 1;
      }
      previousPoints = points;
      return {...profile, position};
    });
  }, [profiles]);

  const visibleRanking = useMemo(() => {
    const term = rankingSearch.trim().toLocaleLowerCase('es');
    const matching = ranking.filter((player) => `${player.name ?? ''} ${player.nick ?? ''}`.toLocaleLowerCase('es').includes(term));
    return rankingScope === 'all' ? matching : matching.slice(0, Number(rankingScope));
  }, [ranking, rankingSearch, rankingScope]);
  const rankDistribution = useMemo(() => {
    const ranges = [
      {label:'0–99',min:0,max:99},
      {label:'100–249',min:100,max:249},
      {label:'250–499',min:250,max:499},
      {label:'500–999',min:500,max:999},
      {label:'1.000+',min:1000,max:Number.POSITIVE_INFINITY},
    ];
    return ranges.map((range) => ({
      label:range.label,
      count:ranking.filter((player) => {
        const points = player.points ?? 0;
        return points >= range.min && points <= range.max;
      }).length,
    }));
  }, [ranking]);


  const totalPoints = profiles.reduce(
    (total, profile) => total + (profile.points ?? 0),
    0,
  );

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setActiveGame(null);
  }

  return (
    <section className={`${styles.scope} ranking-hub`}>

      {/* ENCABEZADO PRINCIPAL */}
      <header className="ranking-hero">
        <div className="ranking-hero-copy">
          <span className="ranking-eyebrow">
            <Flame size={15} />
            COMUNIDAD JÓVENES DE FUEGO
          </span>

          <h1>¡Que comience el desafío!</h1>

          <p>
            Aprende, juega, crece y demuestra lo que sabes
            de la Palabra de Dios.
          </p>

          <button
            className="ranking-hero-button"
            onClick={() => changeTab('games')}
          >
            Explorar desafíos
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="ranking-hero-art">
          <Trophy size={62} />
          <Sparkles className="ranking-sparkle" size={23} />
        </div>
      </header>

      {/* NAVEGACIÓN */}
      <nav className="ranking-tabs">
        <button
          className={activeTab === 'ranking' ? 'active' : ''}
          onClick={() => changeTab('ranking')}
        >
          <Trophy size={17} />
          Clasificación
        </button>

        <button
          className={activeTab === 'games' ? 'active' : ''}
          onClick={() => changeTab('games')}
        >
          <Gamepad2 size={17} />
          Juegos
        </button>

        <button
          className={activeTab === 'profiles' ? 'active' : ''}
          onClick={() => changeTab('profiles')}
        >
          <UserRound size={17} />
          Perfiles
        </button>
      </nav>

      {/* ====================================== */}
      {/* SECCIÓN DE CLASIFICACIÓN */}
      {/* ====================================== */}

      {activeTab === 'ranking' && (
        <div className="ranking-content">

          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">
                TABLA DE POSICIONES
              </span>

              <h2>Los mejores participantes</h2>

              <p>
                Clasificación según los puntos registrados.
              </p>
            </div>

            <span className="ranking-heading-icon ranking-heading-icon-live">
              <Trophy size={25} /><i aria-label="Datos públicos" />
            </span>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="ranking-info-grid">
            <article>
              <UserRound size={23} />
              <strong>{profiles.length}</strong>
              <span>Participantes</span>
            </article>

            <article>
              <Star size={23} />
              <strong>{totalPoints}</strong>
              <span>Puntos acumulados</span>
            </article>

            <article>
              <Trophy size={23} />
              <strong>{ranking[0]?.points ?? 0}</strong>
              <span>Mayor puntuación</span>
            </article>
          </div>

          <section className="ranking-progress-panel">
            <header><div><span>LECTURA RÁPIDA</span><h3>Distribución de puntuaciones</h3><p>Perfiles publicados por rango de puntos.</p></div><span>{profiles.length} jóvenes</span></header>
            <div className="ranking-progress-bands">
              {rankDistribution.map((band,index) => {
                const percentage = profiles.length ? (band.count / profiles.length) * 100 : 0;
                return <div className="ranking-progress-band" key={band.label}>
                  <div><b>{band.label} puntos</b><span>{band.count} · {Math.round(percentage)}%</span></div>
                  <i><em className={'band-' + index} style={{width: percentage + '%'}}/></i>
                </div>;
              })}
            </div>
          </section>

          {/* PODIO Y CONSTANCIA: el Top 3 sale de la misma lista que la clasificación general */}
          <section className="youth-hall-grid ranking-hall-grid" aria-label="Cuadro de honor">
            <article className="youth-hall-card youth-hall-points">
              <header>
                <Crown size={21} />
                <div>
                  <span>RECONOCIMIENTO</span>
                  <h2>Podio de puntos</h2>
                </div>
              </header>
              <p className="youth-hall-caption">
                Los tres primeros puestos de la clasificación general.
              </p>
              {loading ? (
                <p className="youth-data-empty">Consultando puntuaciones…</p>
              ) : ranking.length ? (
                <ol className="ranking-podium-list">
                  {ranking.slice(0, 3).map((player, index) => (
                    <li
                      key={player.id}
                      className={`ranking-podium-player place-${index + 1}`}
                      aria-label={`Puesto ${player.position}: ${player.name}, ${player.points} puntos`}
                    >
                      <span className="ranking-podium-rank">
                        {player.position === 1 ? <Crown size={19} /> : <Medal size={18} />}
                      </span>
                      <span className="ranking-podium-avatar">
                        {player.pic ? (
                          <img src={player.pic} alt={`Foto de ${player.name}`} loading="lazy" />
                        ) : (
                          player.name.trim().split(/\s+/).slice(0, 2)
                            .map((part) => part[0] ?? '').join('').toUpperCase()
                        )}
                      </span>
                      <span className="ranking-podium-details">
                        <strong>{player.name}</strong>
                        <small>{player.points} {player.points === 1 ? 'punto' : 'puntos'}</small>
                      </span>
                      <span className="ranking-podium-place">Puesto {player.position}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="youth-data-empty">Aún no hay puntuaciones publicadas.</p>
              )}
            </article>

            <article className="youth-hall-card youth-hall-faithful">
              <header>
                <Flame size={21} />
                <div>
                  <span>CONSTANCIA Y COMPROMISO</span>
                  <h2>Top 10 de asistencias</h2>
                </div>
              </header>
              <p className="youth-hall-caption">
                Según las asistencias consecutivas publicadas por el sistema original.
              </p>
              {attendanceLimited && (
                <p className="youth-hall-limited" role="note">
                  El cálculo usa las reuniones recientes disponibles.
                </p>
              )}
              {faithfulLoading ? (
                <p className="youth-data-empty">Consultando asistencias…</p>
              ) : faithfulPlayers.length ? (
                <ol className="youth-faithful-list">
                  {faithfulPlayers.slice(0, 10).map((player, index) => (
                    <li key={player.id}>
                      <span className="youth-faithful-rank">{index + 1}</span>
                      <span className="youth-faithful-name">{player.name}</span>
                      <strong>
                        {player.attendances}{' '}
                        {player.attendances === 1 ? 'servicio seguido' : 'servicios seguidos'}
                      </strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="youth-data-empty">Aún no hay asistencias consecutivas publicadas.</p>
              )}
            </article>
          </section>

          {/* CARGANDO */}
          {loading && (
            <div className="ranking-state">
              <div className="spinner" />
              <strong>Cargando clasificación...</strong>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="ranking-state">
              <LockKeyhole size={30} />

              <strong>Error al cargar el ranking</strong>

              <span>{error}</span>

              <button onClick={() => void loadProfiles()}>
                <RefreshCw size={16} />
                Reintentar
              </button>
            </div>
          )}

          {/* SIN PARTICIPANTES */}
          {!loading && !error && ranking.length === 0 && (
            <div className="ranking-empty">
              <Trophy size={40} />

              <h3>¡Tu historia comienza aquí!</h3>

              <p>
                Todavía no hay jóvenes registrados en los perfiles públicos.
              </p>

              <button onClick={() => changeTab('profiles')}>
                Ver perfiles
                <ChevronRight size={17} />
              </button>
            </div>
          )}

          {/* CLASIFICACIÓN GENERAL */}
          {!loading && !error && ranking.length > 0 && (
            <>
              <div className="ranking-list-heading">
                <div><span className="ranking-kicker">CLASIFICACIÓN GENERAL</span><h3>Todos los participantes</h3><p>Explora posiciones, compara puntuaciones y descubre cuánto falta para alcanzar el primer lugar.</p></div>
                <span className="ranking-list-count">{visibleRanking.length} de {ranking.length} jóvenes</span>
              </div>
              <div className="ranking-visual-toolbar">
                <label className="ranking-search"><Search size={17}/><input value={rankingSearch} onChange={(event) => setRankingSearch(event.target.value)} placeholder="Buscar por nombre o apodo..." aria-label="Buscar en el ranking"/>{rankingSearch && <button type="button" onClick={() => setRankingSearch('')} aria-label="Limpiar búsqueda">×</button>}</label>
                <div className="ranking-view-filters" aria-label="Filtrar posiciones">
                  <button type="button" className={rankingScope === 'all' ? 'active' : ''} aria-pressed={rankingScope === 'all'} onClick={() => setRankingScope('all')}>Todos</button>
                  <button type="button" className={rankingScope === '10' ? 'active' : ''} aria-pressed={rankingScope === '10'} onClick={() => setRankingScope('10')}>Top 10</button>
                  <button type="button" className={rankingScope === '25' ? 'active' : ''} aria-pressed={rankingScope === '25'} onClick={() => setRankingScope('25')}>Top 25</button>
                </div>
              </div>
              <div className="ranking-list" role="list" aria-label="Clasificación general">
                {visibleRanking.map((profile) => {
                  const expanded = expandedRankingId === profile.id;
                  const leaderGap = Math.max(0, (ranking[0]?.points ?? 0) - (profile.points ?? 0));
                  const leaderShare = ranking[0]?.points ? Math.max(0, Math.min(100, ((profile.points ?? 0) / ranking[0].points) * 100)) : 0;
                  return (
                    <article className={`ranking-player ${profile.position === 1 ? 'ranking-first' : profile.position === 2 ? 'ranking-second' : profile.position === 3 ? 'ranking-third' : ''}`} key={profile.id} role="listitem" aria-label={`Puesto ${profile.position}: ${profile.name}, ${profile.points} puntos`}>
                      <span className="ranking-position" aria-label={`Puesto ${profile.position}`}>{profile.position === 1 ? <Crown size={21}/> : profile.position <= 3 ? <Medal size={20}/> : profile.position}</span>
                      <span className="profile-avatar">{profile.pic ? <img src={profile.pic} alt={`Foto de ${profile.name}`} loading="lazy"/> : profile.name.trim().split(/\s+/).slice(0,2).map((part) => part[0] ?? '').join('').toUpperCase()}</span>
                      <div className="ranking-player-info"><strong>{profile.name || 'Joven'}</strong>{profile.nick && <small>@{profile.nick}</small>}</div>
                      <div className="ranking-player-data"><div className="ranking-player-points"><Star size={17}/><strong>{(profile.points ?? 0).toLocaleString('es-CO')}</strong><span>{profile.points === 1 ? 'punto' : 'puntos'}</span></div><div className="ranking-player-track" role="progressbar" aria-label="Porcentaje respecto al líder" aria-valuenow={Math.round(leaderShare)} aria-valuemin={0} aria-valuemax={100}><i style={{width: leaderShare + '%'}}/></div></div>
                      <span className="ranking-player-gap">{profile.position === 1 ? 'LÍDER' : '-' + leaderGap.toLocaleString('es-CO') + ' pts'}</span>
                      <button type="button" className="ranking-player-expand" aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'} aria-expanded={expanded} onClick={() => setExpandedRankingId(expanded ? null : profile.id)}><ChevronRight size={16}/></button>
                      {expanded && <div className="ranking-player-tooltip"><span><b>Posición:</b> #{profile.position}</span><span><b>Puntuación:</b> {(profile.points ?? 0).toLocaleString('es-CO')} puntos</span><span><b>Brecha al líder:</b> {profile.position === 1 ? 'Está en la cima' : leaderGap.toLocaleString('es-CO') + ' puntos'}</span><span><b>Avance relativo:</b> {Math.round(leaderShare)}%</span></div>}
                    </article>
                  );
                })}
                {visibleRanking.length === 0 && <div className="ranking-state"><Search size={25}/><strong>No encontramos ese joven</strong><span>Prueba con otro nombre o apodo.</span></div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* SECCIÓN DE JUEGOS */}
      {/* ====================================== */}

      {activeTab === 'games' && (
        <div className="ranking-content">

          {activeGame === 'trivia' ? (
            <TriviaGame
              onExit={() => setActiveGame(null)}
            />
          ) : activeGame === 'verse' ? (
            <VerseGame
              onExit={() => setActiveGame(null)}
            />
          ) : activeGame === 'memory' ? (
            <MemoryGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'challenge' ? (
            <ChallengeGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'survival' ? (
            <SurvivalGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'duel' ? (
            <DuelGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'order' ? (
            <OrderVerseGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'truefalse' ? (
            <TrueFalseGame onExit={() => setActiveGame(null)} />
          ) : activeGame === 'whoami' ? (
            <WhoAmIGame onExit={() => setActiveGame(null)} />
          ) : (
            <>
              <div className="ranking-section-heading">
                <div>
                  <span className="ranking-kicker">
                    ZONA DE DESAFÍOS
                  </span>

                  <h2>Juegos bíblicos</h2>

                  <p>
                    Prepárate para aprender y poner a prueba tus conocimientos.
                  </p>
                </div>

                <span className="ranking-heading-icon">
                  <Gamepad2 size={27} />
                </span>
              </div>

              {/* TARJETAS DE JUEGOS */}
              <div className="games-grid">
                {games.map((game) => {
                  const Icon = game.icon;

                  return (
                    <article
                      className={`game-card ${game.color} ${
                        game.available ? 'game-available' : ''
                      }`}
                      key={game.id}
                    >
                      <div className="game-card-top">
                        <span className="game-icon">
                          <Icon size={25} />
                        </span>

                        <span className="game-status">
                          {game.available ? (
                            <>
                              <CheckGameIcon />
                              Disponible
                            </>
                          ) : (
                            <>
                              <LockKeyhole size={12} />
                              En preparación
                            </>
                          )}
                        </span>
                      </div>

                      <h3>{game.title}</h3>

                      <p>{game.description}</p>

                      <small className="game-detail">
                        {game.detail}
                      </small>

                      <div className="game-card-footer">
                        {game.available ? (
                          <button
                            onClick={() => setActiveGame(game.id)}
                          >
                            Jugar ahora
                            <ChevronRight size={16} />
                          </button>
                        ) : (
                          <span>Próximamente</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* SECCIÓN DE PERFILES */}
      {/* ====================================== */}

      {activeTab === 'profiles' && (
        <div className="ranking-content">

          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">
                IDENTIDAD JUVENIL
              </span>

              <h2>Selecciona tu perfil</h2>

              <p>
                Encuentra tu perfil dentro de la comunidad.
              </p>
            </div>

            <span className="ranking-heading-icon">
              <UserRound size={27} />
            </span>
          </div>

          {/* AVISO DE PRIVACIDAD */}
          <div className="profile-notice">
            <ShieldCheck size={20} />

            <span>
              Aquí solo se muestran datos públicos.
              Seleccionar un perfil no inicia sesión.
            </span>
          </div>

          {/* BUSCADOR */}
          <div className="profile-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar joven por nombre o apodo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {/* CARGANDO */}
          {loading && (
            <div className="ranking-state">
              <div className="spinner" />
              <strong>Cargando perfiles...</strong>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="ranking-state">
              <LockKeyhole size={30} />

              <strong>No se pudieron cargar los perfiles</strong>

              <span>{error}</span>

              <button onClick={() => void loadProfiles()}>
                <RefreshCw size={16} />
                Intentar nuevamente
              </button>
            </div>
          )}

          {/* SIN RESULTADOS */}
          {!loading && !error && filteredProfiles.length === 0 && (
            <div className="ranking-state">
              <UserRound size={32} />

              <strong>No hay perfiles disponibles</strong>

              <span>
                No encontramos jóvenes con ese nombre.
              </span>
            </div>
          )}

          {/* PERFILES DISPONIBLES */}
          {!loading && !error && filteredProfiles.length > 0 && (
            <>
              <div className="profiles-summary">
                <strong>{filteredProfiles.length}</strong>

                <span>perfiles disponibles</span>
              </div>

              <div className="profiles-grid">
                {filteredProfiles.map((profile) => (
                  <button
                    className={`profile-card ${
                      selectedProfile?.id === profile.id ? 'selected' : ''
                    }`}
                    key={profile.id}
                    onClick={() =>
                      setSelectedProfile(
                        selectedProfile?.id === profile.id
                          ? null
                          : profile,
                      )
                    }
                  >
                    <span className="profile-avatar">
                      {profile.pic ? (
                        <img src={profile.pic} alt="" />
                      ) : (
                        <UserRound size={29} />
                      )}
                    </span>

                    <strong>{profile.name || 'Joven'}</strong>

                    <small>
                      @{profile.nick || 'sin-apodo'}
                    </small>

                    <span className="profile-select">
                      {selectedProfile?.id === profile.id
                        ? 'Seleccionado'
                        : 'Seleccionar'}

                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))}
              </div>

              {/* PERFIL SELECCIONADO */}
              {selectedProfile && (
                <div className="selected-profile-panel">
                  <div className="selected-profile-avatar">
                    {selectedProfile.pic ? (
                      <img src={selectedProfile.pic} alt="" />
                    ) : (
                      <UserRound size={28} />
                    )}
                  </div>

                  <div>
                    <span className="ranking-kicker">
                      PERFIL SELECCIONADO
                    </span>

                    <h3>{selectedProfile.name}</h3>

                    <p>@{selectedProfile.nick}</p>

                    <small>
                      El acceso personal requiere autenticación segura.
                    </small>
                  </div>

                  <button
                    onClick={() => setSelectedProfile(null)}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <footer className="ranking-footer-note">
        <LockKeyhole size={15} />

        Datos de los perfiles públicos · Puntuaciones publicadas por administración.
      </footer>
    </section>
  );
}

function CheckGameIcon() {
  return <CheckCircle2 size={12} />;
}
