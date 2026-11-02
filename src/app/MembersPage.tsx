import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Search,
  Users,
  RefreshCw,
  CalendarDays,
  Phone,
  UserRound,
  Flame,
} from 'lucide-react';
import { subscribeMembers, type MemberRecord } from '../services/repositories/members';
import { firebaseConfigured } from '../services/firebase/client';

export function MembersPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsubscribe = subscribeMembers(
      (items) => {
        setMembers(items);
        setLoading(false);
        setError('');
      },
      (cause) => {
        setLoading(false);
        setError(cause.message || 'No se pudieron cargar los jóvenes.');
      },
    );

    return () => unsubscribe?.();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');

    if (!query) return members;

    return members.filter((member) =>
      `${member.name ?? ''} ${member.nick ?? ''} ${member.phone ?? ''}`
        .toLocaleLowerCase('es')
        .includes(query),
    );
  }, [members, search]);

  const getInitials = (name?: string) => {
    return String(name ?? '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toLocaleUpperCase('es') || '?';
  };

  return (
    <section className="members-page">
      <header className="members-hero">
        <div className="members-hero-copy">
          <span className="members-kicker">
            <Flame size={15} /> NUESTRA COMUNIDAD
          </span>
          <h1>Jóvenes</h1>
          <p>
            Conoce y consulta los perfiles de los jóvenes que forman parte
            de nuestra comunidad.
          </p>
        </div>

        <div className="members-total-card">
          <span className="members-total-icon"><Users size={23} /></span>
          <div>
            <strong>{firebaseConfigured ? members.length : '—'}</strong>
            <span>Jóvenes registrados</span>
          </div>
        </div>
      </header>

      {!firebaseConfigured && (
        <div className="members-notice">
          <AlertCircle size={20} />
          <div>
            <strong>Firebase Staging no está conectado</strong>
            <p>
              Estás viendo la vista previa. No se muestran datos inventados
              ni se realizan cambios.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="members-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={() => window.location.reload()} aria-label="Reintentar">
            <RefreshCw size={17} />
          </button>
        </div>
      )}

      {firebaseConfigured && (
        <div className="members-controls">
          <label className="members-search">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, apodo o teléfono..."
              aria-label="Buscar jóvenes"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                ×
              </button>
            )}
          </label>

          <span className="members-results">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      )}

      {loading && (
        <div className="members-state">
          <div className="spinner" />
          <strong>Cargando comunidad</strong>
          <span>Consultando los perfiles de Firebase Staging...</span>
        </div>
      )}

      {!loading && firebaseConfigured && !error && filtered.length === 0 && (
        <div className="members-state">
          <span className="members-state-icon"><Users size={30} /></span>
          <strong>
            {members.length ? 'No encontramos coincidencias' : 'Aún no hay jóvenes registrados'}
          </strong>
          <span>
            {members.length
              ? 'Intenta buscar con otro nombre, apodo o teléfono.'
              : 'Cuando existan registros en Staging aparecerán aquí.'}
          </span>
        </div>
      )}

      {!loading && firebaseConfigured && !error && filtered.length > 0 && (
        <div className="members-grid">
          {filtered.map((member) => (
            <article className="member-card" key={member.id}>
              <div className="member-card-top">
                <div className="member-avatar">
                  {getInitials(member.name)}
                </div>
                <span className="member-status">
                  <span />
                  Registrado
                </span>
              </div>

              <div className="member-card-info">
                <h2>{member.name || 'Nombre sin registrar'}</h2>
                <p className="member-nick">
                  {member.nick ? `@${member.nick}` : 'Sin apodo registrado'}
                </p>
              </div>

              <div className="member-card-details">
                <div>
                  <Phone size={16} />
                  <span>{member.phone || 'Sin teléfono registrado'}</span>
                </div>
                <div>
                  {member.bd ? <CalendarDays size={16} /> : <UserRound size={16} />}
                  <span>{member.bd ? `Nacimiento: ${member.bd}` : 'Perfil de joven'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="members-footer">
        <span />
        Información en tiempo real · Modo de solo lectura
      </footer>
    </section>
  );
}
