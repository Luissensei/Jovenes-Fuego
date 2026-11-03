import { useEffect, useMemo, useState } from 'react';

import {
  Search,
  Users,
  AlertCircle,
  ArrowLeft,
  Flame,
  Trophy,
  BookOpen,
  Gamepad2,
  Activity,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  getPublicProfiles,
  type PublicProfile,
} from '../services/publicProfiles';

import './YouthPortalPage.css';

function getInitials(name: string): string {
  const cleanName = name.trim();

  if (!cleanName || cleanName === 'Perfil sin nombre') {
    return 'JF';
  }

  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

function YouthAvatar({
  profile,
  large = false,
}: {
  profile: PublicProfile;
  large?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`youth-avatar ${large ? 'large' : ''}`}>
      {profile.pic && !imageFailed ? (
        <img
          src={profile.pic}
          alt={`Fotografía de ${profile.name}`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getInitials(profile.name)}</span>
      )}
    </div>
  );
}

export default function YouthPortalPage() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedProfile, setSelectedProfile] =
    useState<PublicProfile | null>(null);

  async function loadProfiles() {
    setLoading(true);
    setError('');

    try {
      const result = await getPublicProfiles();
      setProfiles(result);
    } catch (cause) {
      console.error('Error cargando perfiles públicos:', cause);

      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron cargar los perfiles.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');

    if (!query) return profiles;

    return profiles.filter((profile) =>
      `${profile.name} ${profile.nick}`
        .toLocaleLowerCase('es')
        .includes(query),
    );
  }, [profiles, search]);

  if (selectedProfile) {
    return (
      <main className="youth-portal">
        <div className="youth-container">
          <button
            type="button"
            className="youth-back"
            onClick={() => setSelectedProfile(null)}
          >
            <ArrowLeft size={18} />
            Volver a los perfiles
          </button>

          <section className="youth-welcome">
            <div className="youth-welcome-decoration">
              <Sparkles size={23} />
            </div>

            <YouthAvatar profile={selectedProfile} large />

            <span className="youth-brand-label">
              COMUNIDAD JÓVENES DE FUEGO
            </span>

            <h1>
              ¡Hola, {selectedProfile.name}!
            </h1>

            <p>Bienvenido a Jóvenes de Fuego.</p>

            {selectedProfile.nick && (
              <span className="youth-profile-nick">
                @{selectedProfile.nick}
              </span>
            )}
          </section>

          <section className="youth-options">
            <article>
              <Trophy size={25} />
              <h2>Mi ranking</h2>
              <p>Consulta tu clasificación pública.</p>
            </article>

            <article>
              <BookOpen size={25} />
              <h2>Devocionales</h2>
              <p>Próximamente podrás consultar tus devocionales.</p>
            </article>

            <article>
              <Gamepad2 size={25} />
              <h2>Juegos bíblicos</h2>
              <p>Próximamente podrás participar en retos.</p>
            </article>

            <article>
              <Activity size={25} />
              <h2>Mi actividad</h2>
              <p>Próximamente podrás consultar tus actividades.</p>
            </article>
          </section>

          <div className="youth-security-note">
            <ShieldCheck size={17} />
            Esta selección es una vista pública del perfil, no una
            verificación de identidad. No permite consultar datos privados.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="youth-portal">
      <div className="youth-container">

        <header className="youth-header">
          <div className="youth-brand-icon">
            <Flame size={34} />
          </div>

          <span className="youth-brand-label">
            COMUNIDAD CRISTIANA
          </span>

          <h1>JÓVENES DE FUEGO</h1>

          <div className="youth-title-divider" />

          <h2>¿Quién eres?</h2>

          <p>Selecciona tu perfil para continuar.</p>
        </header>

        <section className="youth-selector">

          <div className="youth-selector-heading">
            <div>
              <span>ACCESO JUVENIL</span>
              <h3>Nuestra comunidad</h3>
            </div>

            <div className="youth-total">
              <Users size={17} />
              {profiles.length} perfiles
            </div>
          </div>

          <label className="youth-search">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o apodo..."
              aria-label="Buscar perfil"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </label>

          {error && (
            <div className="youth-error">
              <AlertCircle size={19} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => void loadProfiles()}
              >
                Reintentar
              </button>
            </div>
          )}

          {loading && (
            <div className="youth-loading">
              <RefreshCw size={27} />
              <strong>Cargando perfiles...</strong>
              <span>Estamos preparando la comunidad.</span>
            </div>
          )}

          {!loading && !error && filteredProfiles.length === 0 && (
            <div className="youth-empty">
              <Users size={38} />

              <h3>
                {profiles.length === 0
                  ? 'Todavía no hay perfiles públicos'
                  : 'No encontramos ese perfil'}
              </h3>

              <p>
                {profiles.length === 0
                  ? 'Los perfiles deben publicarse desde el panel administrativo.'
                  : 'Prueba con otro nombre o apodo.'}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  void loadProfiles();
                }}
              >
                <RefreshCw size={16} />
                Actualizar perfiles
              </button>
            </div>
          )}

          {!loading && !error && filteredProfiles.length > 0 && (
            <>
              <div className="youth-profiles">
                {filteredProfiles.map((profile) => (
                  <button
                    type="button"
                    className="youth-profile-card"
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <span className="youth-card-decoration">
                      <Flame size={15} />
                    </span>

                    <YouthAvatar profile={profile} />

                    <strong>{profile.name}</strong>

                    {profile.nick ? (
                      <span className="youth-card-nick">
                        @{profile.nick}
                      </span>
                    ) : (
                      <span className="youth-card-nick">
                        Miembro de la comunidad
                      </span>
                    )}

                    <span className="youth-card-action">
                      Seleccionar perfil
                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="youth-results-count">
                Mostrando {filteredProfiles.length} de {profiles.length} perfiles
              </div>
            </>
          )}
        </section>

        <footer className="youth-security-note">
          <ShieldCheck size={17} />
          Seleccionar un perfil no verifica la identidad de la persona.
          No introduzcas información privada en este acceso.
        </footer>
      </div>
    </main>
  );
}
