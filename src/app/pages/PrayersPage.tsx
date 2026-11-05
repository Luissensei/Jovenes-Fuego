import {useEffect, useRef, useState} from 'react';
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
  const [updatingId,setUpdatingId] = useState<string | null>(null);
  const mountedRef = useRef(false);

  async function load() {
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const requests = await getPrayerRequestsForAdministration();
      if (mountedRef.current) setItems(requests);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las peticiones.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    setUpdatingId(id);
    setError('');
    try {
      await updatePrayerRequestStatus(id, status);
      if (mountedRef.current) {
        setItems((current) => current.map((item) =>
          item.id === id ? {...item, status} : item,
        ));
      }
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.');
      }
    } finally {
      if (mountedRef.current) setUpdatingId(null);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; };
  }, []);



  return (
    <main className="prayers-admin-page">
      <header className="management-header">
        <div><span className="management-kicker">ACOMPAÑAMIENTO ESPIRITUAL</span><h1>Peticiones de oración</h1><p>Recibe las peticiones enviadas desde el portal juvenil y acompaña cada solicitud.</p></div>
        <div className="prayers-admin-icon"><HeartHandshake size={32}/></div>
      </header>
      <section className="prayers-admin-summary"><span><ShieldCheck size={17}/> Acceso para administración y pastoral</span><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button></section>
      {error && <p className="prayers-admin-alert error" role="alert">{error}</p>}
      <p className="prayers-admin-alert" role="note">Aquí se reúnen las solicitudes actuales y los registros históricos. Puedes actualizar el seguimiento sin eliminar el contenido original de cada petición.</p>
      {loading ? <div className="prayers-admin-empty"><RefreshCw size={23}/> Cargando peticiones...</div> : items.length === 0 ? (
        <div className="prayers-admin-empty"><MessageCircle size={32}/><strong>No hay peticiones recibidas</strong><span>Las solicitudes enviadas desde el portal juvenil aparecerán aquí.</span></div>
      ) : (
        <section className="prayers-admin-list">
          {items.map((item) => (
            <article className="prayer-admin-card" key={item.id}>
              <header><div><span>{item.category}</span><h2>{item.requester || 'Anónimo'}</h2></div><small><Clock3 size={13}/> {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'}</small></header>
              <p>{item.message}</p>
              <footer>
                <label className="prayer-status-control">
                  <span>Estado</span>
                  <select
                    aria-label={`Estado de la petición de ${item.requester || 'Anónimo'}`}
                    value={item.status}
                    disabled={updatingId === item.id}
                    onChange={(event) => void changeStatus(item.id, event.target.value)}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En oración">En oración</option>
                    <option value="Atendida">Atendida</option>
                  </select>
                  {updatingId === item.id && <small>Guardando…</small>}
                </label>
              </footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
