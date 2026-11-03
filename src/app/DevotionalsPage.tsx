
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CalendarDays,
  UserRound,
  Trash2,
  X,
  Flame,
  Heart,
} from 'lucide-react';

import {
  createDevotional,
  deleteDevotional,
  getDevotionals,
  type DevotionalRecord,
} from '../services/repositories/devotionals';

const categories = ['Todos', 'Fe', 'Oración', 'Juventud', 'Amor', 'Servicio'];

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function DevotionalsPage({canManage = false}: {canManage?: boolean}) {
  const [devotionals, setDevotionals] = useState<DevotionalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selected, setSelected] = useState<DevotionalRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [reference, setReference] = useState('');
  const [author, setAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Fe');
  const [content, setContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const items = await getDevotionals();
        if (active) setDevotionals(items);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los devocionales.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return devotionals.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(term) ||
        item.reference.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term);

      const matchesCategory =
        category === 'Todos' || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [devotionals, search, category]);

  function resetForm() {
    setTitle('');
    setVerse('');
    setReference('');
    setAuthor('');
    setNewCategory('Fe');
    setContent('');
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      await createDevotional({
        title,
        verse,
        reference,
        author: author.trim() || 'Equipo juvenil',
        category: newCategory,
        date: getLocalDate(),
        content,
      });

      resetForm();
      setShowForm(false);
      setMessage('Devocional publicado correctamente.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo publicar el devocional.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: DevotionalRecord) {
    if (!window.confirm(`¿Deseas eliminar "${item.title}"?`)) return;

    setError('');
    setMessage('');
    setDeleting(true);

    try {
      await deleteDevotional(item.id);
      setSelected(null);
      setMessage('Devocional eliminado correctamente.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo eliminar el devocional.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="devotionals-page">
      <header className="devotionals-hero">
        <div>
          <span className="devotionals-eyebrow">
            <Flame size={15} /> CRECIMIENTO ESPIRITUAL
          </span>
          <h1>Devocionales</h1>
          <p>Alimenta tu fe y fortalece tu relación con Dios cada día.</p>
        </div>

        {canManage && (
          <button
            className="devotionals-primary"
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
          >
            <Plus size={18} /> Crear devocional
          </button>
        )}
      </header>

      <section className="devotionals-feature">
        <div className="devotionals-feature-icon">
          <BookOpen size={28} />
        </div>
        <div>
          <span>PALABRA PARA HOY</span>
          <h2>Crece en la presencia de Dios</h2>
          <p>
            Dedica tiempo a su Palabra, fortalece tu fe y permite que Él guíe tus pasos.
          </p>
        </div>
      </section>

      <section className="devotionals-controls">
        <div className="devotionals-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar devocionales..."
          />
        </div>

        <div className="devotionals-categories">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="attendance-error">
          {error}
        </div>
      )}

      {message && (
        <div role="status" className="attendance-success">
          {message}
        </div>
      )}

      <section className="devotionals-grid">
        {loading ? (
          <div className="devotionals-empty">
            Cargando devocionales...
          </div>
        ) : filtered.map((item) => (
          <article className="devotional-card" key={item.id}>
            <div className="devotional-card-top">
              <span className="devotional-category">{item.category}</span>
              <Heart size={18} />
            </div>

            <h3>{item.title}</h3>
            <blockquote>“{item.verse}”</blockquote>
            <strong className="devotional-reference">{item.reference}</strong>
            <p className="devotional-preview">{item.content}</p>

            <div className="devotional-card-footer">
              <span>
                <CalendarDays size={14} /> {item.date}
              </span>
              <button onClick={() => setSelected(item)}>
                Leer reflexión
              </button>
            </div>
          </article>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="devotionals-empty">
            <BookOpen size={35} />
            <h3>No hay devocionales</h3>
            <p>
              {devotionals.length === 0
                ? 'Todavía no se han publicado devocionales.'
                : 'Intenta con otra búsqueda o categoría.'}
            </p>
          </div>
        )}
      </section>

      {selected && (
        <div className="devotionals-overlay">
          <section className="devotionals-modal">
            <div className="devotionals-modal-header">
              <span className="devotional-category">{selected.category}</span>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>

            <h2>{selected.title}</h2>
            <blockquote>“{selected.verse}”</blockquote>
            <strong>{selected.reference}</strong>
            <p className="devotional-full-content">{selected.content}</p>

            <div className="devotional-author">
              <UserRound size={16} /> {selected.author}
            </div>

            {canManage && (
              <button
                className="devotional-remove"
                onClick={() => handleDelete(selected)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Eliminando...' : 'Eliminar devocional'}
              </button>
            )}
          </section>
        </div>
      )}

      {showForm && canManage && (
        <div className="devotionals-overlay">
          <form className="devotionals-modal" onSubmit={handleCreate}>
            <div className="devotionals-modal-header">
              <div>
                <h2>Nuevo devocional</h2>
                <p>Comparte una enseñanza bíblica.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>

            <label htmlFor="devotional-title">Título</label>
            <input
              id="devotional-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título del devocional"
              maxLength={120}
              required
            />

            <label htmlFor="devotional-verse">Versículo bíblico</label>
            <textarea
              id="devotional-verse"
              value={verse}
              onChange={(event) => setVerse(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Escribe el versículo..."
              required
            />

            <label htmlFor="devotional-reference">Referencia bíblica</label>
            <input
              id="devotional-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ejemplo: Juan 3:16"
              required
            />

            <label htmlFor="devotional-author">Autor</label>
            <input
              id="devotional-author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Nombre del autor"
              maxLength={100}
            />

            <label htmlFor="devotional-category">Categoría</label>
            <select
              id="devotional-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            >
              {categories.filter((item) => item !== 'Todos').map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <label htmlFor="devotional-content">Reflexión</label>
            <textarea
              id="devotional-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              maxLength={10000}
              placeholder="Escribe la reflexión y enseñanza..."
              required
            />

            <button
              className="devotionals-primary"
              type="submit"
              disabled={saving}
            >
              <Plus size={17} />
              {saving ? 'Publicando...' : 'Publicar devocional'}
            </button>
          </form>
        </div>
      )}

      <p className="devotionals-notice">
        Los devocionales se consultan desde Firebase Staging. La publicación y eliminación están reservadas para administración y pastoral.
      </p>
    </main>
  );
}
