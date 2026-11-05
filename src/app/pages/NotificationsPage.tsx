import {useCallback, useEffect, useState} from 'react';
import {NavLink} from 'react-router-dom';
import {Bell, RefreshCw, ArrowUpRight, Inbox, HeartHandshake, Users, Image, ClipboardList} from 'lucide-react';
import {getAdminNotifications, type AdminNotification} from '../../services/notifications';
import styles from '../styles/NotificationsPage.module.css';

const icons: Record<string, typeof Bell> = {
  Seguimiento: ClipboardList,
  Visitante: Users,
  Petición: HeartHandshake,
  Mensaje: Inbox,
  Fotografía: Image,
};

export default function NotificationsPage() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getAdminNotifications());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const urgentCount = items.filter((item) => item.priority === 'high').length;

  return (
    <main className={styles.scope}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}><Bell size={25}/></div>
        <div><span>CENTRO DE ACTIVIDAD</span><h1>Notificaciones</h1><p>Reúne los pendientes de seguimiento, visitantes, peticiones, mensajes y fotografías.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16}/> Actualizar</button>
      </header>

      <section className={styles.metrics}>
        <article><span>PENDIENTES</span><strong>{items.length}</strong></article>
        <article><span>REQUIEREN ATENCIÓN</span><strong>{urgentCount}</strong></article>
        <article><span>TIPOS DE AVISO</span><strong>{new Set(items.map((item) => item.kind)).size}</strong></article>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <div className={styles.empty}><span className={styles.spinner}/><b>Consultando actividad reciente...</b></div> :
        items.length === 0 ? <div className={styles.empty}><Bell size={30}/><b>Todo está al día</b><span>No hay pendientes que requieran atención en este momento.</span></div> :
        <section className={styles.list} aria-label="Pendientes administrativos">
          {items.map((item) => {
            const Icon = icons[item.kind] ?? Bell;
            return <article className={styles.item} key={item.id}>
              <span className={styles.icon}><Icon size={19}/></span>
              <div className={styles.copy}><div><span className={styles.kind}>{item.kind}</span>{item.priority === 'high' && <span className={styles.priority}>Prioridad alta</span>}</div><h2>{item.title}</h2><p>{item.description}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'}</small></div>
              <NavLink to={item.path} aria-label={`Abrir ${item.kind}`}><ArrowUpRight size={18}/></NavLink>
            </article>;
          })}
        </section>
      }
      <p className={styles.note}>Los avisos se calculan a partir de los registros actuales de Firebase. Al actualizar un módulo, este centro refleja el estado más reciente.</p>
    </main>
  );
}
