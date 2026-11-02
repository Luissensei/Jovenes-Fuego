
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  AlertCircle,
  ArrowLeft,
  UserRound,
  Flame,
  Trophy,
  BookOpen,
  Gamepad2,
  Activity,
  RefreshCw,
} from 'lucide-react';

import {
  getPublicProfiles,
  type PublicProfile,
} from '../services/publicProfiles';

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
        <button
          type="button"
          className="youth-back"
          onClick={() => setSelectedProfile(null)}
        >
          <ArrowLeft size={18} />
          Volver a los perfiles
        </button>

        <section className="youth-welcome">
          <div className="youth-avatar large">
            {selectedProfile.pic ? (
              <img
                src={selectedProfile.pic}
                alt={selectedProfile.name}
              />
            ) : (
              String(selectedProfile.name || '?')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0] || '')
                .join('')
                .toUpperCase()
            )}
          </div>

          <h1>¡Hola, {selectedProfile.name || 'joven'}!</h1>
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
            <p>Consulta tu clasificación.</p>
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

        <p className="youth-security-note">
          Esta selección es una vista de perfil, no una verificación
          de identidad. No permite modificar puntos ni consultar
          información privada.
        </p>
      </main>
    );
  }

  return (
    <main className="youth-portal">
      <header className="youth-header">
        <div className="youth-brand-icon">
          <Flame size={30} />
        </div>

        <p className="eyebrow">JÓVENES DE FUEGO</p>
        <h1>¿Quién eres?</h1>
        <p>Selecciona tu perfil para continuar.</p>
      </header>

      {error && (
        <div className="notice">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <label className="member-search youth-search">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar mi nombre..."
          aria-label="Buscar perfil"
        />
      </label>

      {loading && (
        <div className="members-empty">
          <RefreshCw size={24} />
          <strong>Cargando perfiles...</strong>
        </div>
      )}

      {!loading && error && (
        <div className="members-empty">
          <AlertCircle size={26} />
          <strong>No pudimos conectar con los perfiles.</strong>
          <button type="button" onClick={() => void loadProfiles()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      {!loading && !error && filteredProfiles.length === 0 && (
        <div className="members-empty">
          <Users size={26} />
          <strong>
            {profiles.length === 0
              ? 'Todavía no hay perfiles disponibles'
              : 'No encontramos ese nombre'}
          </strong>
          <span>Intenta con otra búsqueda.</span>
          <button type="button" onClick={() => void loadProfiles()}>
            Actualizar perfiles
          </button>
        </div>
      )}

      {!loading && !error && filteredProfiles.length > 0 && (
        <section className="youth-profiles">
          {filteredProfiles.map((profile) => {
            const initials = String(profile.name || '?')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0] || '')
              .join('')
              .toUpperCase();

            return (
              <button
                type="button"
                className="youth-profile-card"
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="youth-avatar">
                  {profile.pic ? (
                    <img src={profile.pic} alt={profile.name} />
                  ) : (
                    initials || <UserRound />
                  )}
                </div>

                <strong>{profile.name || 'Joven'}</strong>

                {profile.nick && (
                  <span>@{profile.nick}</span>
                )}
              </button>
            );
          })}
        </section>
      )}

      <p className="youth-security-note">
        Seleccionar un perfil no verifica la identidad de la persona.
        No introduzcas información privada en este acceso.
      </p>
    </main>
  );
}
