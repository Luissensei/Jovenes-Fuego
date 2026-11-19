import {useCallback, useEffect, useState} from 'react';
import {CheckCircle2, RefreshCw, ShieldCheck, XCircle} from 'lucide-react';
import {listAdminYouthGameResults, reviewAdminYouthGameResult, type AdminYouthGameResult} from '../services/youthPortal';
import styles from './styles/YouthGameReview.module.css';

const gameNames: Record<string, string> = {
  trivia: 'Trivia bíblica', verse: 'Completa el versículo', memory: 'Memoria bíblica',
  challenge: 'Reto de 60 segundos', survival: 'Supervivencia', duel: 'Duelo 1 contra 1',
  order: 'Ordena el versículo', truefalse: 'Verdadero o falso', whoami: '¿Quién soy?',
};

export default function YouthGameReview() {
  const [items, setItems] = useState<AdminYouthGameResult[]>([]);
  const [rewards, setRewards] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await listAdminYouthGameResults()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las partidas pendientes.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function review(item: AdminYouthGameResult, decision: 'approve' | 'reject') {
    const reward = decision === 'approve' ? Number(rewards[item.id] ?? '0') : 0;
    if (decision === 'approve' && (!Number.isInteger(reward) || reward < 0 || reward > 1000)) {
      setError('Escribe una recompensa entera entre 0 y 1000 Llamas.'); return;
    }
    const action = decision === 'approve' ? 'validar esta partida y acreditar ' + reward + ' Llamas' : 'rechazar este resultado';
    if (!window.confirm('¿Confirmas ' + action + '? Esta revisión no se puede repetir.')) return;
    setBusyId(item.id); setError(''); setMessage('');
    try {
      const result = await reviewAdminYouthGameResult(item.id, decision, reward);
      setMessage(decision === 'approve' ? 'Partida validada. Se acreditaron ' + result.reward + ' Llamas.' : 'Resultado rechazado.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la revisión.');
    } finally { setBusyId(''); }
  }

  return <section className={styles.panel}>
    <header className={styles.header}>
      <div><span>CONTROL DE RECOMPENSAS</span><h3>Partidas pendientes de revisión</h3><p>Verifica el resultado antes de aprobar Llamas. Cada partida solo puede revisarse una vez.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    {loading ? <p className={styles.empty}>Cargando resultados…</p> : items.length === 0
      ? <p className={styles.empty}>No hay partidas pendientes de revisión.</p>
      : <div className={styles.list}>{items.map((item) => <article className={styles.item} key={item.id}>
        <div className={styles.identity}><span><ShieldCheck size={17}/></span><div><b>{item.memberName}</b><small>{gameNames[item.gameId] ?? 'Juego bíblico'} · {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'}</small></div></div>
        <div className={styles.score}><strong>{item.score}</strong><small>puntos declarados</small></div>
        <label className={styles.reward}>Llamas a otorgar<input type="number" min="0" max="1000" step="1" value={rewards[item.id] ?? '0'} onChange={(event) => setRewards((old) => ({...old, [item.id]: event.target.value}))}/></label>
        <div className={styles.actions}>
          <button type="button" onClick={() => void review(item, 'approve')} disabled={Boolean(busyId)}><CheckCircle2 size={16}/> Validar</button>
          <button type="button" className={styles.reject} onClick={() => void review(item, 'reject')} disabled={Boolean(busyId)}><XCircle size={16}/> Rechazar</button>
        </div>
        {busyId === item.id && <small className={styles.processing}>Guardando revisión…</small>}
      </article>)}</div>}
  </section>;
}
