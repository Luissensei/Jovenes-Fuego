
import { useMemo, useState } from 'react';
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
} from 'lucide-react';

type FollowupStatus = 'Pendiente' | 'En proceso' | 'Completado';

type Followup = {
  id: number;
  name: string;
  date: string;
  reason: string;
  notes: string;
  status: FollowupStatus;
};

const initialFollowups: Followup[] = [
  {
    id: 1,
    name: 'Joven de prueba 1',
    date: '2026-11-01',
    reason: 'Acompañamiento espiritual',
    notes: 'Conversar sobre su participación en las reuniones.',
    status: 'Pendiente',
  },
  {
    id: 2,
    name: 'Joven de prueba 2',
    date: '2026-11-01',
    reason: 'Inasistencia',
    notes: 'Contactar para conocer cómo se encuentra.',
    status: 'En proceso',
  },
];

export default function FollowupPage() {
  const [followups, setFollowups] = useState<Followup[]>(initialFollowups);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Acompañamiento espiritual');
  const [notes, setNotes] = useState('');

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

  function addFollowup() {
    if (!name.trim() || !date || !notes.trim()) {
      alert('Completa el nombre, la fecha y las observaciones.');
      return;
    }

    const newFollowup: Followup = {
      id: Date.now(),
      name: name.trim(),
      date,
      reason,
      notes: notes.trim(),
      status: 'Pendiente',
    };

    setFollowups((current) => [newFollowup, ...current]);
    setName('');
    setNotes('');
    setShowForm(false);
  }

  function changeStatus(id: number, status: FollowupStatus) {
    setFollowups((current) =>
      current.map((item) => item.id === id ? { ...item, status } : item)
    );
  }

  function deleteFollowup(id: number) {
    if (!window.confirm('¿Deseas eliminar este seguimiento?')) return;
    setFollowups((current) => current.filter((item) => item.id !== id));
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

        <button className="followup-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Nuevo seguimiento
        </button>
      </header>

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
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o motivo..."
            />
          </div>

          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option>Todos</option>
            <option>Pendiente</option>
            <option>En proceso</option>
            <option>Completado</option>
          </select>
        </div>

        <div className="followup-list">
          {filteredFollowups.map((item) => (
            <article className="followup-card" key={item.id}>
              <div className="followup-card-top">
                <div className="followup-person">
                  <div className="followup-avatar"><UserRound /></div>
                  <div>
                    <h3>{item.name}</h3>
                    <span>{item.reason}</span>
                  </div>
                </div>

                <span className={`followup-status ${item.status.toLowerCase().replace(' ', '-')}`}>
                  {statusIcon(item.status)}
                  {item.status}
                </span>
              </div>

              <div className="followup-notes">
                <MessageSquare size={16} />
                <p>{item.notes}</p>
              </div>

              <div className="followup-card-bottom">
                <span><CalendarDays size={15} /> {item.date}</span>

                <div className="followup-actions">
                  <select
                    aria-label={`Estado de ${item.name}`}
                    value={item.status}
                    onChange={(event) => changeStatus(item.id, event.target.value as FollowupStatus)}
                  >
                    <option>Pendiente</option>
                    <option>En proceso</option>
                    <option>Completado</option>
                  </select>

                  <button
                    className="followup-delete"
                    onClick={() => deleteFollowup(item.id)}
                    title="Eliminar seguimiento"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredFollowups.length === 0 && (
            <div className="followup-empty">
              <ClipboardList size={35} />
              <h3>No hay seguimientos</h3>
              <p>No encontramos registros con esos criterios.</p>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div className="followup-modal-backdrop">
          <section className="followup-modal">
            <div className="followup-modal-header">
              <div>
                <h2>Nuevo seguimiento</h2>
                <p>Registra el acompañamiento del joven.</p>
              </div>
              <button onClick={() => setShowForm(false)}><X /></button>
            </div>

            <label>Nombre del joven</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" />

            <label>Fecha</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />

            <label>Motivo del seguimiento</label>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>Acompañamiento espiritual</option>
              <option>Inasistencia</option>
              <option>Situación personal</option>
              <option>Integración a la iglesia</option>
              <option>Participación en actividades</option>
              <option>Otro</option>
            </select>

            <label>Observaciones</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Describe el motivo y las acciones de acompañamiento..."
              rows={4}
            />

            <div className="followup-modal-actions">
              <button className="followup-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button className="followup-primary" onClick={addFollowup}>
                Guardar registro
              </button>
            </div>
          </section>
        </div>
      )}

      <p className="followup-notice">
        Los registros actuales son temporales y no se guardan en Firebase.
      </p>
    </main>
  );
}
