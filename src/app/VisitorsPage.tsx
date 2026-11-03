import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CalendarDays,
  Phone,
  Mail,
  MessageCircle,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  createVisitor,
  deleteVisitor,
  getVisitors,
  updateVisitorStatus,
  type VisitorRecord,
  type VisitorStatus,
} from '../services/youthManagement';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(localDate);
  const [source, setSource] = useState('Invitación de un amigo');
  const [notes, setNotes] = useState('');

  async function loadVisitors() {
    setLoading(true);
    setError('');
    try {
      setVisitors(await getVisitors());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los visitantes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVisitors();
  }, []);

  const filteredVisitors = useMemo(() => {
    return visitors.filter((visitor) => {
      const matchesSearch =
        visitor.name.toLowerCase().includes(search.toLowerCase()) ||
        visitor.phone.includes(search) ||
        visitor.email.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'Todos' || visitor.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [visitors, search, filter]);

  const newCount = visitors.filter((visitor) => visitor.status === 'Nuevo').length;
  const contactedCount = visitors.filter((visitor) => visitor.status === 'Contactado').length;
  const integratedCount = visitors.filter((visitor) => visitor.status === 'Integrado').length;

  async function addVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createVisitor({name, phone, email, date, source, notes});
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setDate(localDate());
      setShowForm(false);
      await loadVisitors();
      setMessage('Visitante registrado correctamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el visitante.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: VisitorStatus) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateVisitorStatus(id, status);
      setVisitors((current) => current.map((visitor) => visitor.id === id ? {...visitor, status} : visitor));
      setMessage('Estado del visitante actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el visitante.');
    } finally {
      setSaving(false);
    }
  }

  async function removeVisitor(visitor: VisitorRecord) {
    if (!window.confirm(`¿Deseas eliminar el registro de ${visitor.name}?`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteVisitor(visitor.id);
      setVisitors((current) => current.filter((item) => item.id !== visitor.id));
      setMessage('Registro de visitante eliminado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el visitante.');
    } finally {
      setSaving(false);
    }
  }

  function statusIcon(status: VisitorStatus) {
    if (status === 'Integrado') return <CheckCircle2 size={15} />;
    if (status === 'Contactado') return <MessageCircle size={15} />;
    return <Clock size={15} />;
  }

  return (
    <main className="visitors-page">
      <header className="visitors-header">
        <div>
          <span className="visitors-eyebrow">BIENVENIDA E INTEGRACIÓN</span>
          <h1>Visitantes</h1>
          <p>Registra, conoce y acompaña a quienes nos visitan.</p>
        </div>
        <div className="visitors-header-actions">
          <button type="button" className="visitors-secondary" onClick={() => void loadVisitors()} disabled={loading || saving}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button type="button" className="visitors-primary" onClick={() => setShowForm(true)}>
            <UserPlus size={18} /> Registrar visitante
          </button>
        </div>
      </header>

      {error && <div className="attendance-error" role="alert">{error}</div>}
      {message && <div className="attendance-success" role="status">{message}</div>}

      <section className="visitors-stats">
        <article className="visitors-stat"><div><Users /></div><span>Total de visitantes</span><strong>{visitors.length}</strong></article>
        <article className="visitors-stat"><div><Clock /></div><span>Nuevos</span><strong>{newCount}</strong></article>
        <article className="visitors-stat"><div><MessageCircle /></div><span>Contactados</span><strong>{contactedCount}</strong></article>
        <article className="visitors-stat"><div><CheckCircle2 /></div><span>Integrados</span><strong>{integratedCount}</strong></article>
      </section>

      <section className="visitors-content">
        <div className="visitors-toolbar">
          <div className="visitors-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono o correo..." />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option>Todos</option><option>Nuevo</option><option>Contactado</option><option>Integrado</option>
          </select>
        </div>

        {loading ? <div className="visitors-empty"><RefreshCw size={25}/> Cargando visitantes...</div> : (
          <div className="visitors-list">
            {filteredVisitors.map((visitor) => (
              <article className="visitor-card" key={visitor.id}>
                <div className="visitor-card-header">
                  <div className="visitor-person">
                    <div className="visitor-avatar"><Users size={20} /></div>
                    <div><h3>{visitor.name}</h3><span>{visitor.source}</span></div>
                  </div>
                  <span className={`visitor-status ${visitor.status.toLowerCase()}`}>{statusIcon(visitor.status)} {visitor.status}</span>
                </div>
                <div className="visitor-details">
                  {visitor.phone ? <span><Phone size={15} /> {visitor.phone}</span> : <span>Contacto protegido por permisos</span>}
                  {visitor.email && <span><Mail size={15} /> {visitor.email}</span>}
                  <span><CalendarDays size={15} /> {visitor.date}</span>
                </div>
                {visitor.notes && <p className="visitor-notes">{visitor.notes}</p>}
                <div className="visitor-card-footer">
                  <div className="visitor-status-control">
                    <label>Estado:</label>
                    <select value={visitor.status} disabled={saving} onChange={(event) => void changeStatus(visitor.id, event.target.value as VisitorStatus)}>
                      <option>Nuevo</option><option>Contactado</option><option>Integrado</option>
                    </select>
                  </div>
                  <button type="button" className="visitor-delete" onClick={() => void removeVisitor(visitor)} title="Eliminar visitante" disabled={saving}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
            {filteredVisitors.length === 0 && (
              <div className="visitors-empty"><Users size={36}/><h3>No hay visitantes registrados</h3><p>Registra un visitante o modifica tu búsqueda.</p></div>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <div className="visitors-overlay">
          <form className="visitors-modal" onSubmit={(event) => void addVisitor(event)}>
            <div className="visitors-modal-header">
              <div><h2>Registrar visitante</h2><p>Ingresa los datos de la persona.</p></div>
              <button type="button" onClick={() => setShowForm(false)} disabled={saving} aria-label="Cerrar"><X /></button>
            </div>
            <label htmlFor="visitor-name">Nombre completo *</label>
            <input id="visitor-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del visitante" maxLength={120} required />
            <label htmlFor="visitor-phone">Teléfono *</label>
            <input id="visitor-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Número de contacto" maxLength={40} required />
            <label htmlFor="visitor-email">Correo electrónico</label>
            <input id="visitor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" maxLength={160} />
            <label htmlFor="visitor-date">Fecha de visita *</label>
            <input id="visitor-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <label htmlFor="visitor-source">¿Cómo nos conoció?</label>
            <select id="visitor-source" value={source} onChange={(event) => setSource(event.target.value)}>
              <option>Invitación de un amigo</option><option>Redes sociales</option><option>Invitación de un líder</option><option>Actividad de la iglesia</option><option>Otro</option>
            </select>
            <label htmlFor="visitor-notes">Observaciones</label>
            <textarea id="visitor-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={1000} placeholder="Información adicional..." />
            <div className="visitors-modal-actions">
              <button type="button" className="visitors-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="visitors-primary" disabled={saving}><UserPlus size={17}/>{saving ? 'Guardando...' : 'Guardar visitante'}</button>
            </div>
          </form>
        </div>
      )}
      <p className="visitors-notice">Los visitantes se almacenan en Firebase Staging. Los datos de contacto se muestran según los permisos de la cuenta.</p>
    </main>
  );
}
