import {useCallback, useEffect, useState} from 'react';
import {Image, RefreshCw, ClipboardList} from 'lucide-react';
import {listYouthDevotionalSubmissions, type YouthDevotionalSubmission} from '../services/youthDevotionalSubmissions';
import styles from './styles/YouthDevotionalInbox.module.css';

export default function YouthDevotionalInbox() {
  const [items, setItems] = useState<YouthDevotionalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await listYouthDevotionalSubmissions()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las entregas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div><span>PORTAL JUVENIL</span><h2>Entregas de los jóvenes</h2><p>Reflexiones y fotografías que han enviado los muchachos.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button>
      </header>
      {loading && <p className={styles.state}>Cargando entregas...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && !items.length && <div className={styles.state}><ClipboardList size={28}/><strong>Aún no hay entregas</strong><span>Cuando un joven envíe su reflexión, aparecerá aquí.</span></div>}
      <div className={styles.list}>
        {items.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.cardHead}><strong>{item.memberName}</strong><span>{new Date(item.createdAt).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</span></div>
            <p>{item.message}</p>
            {item.imageDataUrl && <a href={item.imageDataUrl} target="_blank" rel="noreferrer" className={styles.imageLink}><Image size={15}/> Ver foto adjunta</a>}
            {item.imageDataUrl && <img className={styles.image} src={item.imageDataUrl} alt={`Foto adjunta por ${item.memberName}`} loading="lazy"/>}
          </article>
        ))}
      </div>
    </section>
  );
}
