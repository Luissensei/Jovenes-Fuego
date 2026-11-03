import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import {CalendarDays, Plus, RefreshCw, Save, Eye, EyeOff, Pencil, X} from 'lucide-react';
import {firebaseReadOnlyMode} from '../../services/firebase/client';
import {
  getAdminWeeklyActivities,
  saveWeeklyActivity,
  type WeeklyActivity,
} from '../../services/youthPortal';

type ActivityForm = Omit<WeeklyActivity, 'id'>;

function localDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const emptyForm: ActivityForm = {
  title: '',
  description: '',
  date: localDateInput(),
  time: '',
  location: '',
  published: false,
};

export default function WeeklyActivitiesPanel() {
  const [items, setItems] = useState<WeeklyActivity[]>([]);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await getAdminWeeklyActivities());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las actividades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEditingId('');
    setForm({...emptyForm, date});
    setShowForm(true);
    setMessage('');
    setError('');
  }

  function openEdit(item: WeeklyActivity) {
    const {id, ...values} = item;
    setEditingId(id);
    setForm(values);
    setShowForm(true);
    setMessage('');
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (firebaseReadOnlyMode) {
      setError('La base original está protegida. Conecta Staging para publicar actividades sin modificar producción.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveWeeklyActivity({...form, id: editingId || undefined});
      setMessage(form.published ? 'Actividad publicada para los jóvenes.' : 'Actividad guardada como borrador.');
      setShowForm(false);
      setEditingId('');
      setForm(emptyForm);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la actividad.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="weekly-admin-panel">
      <header className="weekly-admin-heading">
        <div><span>CONTENIDO PARA EL PORTAL JUVENIL</span><h2>Actividades de la semana</h2><p>Las actividades publicadas aparecen al entrar al perfil de los jóvenes.</p></div>
        <button type="button" className="weekly-add-button" onClick={openCreate}><Plus size={17}/> Nueva actividad</button>
      </header>

      {error && <p className="weekly-admin-alert error" role="alert">{error}</p>}
      {message && <p className="weekly-admin-alert success" role="status">{message}</p>}

      {loading ? <div className="weekly-admin-loading"><RefreshCw size={21}/> Cargando agenda...</div> : items.length === 0 ? (
        <div className="weekly-admin-empty"><CalendarDays size={30}/><strong>Sin actividades todavía</strong><span>Publica reuniones, encuentros, retos y actividades para esta semana.</span><button type="button" onClick={openCreate}><Plus size={16}/> Crear primera actividad</button></div>
      ) : (
        <div className="weekly-admin-list">
          {items.map((item) => (
            <article className="weekly-admin-item" key={item.id}>
              <div className="weekly-admin-item-icon"><CalendarDays size={20}/></div>
              <div className="weekly-admin-item-copy"><span>{item.date} {item.time && `· ${item.time}`}</span><h3>{item.title}</h3><p>{item.description || 'Sin descripción'}</p><small>{item.location || 'Lugar por confirmar'}</small></div>
              <div className={`weekly-publish-status ${item.published ? 'published' : 'draft'}`}>{item.published ? <><Eye size={14}/> Publicada</> : <><EyeOff size={14}/> Borrador</>}</div>
              <button type="button" className="weekly-edit-button" onClick={() => openEdit(item)} aria-label={`Editar ${item.title}`}><Pencil size={16}/></button>
            </article>
          ))}
        </div>
      )}

      {firebaseReadOnlyMode && <p className="weekly-admin-alert" role="note">La agenda original se consulta en modo de solo lectura. La creación y publicación se habilitan al conectar Staging.</p>}

      {showForm && (
        <div className="weekly-form-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget && !saving) setShowForm(false);}}>
          <section className="weekly-form-modal" role="dialog" aria-modal="true" aria-labelledby="weekly-form-title">
            <header><div><span>AGENDA JUVENIL</span><h3 id="weekly-form-title">{editingId ? 'Editar actividad' : 'Nueva actividad'}</h3></div><button type="button" onClick={() => setShowForm(false)} disabled={saving} aria-label="Cerrar"><X size={19}/></button></header>
            <form onSubmit={(event) => void submit(event)}>
              <label>Nombre de la actividad<input value={form.title} onChange={(event) => setForm({...form,title:event.target.value})} required minLength={3} maxLength={120} placeholder="Ej. Noche de jóvenes"/></label>
              <label>Descripción<textarea value={form.description} onChange={(event) => setForm({...form,description:event.target.value})} rows={3} maxLength={1200} placeholder="Explica qué haremos en esta actividad..."/></label>
              <div className="weekly-form-row">
                <label>Fecha<input type="date" value={form.date} onChange={(event) => setForm({...form,date:event.target.value})} required/></label>
                <label>Hora<input type="time" value={form.time} onChange={(event) => setForm({...form,time:event.target.value})}/></label>
              </div>
              <label>Lugar<input value={form.location} onChange={(event) => setForm({...form,location:event.target.value})} maxLength={120} placeholder="Lugar de encuentro"/></label>
              <label className="weekly-publish-check"><input type="checkbox" checked={form.published} onChange={(event) => setForm({...form,published:event.target.checked})}/><span><b>Publicar para los jóvenes</b><small>Al activar esta opción, la actividad aparecerá en el portal juvenil.</small></span></label>
              {error && <p className="weekly-admin-alert error">{error}</p>}
              <footer><button type="button" className="weekly-cancel" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button><button type="submit" className="weekly-save" disabled={saving}><Save size={16}/>{saving ? 'Guardando...' : form.published ? 'Guardar y publicar' : 'Guardar borrador'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
