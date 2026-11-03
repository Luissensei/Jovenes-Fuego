
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  X,
} from 'lucide-react';

import {
  createPhotoRequest,
  getPhotos,
  approvePhoto,
  rejectPhoto,
  deleteApprovedPhoto,
  type PhotoRecord,
} from '../../services/repositories/photos';

export default function PhotosPage({canModerate = false}: {canModerate?: boolean}) {
  const [pending, setPending] = useState<PhotoRecord[]>([]);
  const [approved, setApproved] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('');

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPhotos();
      setPending(result.pending);
      setApproved(result.approved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las fotografías.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setAuthorName('');
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await createPhotoRequest({
        title,
        description,
        imageUrl,
        authorName,
      });
      await loadPhotos();

      resetForm();
      setShowForm(false);
      setMessage('Fotografía enviada a revisión.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo registrar la fotografía.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(item: PhotoRecord) {
    if (!window.confirm(`¿Aprobar la fotografía "${item.title}"?`)) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await approvePhoto(item);
      await loadPhotos();
      setMessage('Fotografía aprobada y publicada.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo aprobar la fotografía.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(item: PhotoRecord) {
    if (!window.confirm(`¿Rechazar la fotografía "${item.title}"?`)) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await rejectPhoto(item.id);
      await loadPhotos();
      setMessage('Fotografía rechazada.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo rechazar la fotografía.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: PhotoRecord) {
    if (!window.confirm(`¿Eliminar "${item.title}" de las fotografías aprobadas?`)) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await deleteApprovedPhoto(item.id);
      await loadPhotos();
      setMessage('Fotografía eliminada.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo eliminar la fotografía.',
      );
    } finally {
      setSaving(false);
    }
  }

  const currentItems = activeTab === 'pending' ? pending : approved;

  return (
    <main className="photos-page">
      <header className="photos-hero">
        <div>
          <span className="photos-eyebrow">
            <Image size={15} /> GALERÍA DE LA COMUNIDAD
          </span>
          <h1>Fotos y aprobaciones</h1>
          <p>Revisa las fotografías y administra su publicación.</p>
        </div>

        <button
          className="photos-primary"
          onClick={() => {
            setError('');
            setShowForm(true);
          }}
        >
          <Plus size={18} /> Nueva fotografía
        </button>
      </header>

      <section className="photos-stats">
        <article>
          <Clock size={22} />
          <span>Pendientes</span>
          <strong>{pending.length}</strong>
        </article>

        <article>
          <CheckCircle2 size={22} />
          <span>Aprobadas</span>
          <strong>{approved.length}</strong>
        </article>
      </section>

      {error && <div className="photos-alert error" role="alert">{error}</div>}
      {message && <div className="photos-alert success" role="status">{message}</div>}

      <nav className="photos-tabs">
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} /> Pendientes ({pending.length})
        </button>

        <button
          className={activeTab === 'approved' ? 'active' : ''}
          onClick={() => setActiveTab('approved')}
        >
          <CheckCircle2 size={16} /> Publicadas ({approved.length})
        </button>
      </nav>

      {loading ? (
        <div className="photos-empty">Cargando fotografías...</div>
      ) : currentItems.length === 0 ? (
        <div className="photos-empty">
          <Image size={36} />
          <h3>
            {activeTab === 'pending'
              ? 'No hay fotografías pendientes'
              : 'Todavía no hay fotografías publicadas'}
          </h3>
          <p>Las fotografías registradas aparecerán aquí.</p>
        </div>
      ) : (
        <section className="photos-grid">
          {currentItems.map((item) => (
            <article className="photo-card" key={item.id}>
              <div className="photo-preview">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="photo-card-content">
                <span className="photo-status">
                  {item.status || 'Pendiente'}
                </span>

                <h3>{item.title}</h3>
                <p>{item.description || 'Sin descripción.'}</p>

                <small>Autor: {item.authorName}</small>

                {activeTab === 'pending' ? (
                  <div className="photo-actions">
                    {canModerate && <button
                      className="photos-approve"
                      onClick={() => void handleApprove(item)}
                      disabled={saving}
                    >
                      <CheckCircle2 size={16} /> Aprobar
                    </button>}

                    {canModerate && <button
                      className="photos-reject"
                      onClick={() => void handleReject(item)}
                      disabled={saving}
                    >
                      <XCircle size={16} /> Rechazar
                    </button>}
                  </div>
                ) : canModerate ? (
                  <button
                    className="photos-reject"
                    onClick={() => void handleDelete(item)}
                    disabled={saving}
                  >
                    <Trash2 size={16} /> Eliminar publicación
                  </button>
                ) : (
                  <small>Publicación aprobada</small>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="photos-overlay">
          <form className="photos-modal" onSubmit={handleCreate}>
            <header>
              <div>
                <span className="photos-eyebrow">NUEVA PUBLICACIÓN</span>
                <h2>Registrar fotografía</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Cerrar"
              >
                <X />
              </button>
            </header>

            <label htmlFor="photo-title">Título</label>
            <input
              id="photo-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
            />

            <label htmlFor="photo-url">Enlace de la imagen</label>
            <input
              id="photo-url"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              required
            />

            {imageUrl.startsWith('http') && (
              <img className="photo-form-preview" src={imageUrl} alt="Vista previa" />
            )}

            <label htmlFor="photo-author">Autor</label>
            <input
              id="photo-author"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              required
              maxLength={120}
            />

            <label htmlFor="photo-description">Descripción</label>
            <textarea
              id="photo-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />

            <button
              className="photos-primary"
              type="submit"
              disabled={saving}
            >
              <Plus size={17} />
              {saving ? 'Guardando...' : 'Enviar a aprobación'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
