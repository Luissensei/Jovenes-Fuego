import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import {
  getPublicProfiles,
  type PublicProfile,
} from '../services/publicProfiles';

type Tab = 'ranking' | 'games' | 'profiles';

const games = [
  {
    id: 'trivia',
    title: 'Trivia bíblica',
    description: 'Demuestra cuánto sabes de la Biblia.',
    detail: 'Preguntas sobre personajes, historias y enseñanzas.',
    icon: BookOpen,
    color: 'orange',
  },
  {
    id: 'verse',
    title: 'Completa el versículo',
    description: 'Recuerda y completa las Escrituras.',
    detail: 'Pon a prueba tu memoria bíblica.',
    icon: Star,
    color: 'purple',
  },
  {
    id: 'memory',
    title: 'Memoria bíblica',
    description: 'Encuentra las parejas correctas.',
    detail: 'Relaciona personajes, libros y acontecimientos.',
    icon: Brain,
    color: 'blue',
  },
  {
    id: 'challenge',
    title: 'Reto de 60 segundos',
    description: 'Responde antes de que termine el tiempo.',
    detail: 'Responde rápido y consigue puntos.',
    icon: Timer,
    color: 'green',
  },
  {
    id: 'survival',
    title: 'Supervivencia',
    description: '¿Cuántas preguntas puedes superar?',
    detail: 'Avanza de nivel sin perder tus oportunidades.',
    icon: Flame,
    color: 'red',
  },
  {
    id: 'duel',
    title: 'Duelo 1 contra 1',
    description: 'Compite con otro joven.',
    detail: 'Demuestra tus conocimientos frente a otro participante.',
    icon: Swords,
    color: 'purple',
  },
  {
    id: 'order',
    title: 'Ordena el versículo',
    description: 'Organiza las palabras correctamente.',
    detail: 'Reconstruye versículos palabra por palabra.',
    icon: Puzzle,
    color: 'blue',
  },
];

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ranking');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);

  async function loadProfiles() {
    setLoadingProfiles(true);
    setProfilesError('');

    try {
      const result = await getPublicProfiles();
      setProfiles(result);
    } catch (error) {
      console.error('Error al cargar perfiles públicos:', error);
      setProfilesError(
        'No pudimos cargar los perfiles. Verifica que los emuladores estén activos e inténtalo nuevamente.',
      );
    } finally {
      setLoadingProfiles(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'profiles' && profiles.length === 0 && !profilesError) {
      void loadProfiles();
    }
  }, [activeTab]);

  return (
    <section className="ranking-hub">
      <header className="ranking-hero">
        <div className="ranking-hero-copy">
          <span className="ranking-eyebrow">
            <Flame size={15} /> COMUNIDAD JÓVENES DE FUEGO
          </span>
          <h1>¡Que comience el desafío!</h1>
          <p>
            Aprende, juega, crece y demuestra lo que sabes de la Palabra de Dios.
          </p>
          <button className="ranking-hero-button" onClick={() => setActiveTab('games')}>
            Explorar desafíos <ChevronRight size={17} />
          </button>
        </div>
        <div className="ranking-hero-art">
          <Trophy size={62} />
          <Sparkles className="ranking-sparkle" size={23} />
        </div>
      </header>

      <nav className="ranking-tabs">
        <button
          className={activeTab === 'ranking' ? 'active' : ''}
          onClick={() => setActiveTab('ranking')}
        >
          <Trophy size={17} /> Clasificación
        </button>
        <button
          className={activeTab === 'games' ? 'active' : ''}
          onClick={() => setActiveTab('games')}
        >
          <Gamepad2 size={17} /> Juegos
        </button>
        <button
          className={activeTab === 'profiles' ? 'active' : ''}
          onClick={() => setActiveTab('profiles')}
        >
          <UserRound size={17} /> Perfiles
        </button>
      </nav>

      {activeTab === 'ranking' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">TABLA DE POSICIONES</span>
              <h2>Los mejores participantes</h2>
              <p>La clasificación se construirá con los puntos obtenidos en los juegos.</p>
            </div>
            <span className="ranking-heading-icon"><Trophy size={25} /></span>
          </div>

          <div className="ranking-empty">
            <div className="ranking-podium">
              <span><Medal size={28} /></span>
              <span><Crown size={36} /></span>
              <span><Medal size={28} /></span>
            </div>
            <h3>¡Tu historia comienza aquí!</h3>
            <p>
              Todavía no hay puntuaciones registradas. Participa en los desafíos
              y trabaja para conseguir un lugar en el podio.
            </p>
            <button onClick={() => setActiveTab('games')}>
              Ir a los juegos <ChevronRight size={17} />
            </button>
          </div>

          <div className="ranking-info-grid">
            <article>
              <Flame size={23} />
              <strong>Iniciando</strong>
              <span>Tu camino comienza aquí</span>
            </article>
            <article>
              <Star size={23} />
              <strong>0 puntos</strong>
              <span>Puntuación inicial</span>
            </article>
            <article>
              <Trophy size={23} />
              <strong>Sin posiciones</strong>
              <span>Esperando participantes</span>
            </article>
          </div>
        </div>
      )}

      {activeTab === 'games' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">ZONA DE DESAFÍOS</span>
              <h2>Juegos bíblicos</h2>
              <p>Prepárate para aprender y poner a prueba tus conocimientos.</p>
            </div>
            <span className="ranking-heading-icon"><Gamepad2 size={27} /></span>
          </div>

          <div className="games-grid">
            {games.map((game) => {
              const Icon = game.icon;

              return (
                <article className={`game-card ${game.color}`} key={game.id}>
                  <div className="game-card-top">
                    <span className="game-icon"><Icon size={25} /></span>
                    <span className="game-status">
                      <LockKeyhole size={12} /> En preparación
                    </span>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <small className="game-detail">{game.detail}</small>
                  <div className="game-card-footer">
                    <span>Próximamente</span>
                    <LockKeyhole size={15} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">IDENTIDAD JUVENIL</span>
              <h2>Selecciona tu perfil</h2>
              <p>Encuentra tu perfil dentro de la comunidad.</p>
            </div>
            <span className="ranking-heading-icon"><UserRound size={27} /></span>
          </div>

          <div className="profile-notice">
            <ShieldCheck size={20} />
            <span>
              Aquí solo se muestran datos públicos. La selección de perfil no
              inicia sesión ni permite consultar información privada.
            </span>
          </div>

          {loadingProfiles && (
            <div className="ranking-state">
              <div className="spinner" />
              <strong>Cargando perfiles...</strong>
              <span>Consultando los perfiles públicos de Staging.</span>
            </div>
          )}

          {!loadingProfiles && profilesError && (
            <div className="ranking-state">
              <AlertCircleIcon />
              <strong>No se pudieron cargar los perfiles</strong>
              <span>{profilesError}</span>
              <button onClick={() => void loadProfiles()}>
                <RefreshCw size={16} /> Intentar nuevamente
              </button>
            </div>
          )}

          {!loadingProfiles && !profilesError && profiles.length === 0 && (
            <div className="ranking-state">
              <UserRound size={32} />
              <strong>No hay perfiles disponibles</strong>
              <span>Cuando existan perfiles públicos, aparecerán en esta sección.</span>
              <button onClick={() => void loadProfiles()}>
                <RefreshCw size={16} /> Actualizar perfiles
              </button>
            </div>
          )}

          {!loadingProfiles && !profilesError && profiles.length > 0 && (
            <>
              <div className="profiles-summary">
                <strong>{profiles.length}</strong>
                <span>perfiles disponibles</span>
              </div>

              <div className="profiles-grid">
                {profiles.map((profile) => (
                  <button
                    className={`profile-card ${
                      selectedProfile?.id === profile.id ? 'selected' : ''
                    }`}
                    key={profile.id}
                    onClick={() =>
                      setSelectedProfile(
                        selectedProfile?.id === profile.id ? null : profile,
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
                    <small>@{profile.nick || 'sin-apodo'}</small>
                    <span className="profile-select">
                      {selectedProfile?.id === profile.id ? 'Seleccionado' : 'Seleccionar'}
                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))}
              </div>

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
                    <span className="ranking-kicker">PERFIL SELECCIONADO</span>
                    <h3>{selectedProfile.name}</h3>
                    <p>@{selectedProfile.nick}</p>
                    <small>El acceso personal estará disponible cuando se implemente la autenticación segura.</small>
                  </div>
                  <button onClick={() => setSelectedProfile(null)}>Cerrar</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <footer className="ranking-footer-note">
        <LockKeyhole size={15} />
        Entorno de pruebas · Los perfiles muestran únicamente información pública.
      </footer>
    </section>
  );
}

function AlertCircleIcon() {
  return <LockKeyhole size={30} />;
}
