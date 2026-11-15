import styles from './styles/DevotionalsPage.module.css';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  ImagePlus,
} from 'lucide-react';

import {
  createDevotional,
  deleteDevotional,
  listDevotionals,
  type DevotionalRecord,
} from '../services/repositories/devotionals';

const categories = ['Todos', 'Fe', 'Oración', 'Juventud', 'Amor', 'Servicio'];

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function DevotionalsPage() {
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
  const [flyerDataUrl, setFlyerDataUrl] = useState('');
  const [flyerError, setFlyerError] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const mountedRef = useRef(false);

  async function loadDevotionals(showLoading = true) {
    if (mountedRef.current) {
      if (showLoading) setLoading(true);
      setError('');
    }
    try {
      const items = await listDevotionals();
      if (mountedRef.current) setDevotionals(items);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los devocionales.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void loadDevotionals();
    return () => { mountedRef.current = false; };
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
    setFlyerDataUrl('');
    setFlyerError('');
  }

  async function handleFlyerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFlyerError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFlyerError('Selecciona una imagen JPG, PNG o WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFlyerError('La imagen original no puede superar 12 MB.');
      event.target.value = '';
      return;
    }
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la imagen.'));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('El archivo de imagen no es válido.'));
        element.src = source;
      });
      const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.78;
      let compressed = canvas.toDataURL('image/jpeg', quality);
      while (compressed.length > 660000 && quality > 0.42) {
        quality -= 0.08;
        compressed = canvas.toDataURL('image/jpeg', quality);
      }
      if (compressed.length > 680000) throw new Error('El flyer sigue siendo muy pesado. Prueba con una imagen más ligera.');
      setFlyerDataUrl(compressed);
    } catch (cause) {
      setFlyerError(cause instanceof Error ? cause.message : 'No se pudo procesar el flyer.');
      setFlyerDataUrl('');
    }
    event.target.value = '';
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
        ...(flyerDataUrl ? {flyerDataUrl} : {}),
      });

      if (!mountedRef.current) return;
      resetForm();
      setShowForm(false);
      setMessage('Devocional publicado correctamente.');
      await loadDevotionals(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo publicar el devocional.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function handleDelete(item: DevotionalRecord) {
    if (!window.confirm(`¿Deseas eliminar "${item.title}"?`)) return;

    setError('');
    setMessage('');
    setDeleting(true);

    try {
      await deleteDevotional(item.id);
      if (!mountedRef.current) return;
      setSelected(null);
      setMessage('Devocional eliminado correctamente.');
      await loadDevotionals(false);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el devocional.');
      }
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }

  return (
    <main className={`${styles.scope} devotionals-page`}>
      <header className="devotionals-hero">
        <div>
          <span className="devotionals-eyebrow">
            <Flame size={15} /> CRECIMIENTO ESPIRITUAL
          </span>
          <h1>Devocionales</h1>
          <p>Alimenta tu fe y fortalece tu relación con Dios cada día.</p>
        </div>

        <button
          className="devotionals-primary"
          onClick={() => {
            setError('');
            setShowForm(true);
          }}
        >
          <Plus size={18} /> Crear devocional
        </button>
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

            <h2 id="devotional-detail-title">{selected.title}</h2>
            <blockquote>“{selected.verse}”</blockquote>
            <strong>{selected.reference}</strong>
            <p className="devotional-full-content">{selected.content}</p>

            <div className="devotional-author">
              <UserRound size={16} /> {selected.author}
            </div>

            <button
              className="devotional-remove"
              onClick={() => handleDelete(selected)}
              disabled={deleting}
            >
              <Trash2 size={16} />
              {deleting ? 'Eliminando...' : 'Eliminar devocional'}
            </button>
          </section>
        </div>
      )}

      {showForm && (
        <div className="devotionals-overlay">
          <form className="devotionals-modal" onSubmit={handleCreate}>
            <div className="devotionals-modal-header">
              <div>
                <h2 id="devotional-form-title">Nuevo devocional</h2>
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

            <label htmlFor="devotional-flyer">Flyer del devocional (opcional)</label>
            <div className="devotional-flyer-upload">
              <label className="devotional-flyer-picker" htmlFor="devotional-flyer">
                <ImagePlus size={18} />
                <span>{flyerDataUrl ? 'Cambiar flyer' : 'Seleccionar flyer'}</span>
                <small>JPG, PNG o WebP · se optimiza automáticamente</small>
              </label>
              <input id="devotional-flyer" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleFlyerChange(event)} />
              {flyerDataUrl && <div className="devotional-flyer-preview">
                <img src={flyerDataUrl} alt="Vista previa del flyer" />
                <button type="button" onClick={() => setFlyerDataUrl('')}>Quitar imagen</button>
              </div>}
              {flyerError && <p role="alert" className="devotional-flyer-error">{flyerError}</p>}
            </div>

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
        Los devocionales se consultan y administran en el proyecto Firebase original.
      </p>
    </main>
  );
}
