import {useCallback, useEffect, useState} from 'react';
import {useRef} from 'react';
import {BookOpen, CalendarDays, Flame, RefreshCw, Send, ImagePlus, X, CheckCircle2, ChevronLeft, ChevronRight} from 'lucide-react';
import {submitYouthDevotional} from '../../services/youthDevotionalSubmissions';
import {getPublicDevotionals, type DevotionalRecord} from '../../services/repositories/devotionals';
import styles from '../styles/DevotionalFlyerTab.module.css';

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || 'Fecha por confirmar';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function DevotionalStory({item}: {item: DevotionalRecord}) {
  const images = item.flyerDataUrls?.length ? item.flyerDataUrls : item.flyerDataUrl ? [item.flyerDataUrl] : [];
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  if (!images.length) return null;
  return (
    <div className={styles.story} onTouchStart={(event) => {touchStart.current = event.touches[0]?.clientX ?? null;}} onTouchEnd={(event) => {\n      if (touchStart.current === null) return;\n      const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;\n      if (Math.abs(distance) > 45) setActive((value) => Math.max(0, Math.min(images.length - 1, value + (distance < 0 ? 1 : -1))));\n      touchStart.current = null;\n    }}>
      <img className={styles.flyer} src={images[active]} alt={`Imagen ${active + 1} de ${item.title}`} loading="lazy"/>
      {images.length > 1 && (
        <>
          <div className={styles.storyTop}><span>HISTORIA</span><span>{active + 1} / {images.length}</span></div>
          <div className={styles.storyBars}>{images.map((_, index) => <span key={index} className={index <= active ? styles.storyBarActive : ''}/>)}</div>
          <button type="button" className={styles.storyPrev} onClick={() => setActive((value) => Math.max(0, value - 1))} disabled={active === 0} aria-label="Imagen anterior"><ChevronLeft size={20}/></button>
          <button type="button" className={styles.storyNext} onClick={() => setActive((value) => Math.min(images.length - 1, value + 1))} disabled={active === images.length - 1} aria-label="Imagen siguiente"><ChevronRight size={20}/></button>
          <div className={styles.storyDots}>{images.map((_, index) => <button type="button" key={index} onClick={() => setActive(index)} aria-label={`Ver imagen ${index + 1}`} className={index === active ? styles.storyDotActive : ''}/>)}</div>
        </>
      )}
    </div>
  );
}

export default function DevotionalFlyerTab({memberId, memberName}: {memberId: string; memberName: string}) {
  const [items, setItems] = useState<DevotionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submission, setSubmission] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getPublicDevotionals());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los devocionales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoError('');
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoError('Selecciona una foto JPG, PNG o WebP de máximo 10 MB.');
      event.target.value = '';
      return;
    }
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la foto.'));
        reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('La imagen no es válida.'));
        element.src = source;
      });
      const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.68;
      let output = canvas.toDataURL('image/jpeg', quality);
      while (output.length > 390000 && quality > 0.4) {
        quality -= 0.07;
        output = canvas.toDataURL('image/jpeg', quality);
      }
      if (output.length > 410000) throw new Error('La foto pesa demasiado. Prueba con otra imagen.');
      setPhoto(output);
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : 'No se pudo procesar la foto.');
      setPhoto('');
    }
    event.target.value = '';
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess('');
    setMessage('');
    setSending(true);
    try {
      await submitYouthDevotional({memberId, message: submission, ...(photo ? {imageDataUrl: photo} : {})});
      setSubmission('');
      setPhoto('');
      setSuccess('¡Tu devocional fue entregado! El equipo podrá revisarlo.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo enviar tu devocional.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span><Flame size={15}/> CRECIMIENTO ESPIRITUAL</span>
          <h1>Devocional de la generación</h1>
          <p>Hola, {memberName}. Una palabra para alimentar tu fe y caminar con Dios.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Actualizar devocionales">
          <RefreshCw size={17}/> Actualizar
        </button>
      </header>

      {loading && <div className={styles.state}>Preparando los devocionales...</div>}
      {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => void load()}>Reintentar</button></div>}
      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}><BookOpen size={32}/><strong>Aún no hay devocionales publicados</strong><span>Cuando el equipo comparta uno, aparecerá aquí.</span></div>
      )}

      <section className={styles.submitCard}>
        <div className={styles.submitHeading}>
          <span>MI RESPUESTA</span>
          <h2>Entregar mi devocional</h2>
          <p>Comparte lo que Dios habló a tu vida. También puedes adjuntar una foto de tu cuaderno o reflexión.</p>
        </div>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="youth-devotional-response">Mi reflexión</label>
          <textarea id="youth-devotional-response" value={submission} onChange={(event) => setSubmission(event.target.value)} minLength={20} maxLength={5000} rows={5} placeholder="Hoy aprendí que..." required />
          <div className={styles.formFooter}>
            <small>{submission.length}/5000 caracteres · Mínimo 20</small>
            <label className={styles.photoButton} htmlFor="youth-devotional-photo"><ImagePlus size={17}/> {photo ? 'Cambiar foto' : 'Adjuntar foto'}</label>
            <input ref={photoInput} id="youth-devotional-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handlePhoto(event)} />
          </div>
          {photo && <div className={styles.photoPreview}><img src={photo} alt="Vista previa de tu evidencia"/><button type="button" onClick={() => setPhoto('')} aria-label="Quitar foto"><X size={16}/></button></div>}
          {photoError && <p className={styles.formError} role="alert">{photoError}</p>}
          {message && <p className={styles.formError} role="alert">{message}</p>}
          {success && <p className={styles.formSuccess} role="status"><CheckCircle2 size={17}/>{success}</p>}
          <button className={styles.submitButton} type="submit" disabled={sending || submission.trim().length < 20}><Send size={17}/>{sending ? 'Enviando...' : 'Enviar devocional'}</button>
        </form>
        <small className={styles.privacyNote}>Tu entrega será visible para el equipo de liderazgo, no para los demás jóvenes.</small>
      </section>

      <div className={styles.list}>
        {items.map((item) => (
          <article className={styles.card} key={item.id}>
            <DevotionalStory item={item}/>
            <div className={styles.copy}>
              <div className={styles.meta}><span>{item.category}</span><small><CalendarDays size={14}/>{formatDate(item.date)}</small></div>
              <h2>{item.title}</h2>
              <blockquote>“{item.verse}”</blockquote>
              <strong className={styles.reference}>{item.reference}</strong>
              <p>{item.content}</p>
              <small className={styles.author}>Compartido por {item.author}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
