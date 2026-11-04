import styles from './styles/VisitorsPage.module.css';

import { useMemo, useState } from 'react';
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
} from 'lucide-react';

type VisitorStatus = 'Nuevo' | 'Contactado' | 'Integrado';

type Visitor = {
  id: number;
  name: string;
  phone: string;
  email: string;
  date: string;
  source: string;
  notes: string;
  status: VisitorStatus;
};

const initialVisitors: Visitor[] = [
  {
    id: 1,
    name: 'Visitante de prueba 1',
    phone: '3000000001',
    email: 'visitante1@ejemplo.com',
    date: '2026-11-01',
    source: 'Invitación de un amigo',
    notes: 'Asistió por primera vez a la reunión juvenil.',
    status: 'Nuevo',
  },
  {
    id: 2,
    name: 'Visitante de prueba 2',
    phone: '3000000002',
    email: 'visitante2@ejemplo.com',
    date: '2026-11-01',
    source: 'Redes sociales',
    notes: 'Mostrarle las actividades de los jóvenes.',
    status: 'Contactado',
  },
];

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState('Invitación de un amigo');
  const [notes, setNotes] = useState('');

  const filteredVisitors = useMemo(() => {
    return visitors.filter((visitor) => {
      const matchesSearch =
        visitor.name.toLowerCase().includes(search.toLowerCase()) ||
        visitor.phone.includes(search) ||
        visitor.email.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === 'Todos' || visitor.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [visitors, search, filter]);

  const newCount = visitors.filter((v) => v.status === 'Nuevo').length;
  const contactedCount = visitors.filter((v) => v.status === 'Contactado').length;
  const integratedCount = visitors.filter((v) => v.status === 'Integrado').length;

  function addVisitor() {
    if (!name.trim() || !phone.trim() || !date) {
      alert('Completa el nombre, teléfono y fecha del visitante.');
      return;
    }

    const visitor: Visitor = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      date,
      source,
      notes: notes.trim(),
      status: 'Nuevo',
    };

    setVisitors((current) => [visitor, ...current]);

    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  }

  function changeStatus(id: number, status: VisitorStatus) {
    setVisitors((current) =>
      current.map((visitor) =>
        visitor.id === id ? { ...visitor, status } : visitor
      )
    );
  }

  function deleteVisitor(id: number) {
    if (!window.confirm('¿Deseas eliminar este visitante?')) return;

    setVisitors((current) =>
      current.filter((visitor) => visitor.id !== id)
    );
  }

  function statusIcon(status: VisitorStatus) {
    if (status === 'Integrado') return <CheckCircle2 size={15} />;
    if (status === 'Contactado') return <MessageCircle size={15} />;
    return <Clock size={15} />;
  }

  return (
    <main className={`${styles.scope} visitors-page`}>
      <header className="visitors-header">
        <div>
          <span className="visitors-eyebrow">BIENVENIDA E INTEGRACIÓN</span>
          <h1>Visitantes</h1>
          <p>Registra, conoce y acompaña a quienes nos visitan.</p>
        </div>

        <button
          className="visitors-primary"
          onClick={() => setShowForm(true)}
        >
          <UserPlus size={18} />
          Registrar visitante
        </button>
      </header>

      <section className="visitors-stats">
        <article className="visitors-stat">
          <div><Users /></div>
          <span>Total de visitantes</span>
          <strong>{visitors.length}</strong>
        </article>

        <article className="visitors-stat">
          <div><Clock /></div>
          <span>Nuevos</span>
          <strong>{newCount}</strong>
        </article>

        <article className="visitors-stat">
          <div><MessageCircle /></div>
          <span>Contactados</span>
          <strong>{contactedCount}</strong>
        </article>

        <article className="visitors-stat">
          <div><CheckCircle2 /></div>
          <span>Integrados</span>
          <strong>{integratedCount}</strong>
        </article>
      </section>

      <section className="visitors-content">
        <div className="visitors-toolbar">
          <div className="visitors-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
            />
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>Todos</option>
            <option>Nuevo</option>
            <option>Contactado</option>
            <option>Integrado</option>
          </select>
        </div>

        <div className="visitors-list">
          {filteredVisitors.map((visitor) => (
            <article className="visitor-card" key={visitor.id}>
              <div className="visitor-card-header">
                <div className="visitor-person">
                  <div className="visitor-avatar">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3>{visitor.name}</h3>
                    <span>{visitor.source}</span>
                  </div>
                </div>

                <span className={`visitor-status ${visitor.status.toLowerCase()}`}>
                  {statusIcon(visitor.status)}
                  {visitor.status}
                </span>
              </div>

              <div className="visitor-details">
                <span><Phone size={15} /> {visitor.phone}</span>

                {visitor.email && (
                  <span><Mail size={15} /> {visitor.email}</span>
                )}

                <span><CalendarDays size={15} /> {visitor.date}</span>
              </div>

              {visitor.notes && (
                <p className="visitor-notes">{visitor.notes}</p>
              )}

              <div className="visitor-card-footer">
                <div className="visitor-status-control">
                  <label>Estado:</label>
                  <select
                    value={visitor.status}
                    onChange={(event) =>
                      changeStatus(visitor.id, event.target.value as VisitorStatus)
                    }
                  >
                    <option>Nuevo</option>
                    <option>Contactado</option>
                    <option>Integrado</option>
                  </select>
                </div>

                <button
                  className="visitor-delete"
                  onClick={() => deleteVisitor(visitor.id)}
                  title="Eliminar visitante"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}

          {filteredVisitors.length === 0 && (
            <div className="visitors-empty">
              <Users size={36} />
              <h3>No hay visitantes registrados</h3>
              <p>Registra un visitante o modifica tu búsqueda.</p>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div className="visitors-overlay">
          <section className="visitors-modal">
            <div className="visitors-modal-header">
              <div>
                <h2>Registrar visitante</h2>
                <p>Ingresa los datos de la persona.</p>
              </div>
              <button onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>

            <label>Nombre completo *</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del visitante"
            />

            <label>Teléfono *</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Número de contacto"
            />

            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
            />

            <label>Fecha de visita *</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />

            <label>¿Cómo nos conoció?</label>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option>Invitación de un amigo</option>
              <option>Redes sociales</option>
              <option>Invitación de un líder</option>
              <option>Actividad de la iglesia</option>
              <option>Otro</option>
            </select>

            <label>Observaciones</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Información adicional..."
            />

            <div className="visitors-modal-actions">
              <button
                className="visitors-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>

              <button className="visitors-primary" onClick={addVisitor}>
                <UserPlus size={17} />
                Guardar visitante
              </button>
            </div>
          </section>
        </div>
      )}

      <p className="visitors-notice">
        Los registros son temporales. Todavía no se guardan en Firebase.
      </p>
    </main>
  );
}
