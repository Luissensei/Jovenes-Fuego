
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
} from 'lucide-react';

import {
  getPublicProfiles,
  type PublicProfile,
} from '../services/publicProfiles';

import TriviaGame from './TriviaGame';
import VerseGame from './VerseGame';

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
    available: false,
  },
  {
    id: 'challenge',
    title: 'Reto de 60 segundos',
    description: 'Responde antes de que termine el tiempo.',
    detail: 'Responde rápido y consigue puntos.',
    icon: Timer,
    color: 'green',
    available: false,
  },
  {
    id: 'survival',
    title: 'Supervivencia',
    description: '¿Cuántas preguntas puedes superar?',
    detail: 'Avanza de nivel sin perder oportunidades.',
    icon: Flame,
    color: 'red',
    available: false,
  },
  {
    id: 'duel',
    title: 'Duelo 1 contra 1',
    description: 'Compite con otro joven.',
    detail: 'Demuestra tus conocimientos.',
    icon: Swords,
    color: 'purple',
    available: false,
  },
  {
    id: 'order',
    title: 'Ordena el versículo',
    description: 'Organiza las palabras correctamente.',
    detail: 'Reconstruye versículos.',
    icon: Puzzle,
    color: 'blue',
    available: false,
  },
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

  const [selectedProfile, setSelectedProfile] =
    useState<PublicProfile | null>(null);

  const [activeGame, setActiveGame] = useState<string | null>(null);

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
    void loadProfiles();
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
  const ranking = useMemo(
    () =>
      [...profiles].sort(
        (a, b) => (b.points ?? 0) - (a.points ?? 0),
      ),
    [profiles],
  );

  const totalPoints = profiles.reduce(
    (total, profile) => total + (profile.points ?? 0),
    0,
  );

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setActiveGame(null);
  }

  return (
    <section className="ranking-hub">

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

            <span className="ranking-heading-icon">
              <Trophy size={25} />
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

          {/* LISTA DE POSICIONES */}
          {!loading && !error && ranking.length > 0 && (
            <div className="ranking-list">
              {ranking.map((profile, index) => (
                <article
                  className={`ranking-player ${
                    index === 0 ? 'ranking-first' : ''
                  }`}
                  key={profile.id}
                >
                  <span className="ranking-position">
                    {index === 0 ? (
                      <Crown size={23} />
                    ) : index === 1 ? (
                      <Medal size={22} />
                    ) : index === 2 ? (
                      <Medal size={20} />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span className="profile-avatar">
                    {profile.pic ? (
                      <img src={profile.pic} alt="" />
                    ) : (
                      <UserRound size={27} />
                    )}
                  </span>

                  <div className="ranking-player-info">
                    <strong>{profile.name || 'Joven'}</strong>

                    <small>
                      @{profile.nick || 'sin-apodo'}
                    </small>
                  </div>

                  <div className="ranking-player-points">
                    <Star size={17} />

                    <strong>{profile.points ?? 0}</strong>

                    <span>puntos</span>
                  </div>
                </article>
              ))}
            </div>
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
              playerName={selectedProfile?.name}
              onExit={() => setActiveGame(null)}
            />
          ) : activeGame === 'verse' ? (
            <VerseGame
              playerName={selectedProfile?.name}
              onExit={() => setActiveGame(null)}
            />
          ) : !selectedProfile ? (
            <div className="ranking-state profile-required" role="status">
              <UserRound size={32} />
              <strong>Primero selecciona tu perfil</strong>
              <span>
                Elige tu nombre en Perfiles para identificar la sesión de práctica.
                Esta selección no verifica tu identidad ni permite modificar puntos.
              </span>
              <button type="button" onClick={() => changeTab('profiles')}>
                <UserRound size={16} />
                Elegir perfil
              </button>
            </div>
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

                  <div className="selected-profile-actions">
                    <button type="button" onClick={() => changeTab('games')}>
                      <Gamepad2 size={15} />
                      Ir a los juegos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <footer className="ranking-footer-note">
        <LockKeyhole size={15} />

        Entorno de pruebas · Perfiles públicos de Staging.
      </footer>
    </section>
  );
}

function CheckGameIcon() {
  return <CheckCircle2 size={12} />;
}
