import {useCallback, useEffect, useState} from 'react';
import {BookOpen, CalendarDays, Flame, RefreshCw} from 'lucide-react';
import {getPublicDevotionals, type DevotionalRecord} from '../../services/repositories/devotionals';
import styles from '../styles/DevotionalFlyerTab.module.css';

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || 'Fecha por confirmar';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DevotionalFlyerTab() {
  const [items, setItems] = useState<DevotionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span><Flame size={15}/> CRECIMIENTO ESPIRITUAL</span>
          <h1>Devocional de la generación</h1>
          <p>Una palabra para alimentar tu fe y caminar con Dios.</p>
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

      <div className={styles.list}>
        {items.map((item) => (
          <article className={styles.card} key={item.id}>
            {item.flyerDataUrl && (
              <a className={styles.flyerLink} href={item.flyerDataUrl} target="_blank" rel="noreferrer" aria-label={`Abrir flyer de ${item.title}`}>
                <img className={styles.flyer} src={item.flyerDataUrl} alt={`Flyer: ${item.title}`} loading="lazy"/>
              </a>
            )}
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
