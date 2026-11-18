import styles from './styles/DevotionalsPage.module.css';
import YouthDevotionalInbox from './YouthDevotionalInbox';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
  const deferredSearch = useDeferredValue(search);
  const [visibleCount, setVisibleCount] = useState(24);
  const [category, setCategory] = useState('Todos');
  const [selected, setSelected] = useState<DevotionalRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [reference, setReference] = useState('');
  const [author, setAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Fe');
  const [content, setContent] = useState('');
  const [flyerDataUrls, setFlyerDataUrls] = useState<string[]>([]);
  const [flyerError, setFlyerError] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
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
      const response = await listDevotionals();
      const items = response.devotionals;
      // No mostrar documentos antiguos/vacíos como tarjetas sin título ni reflexión.
      const usableItems = items.filter((item) => Boolean(
        item.title?.trim() &&
        item.verse?.trim() &&
        item.reference?.trim() &&
        item.content?.trim() &&
        item.category?.trim(),
      ));
      if (mountedRef.current) {
        setDevotionals(usableItems);
        setNextCursor(response.nextCursor);
        setVisibleCount(24);
      }
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

  // Normaliza el texto una sola vez: no volver a recorrer reflexiones extensas
  // ni cadenas de imágenes base64 en cada pulsación del buscador.
  const searchableDevotionals = useMemo(() => devotionals.map((item) => ({
    item,
    title: item.title.toLocaleLowerCase('es'),
    reference: item.reference.toLocaleLowerCase('es'),
    content: item.content.toLocaleLowerCase('es'),
  })), [devotionals]);

  const filtered = useMemo(() => {
    const term = deferredSearch.toLocaleLowerCase('es').trim();
    return searchableDevotionals
      .filter(({item, title: searchableTitle, reference: searchableReference, content: searchableContent}) => {
        const matchesSearch = !term ||
          searchableTitle.includes(term) ||
          searchableReference.includes(term) ||
          searchableContent.includes(term);
        return matchesSearch && (category === 'Todos' || item.category === category);
      })
      .map(({item}) => item);
  }, [searchableDevotionals, deferredSearch, category]);

  useEffect(() => {
    setVisibleCount(24);
  }, [search, category]);

  const visibleDevotionals = filtered.slice(0, visibleCount);

  async function loadMoreDevotionals() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const response = await listDevotionals(nextCursor);
      const usableItems = response.devotionals.filter((item) => Boolean(
        item.title?.trim() &&
        item.verse?.trim() &&
        item.reference?.trim() &&
        item.content?.trim() &&
        item.category?.trim(),
      ));
      if (mountedRef.current) {
        setDevotionals((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          return [...current, ...usableItems.filter((item) => !existingIds.has(item.id))];
        });
        setNextCursor(response.nextCursor);
        setVisibleCount((count) => count + 12);
      }
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar más devocionales.');
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }

  function resetForm() {
    setTitle('');
    setVerse('');
    setReference('');
    setAuthor('');
    setNewCategory('Fe');
    setContent('');
    setFlyerDataUrls([]);
    setFlyerError('');
  }

  async function handleFlyerChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setFlyerError('');
    if (!files.length) return;
    const remaining = 5 - flyerDataUrls.length;
    if (files.length > remaining) {
      setFlyerError(`Puedes agregar ${remaining} imagen(es) más. Cada historia admite hasta 5.`);
      event.target.value = '';
      return;
    }
    try {
      const prepared = await Promise.all(files.map(async (file) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
          throw new Error('Cada imagen debe ser JPG, PNG o WebP y pesar máximo 12 MB.');
        }
        const source = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer una imagen.'));
          reader.onerror = () => reject(new Error('No se pudo leer una imagen.'));
          reader.readAsDataURL(file);
        });
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('Uno de los archivos no es una imagen válida.'));
          element.src = source;
        });
        const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar una imagen.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.62;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        while (compressed.length > 115000 && quality > 0.3) {
          quality -= 0.07;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        if (compressed.length > 130000) throw new Error('Una imagen sigue siendo muy pesada. Usa una imagen más ligera.');
        return compressed;
      }));
      const combined = [...flyerDataUrls, ...prepared];
      if (combined.reduce((total, image) => total + image.length, 0) > 620000) {
        throw new Error('El conjunto de imágenes supera el tamaño permitido. Reduce la cantidad o el peso.');
      }
      setFlyerDataUrls(combined);
    } catch (cause) {
      setFlyerError(cause instanceof Error ? cause.message : 'No se pudieron procesar las imágenes.');
    }
    event.target.value = '';
  }

  function removeFlyer(index: number) {
    setFlyerDataUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setFlyerError('');
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
        ...(flyerDataUrls.length ? {flyerDataUrls} : {}),
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

      <section className="devotional-publisher-card" aria-labelledby="devotional-publisher-title">
        <div className="devotional-publisher-copy">
          <span className="devotional-publisher-kicker"><ImagePlus size={15}/> PUBLICACIÓN PARA EL PORTAL JUVENIL</span>
          <h2 id="devotional-publisher-title">Imagen del devocional para los jóvenes</h2>
          <p>Selecciona hasta 5 imágenes para crear una historia. Los jóvenes podrán avanzar entre ellas sin que una reemplace a la anterior.</p>
        </div>
        <div className="devotional-flyer-upload">
          <label className="devotional-flyer-picker" htmlFor="devotional-flyer">
            <ImagePlus size={20}/>
            <span>{flyerDataUrls.length ? 'Agregar más imágenes' : 'Seleccionar imágenes'}</span>
            <small>Hasta 5 imágenes · JPG, PNG o WebP · máximo 12 MB cada una</small>
          </label>
          <input id="devotional-flyer" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handleFlyerChange(event)} />
          {flyerDataUrls.length ? (
            <div className="devotional-story-previews">
              {flyerDataUrls.map((image, index) => (
                <div className="devotional-flyer-preview" key={index}>
                  <img src={image} alt={`Imagen ${index + 1} de la historia`}/>
                  <span>Imagen {index + 1}</span>
                  <button type="button" onClick={() => removeFlyer(index)}>Quitar</button>
                </div>
              ))}
              <span className="devotional-flyer-ready">{flyerDataUrls.length} de 5 imágenes listas para la historia</span>
            </div>
          ) : <p className="devotional-flyer-empty">Todavía no has seleccionado imágenes.</p>}
          {flyerError && <p role="alert" className="devotional-flyer-error">{flyerError}</p>}
          <button
            type="button"
            className="devotionals-primary devotional-publish-cta"
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
          >
            <Plus size={17} /> Completar y publicar devocional
          </button>
        </div>
      </section>

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
        ) : visibleDevotionals.map((item) => (
          <article className="devotional-card" key={item.id}>
            <div className="devotional-card-top">
              <span className="devotional-category">{item.category}</span>
              <Heart size={18} />
            </div>

            {(item.flyerDataUrls?.length ? item.flyerDataUrls : item.flyerDataUrl ? [item.flyerDataUrl] : []).map((image, index) => <img key={index} className="devotional-admin-flyer" src={image} alt={`Imagen ${index + 1} de ${item.title}`} loading="lazy" />)}
            <h3>{item.title}</h3>
            <blockquote>“{item.verse}”</blockquote>
            <strong className="devotional-reference">{item.reference}</strong>
            <p className="devotional-preview">{item.content}</p>

            <div className="devotional-card-footer">
              <span>
                <CalendarDays size={14} /> {item.date}
              </span>
              <div className="devotional-card-actions">
                <button type="button" onClick={() => setSelected(item)}>
                  Leer reflexión
                </button>
                <button
                  type="button"
                  className="devotional-card-delete"
                  onClick={() => void handleDelete(item)}
                  disabled={deleting}
                  aria-label={`Eliminar devocional ${item.title}`}
                >
                  <Trash2 size={15} /> {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
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
        {!loading && (filtered.length > visibleDevotionals.length || nextCursor) && (
          <div className="devotionals-load-more">
            <span>Mostrando {visibleDevotionals.length}{nextCursor ? ' · hay más disponibles' : ` de ${filtered.length}`}</span>
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                if (filtered.length > visibleDevotionals.length) {
                  setVisibleCount((count) => count + 12);
                } else {
                  void loadMoreDevotionals();
                }
              }}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más devocionales'}
            </button>
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
            {(selected.flyerDataUrls?.length ? selected.flyerDataUrls : selected.flyerDataUrl ? [selected.flyerDataUrl] : []).map((image, index) => <img key={index} className="devotional-admin-flyer devotional-admin-flyer-detail" src={image} alt={`Imagen ${index + 1} de ${selected.title}`} />)}
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
          <YouthDevotionalInbox />
</main>
  );
}
