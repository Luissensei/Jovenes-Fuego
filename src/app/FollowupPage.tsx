import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Search,
  Plus,
  ClipboardList,
  CalendarDays,
  UserRound,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  createFollowup,
  deleteFollowup,
  getFollowups,
  updateFollowupStatus,
  type FollowupRecord,
  type FollowupStatus,
} from '../services/youthManagement';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function FollowupPage() {
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [date, setDate] = useState(localDate);
  const [reason, setReason] = useState('Acompañamiento espiritual');
  const [notes, setNotes] = useState('');

  async function loadFollowups() {
    setLoading(true);
    setError('');
    try {
      setFollowups(await getFollowups());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los seguimientos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFollowups();
  }, []);

  const filteredFollowups = useMemo(() => {
    return followups.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.reason.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === 'Todos' || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [followups, search, filter]);

  const pending = followups.filter((item) => item.status === 'Pendiente').length;
  const inProgress = followups.filter((item) => item.status === 'En proceso').length;
  const completed = followups.filter((item) => item.status === 'Completado').length;

  async function addFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await createFollowup({name, date, reason, notes});
      setName('');
      setNotes('');
      setDate(localDate());
      setShowForm(false);
      await loadFollowups();
      setMessage('Seguimiento guardado correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el seguimiento.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: FollowupStatus) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateFollowupStatus(id, status);
      setFollowups((current) => current.map((item) => item.id === id ? {...item, status} : item));
      setMessage('Estado del seguimiento actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el seguimiento.');
    } finally {
      setSaving(false);
    }
  }

  async function removeFollowup(item: FollowupRecord) {
    if (!window.confirm(`¿Deseas eliminar el seguimiento de ${item.name}?`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteFollowup(item.id);
      setFollowups((current) => current.filter((row) => row.id !== item.id));
      setMessage('Seguimiento eliminado correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el seguimiento.');
    } finally {
      setSaving(false);
    }
  }

  function statusIcon(status: FollowupStatus) {
    if (status === 'Completado') return <CheckCircle2 size={16} />;
    if (status === 'En proceso') return <Clock size={16} />;
    return <AlertCircle size={16} />;
  }

  return (
    <main className="followup-page">
      <header className="followup-header">
        <div>
          <span className="followup-eyebrow">ACOMPAÑAMIENTO JUVENIL</span>
          <h1>Seguimiento de jóvenes</h1>
          <p>Registra y consulta el acompañamiento de cada joven.</p>
        </div>
        <div className="followup-header-actions">
          <button type="button" className="followup-secondary" onClick={() => void loadFollowups()} disabled={loading || saving}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button type="button" className="followup-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Nuevo seguimiento
          </button>
        </div>
      </header>

      {error && <div className="attendance-error" role="alert">{error}</div>}
      {message && <div className="attendance-success" role="status">{message}</div>}

      <section className="followup-stats">
        <article className="followup-stat">
          <div className="followup-stat-icon"><ClipboardList /></div>
          <span>Total de registros</span>
          <strong>{followups.length}</strong>
        </article>
        <article className="followup-stat">
          <div className="followup-stat-icon"><AlertCircle /></div>
          <span>Pendientes</span>
          <strong>{pending}</strong>
        </article>
        <article className="followup-stat">
          <div className="followup-stat-icon"><Clock /></div>
          <span>En proceso</span>
          <strong>{inProgress}</strong>
        </article>
        <article className="followup-stat">
          <div className="followup-stat-icon"><CheckCircle2 /></div>
          <span>Completados</span>
          <strong>{completed}</strong>
        </article>
      </section>

      <section className="followup-content">
        <div className="followup-toolbar">
          <div className="followup-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o motivo..." />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option>Todos</option>
            <option>Pendiente</option>
            <option>En proceso</option>
            <option>Completado</option>
          </select>
        </div>

        {loading ? <div className="followup-empty"><RefreshCw size={25} /> Cargando seguimientos...</div> : (
          <div className="followup-list">
            {filteredFollowups.map((item) => (
              <article className="followup-card" key={item.id}>
                <div className="followup-card-top">
                  <div className="followup-person">
                    <div className="followup-avatar"><UserRound /></div>
                    <div><h3>{item.name}</h3><span>{item.reason}</span></div>
                  </div>
                  <span className={`followup-status ${item.status.toLowerCase().replace(' ', '-')}`}>
                    {statusIcon(item.status)} {item.status}
                  </span>
                </div>
                <div className="followup-notes"><MessageSquare size={16} /><p>{item.notes}</p></div>
                <div className="followup-card-bottom">
                  <span><CalendarDays size={15} /> {item.date}</span>
                  <div className="followup-actions">
                    <select aria-label={`Estado de ${item.name}`} value={item.status} disabled={saving} onChange={(event) => void changeStatus(item.id, event.target.value as FollowupStatus)}>
                      <option>Pendiente</option><option>En proceso</option><option>Completado</option>
                    </select>
                    <button type="button" className="followup-delete" onClick={() => void removeFollowup(item)} title="Eliminar seguimiento" disabled={saving}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {filteredFollowups.length === 0 && (
              <div className="followup-empty"><ClipboardList size={35} /><h3>No hay seguimientos</h3><p>No encontramos registros con esos criterios.</p></div>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <div className="followup-modal-backdrop">
          <form className="followup-modal" onSubmit={(event) => void addFollowup(event)}>
            <div className="followup-modal-header">
              <div><h2>Nuevo seguimiento</h2><p>Registra el acompañamiento del joven.</p></div>
              <button type="button" onClick={() => setShowForm(false)} disabled={saving} aria-label="Cerrar"><X /></button>
            </div>
            <label htmlFor="followup-name">Nombre del joven</label>
            <input id="followup-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" maxLength={120} required />
            <label htmlFor="followup-date">Fecha</label>
            <input id="followup-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <label htmlFor="followup-reason">Motivo del seguimiento</label>
            <select id="followup-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>Acompañamiento espiritual</option><option>Inasistencia</option><option>Situación personal</option><option>Integración a la iglesia</option><option>Participación en actividades</option><option>Otro</option>
            </select>
            <label htmlFor="followup-notes">Observaciones</label>
            <textarea id="followup-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe el motivo y las acciones de acompañamiento..." rows={4} maxLength={2000} required />
            <div className="followup-modal-actions">
              <button type="button" className="followup-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="followup-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar registro'}</button>
            </div>
          </form>
        </div>
      )}
      <p className="followup-notice">Los seguimientos se almacenan en Firebase Staging y solo son visibles según el rol de la cuenta.</p>
    </main>
  );
}
