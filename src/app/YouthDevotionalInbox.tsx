import {useCallback, useEffect, useState} from 'react';
import {Image, RefreshCw, ClipboardList, CheckCircle2, XCircle} from 'lucide-react';
import {listYouthDevotionalSubmissions, reviewYouthDevotionalSubmission, type YouthDevotionalSubmission} from '../services/youthDevotionalSubmissions';
import styles from './styles/YouthDevotionalInbox.module.css';

export default function YouthDevotionalInbox() {
  const [items, setItems] = useState<YouthDevotionalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await listYouthDevotionalSubmissions()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las entregas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, decision: 'approve' | 'reject') => {
    const action = decision === 'approve' ? 'aprobar y otorgar 20 puntos' : 'rechazar';
    if (!window.confirm(`¿Confirmas ${action} esta entrega?`)) return;
    setReviewingId(id); setError('');
    try {
      await reviewYouthDevotionalSubmission(id, decision);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo revisar la entrega.');
    } finally {
      setReviewingId('');
    }
  };
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
            <span className={styles.status} data-status={item.status}>{item.status}{item.status === 'Aprobado' ? ' · 20 puntos' : ''}</span>
            <p>{item.message}</p>
            {item.imageDataUrl && <a href={item.imageDataUrl} target="_blank" rel="noreferrer" className={styles.imageLink}><Image size={15}/> Ver foto adjunta</a>}
            {item.imageDataUrl && <img className={styles.image} src={item.imageDataUrl} alt={`Foto adjunta por ${item.memberName}`} loading="lazy"/>}
            {item.status === 'Pendiente' && <div className={styles.actions}>
              <button type="button" onClick={() => void review(item.id, 'approve')} disabled={reviewingId === item.id}><CheckCircle2 size={16}/> Aprobar · 20 puntos</button>
              <button type="button" onClick={() => void review(item.id, 'reject')} disabled={reviewingId === item.id}><XCircle size={16}/> Rechazar</button>
            </div>}
          </article>
        ))}
      </div>
    </section>
  );
}
