import {useEffect, useState} from 'react';
import {HeartHandshake, RefreshCw, ShieldCheck, Clock3, MessageCircle} from 'lucide-react';
import {
  getPrayerRequestsForAdministration,
  updatePrayerRequestStatus,
  type AdminPrayerRequest,
} from '../../services/youthPortal';

export default function PrayersPage() {
  const [items,setItems] = useState<AdminPrayerRequest[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [savingId,setSavingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await getPrayerRequestsForAdministration());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las peticiones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {void load();}, []);

  async function changeStatus(item: AdminPrayerRequest, status: string) {
    setSavingId(item.id);
    setMessage('');
    setError('');
    try {
      await updatePrayerRequestStatus(item.id,status);
      setItems((current) => current.map((row) => row.id === item.id ? {...row,status} : row));
      setMessage('Estado de la petición actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <main className="prayers-admin-page">
      <header className="management-header">
        <div><span className="management-kicker">ACOMPAÑAMIENTO ESPIRITUAL</span><h1>Peticiones de oración</h1><p>Recibe las peticiones enviadas desde el portal juvenil y acompaña cada solicitud.</p></div>
        <div className="prayers-admin-icon"><HeartHandshake size={32}/></div>
      </header>
      <section className="prayers-admin-summary"><span><ShieldCheck size={17}/> Acceso para administración y pastoral</span><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button></section>
      {error && <p className="prayers-admin-alert error" role="alert">{error}</p>}
      {message && <p className="prayers-admin-alert success" role="status">{message}</p>}
      {loading ? <div className="prayers-admin-empty"><RefreshCw size={23}/> Cargando peticiones...</div> : items.length === 0 ? (
        <div className="prayers-admin-empty"><MessageCircle size={32}/><strong>No hay peticiones recibidas</strong><span>Las solicitudes enviadas desde el portal juvenil aparecerán aquí.</span></div>
      ) : (
        <section className="prayers-admin-list">
          {items.map((item) => (
            <article className="prayer-admin-card" key={item.id}>
              <header><div><span>{item.category}</span><h2>{item.requester || 'Anónimo'}</h2></div><small><Clock3 size={13}/> {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'}</small></header>
              <p>{item.message}</p>
              <footer><span className={`prayer-status-chip ${item.status.toLowerCase().replace(/ /g,'-')}`}>{item.status}</span><label>Estado<select value={item.status} disabled={savingId === item.id} onChange={(event) => void changeStatus(item,event.target.value)}><option>Pendiente</option><option>En oración</option><option>Atendida</option></select></label>{savingId === item.id && <small>Guardando...</small>}</footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
