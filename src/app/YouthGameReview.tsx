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
  const [verifiedScores, setVerifiedScores] = useState<Record<string, string>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
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
    const reward = decision === 'approve' ? 5 : 0;
    const verifiedScore = Number(verifiedScores[item.id] ?? String(item.score));
    const verificationNote = (verificationNotes[item.id] ?? '').trim();
    if (decision === 'approve' && (!Number.isInteger(verifiedScore) || verifiedScore < 0 || verifiedScore > 10000 || verificationNote.length < 10)) {
      setError('Registra la puntuación comprobada y una evidencia de al menos 10 caracteres antes de aprobar.');
      return;
    }
    const action = decision === 'approve' ? 'validar la puntuación comprobada y acreditar hasta 5 Llamas (máximo 15 al día)' : 'rechazar este resultado';
    if (!window.confirm('¿Confirmas ' + action + '? Esta revisión no se puede repetir.')) return;
    setBusyId(item.id); setError(''); setMessage('');
    try {
      const result = await reviewAdminYouthGameResult(item.id, decision, reward, verifiedScore, verificationNote);
      setMessage(decision === 'approve' ? 'Partida validada. Se acreditaron ' + result.reward + ' Llamas.' : 'Resultado rechazado.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la revisión.');
    } finally { setBusyId(''); }
  }

  return <section className={`${styles.panel} bg-[var(--jdf-surface)] text-[var(--jdf-text)]`}>
    <header className={styles.header}>
      <div><span>CONTROL DE RECOMPENSAS</span><h3>Partidas pendientes de revisión</h3><p>El servidor recalcula las respuestas de los nueve juegos y guarda la puntuación verificada. Cada resultado sigue pendiente de aprobación administrativa antes de acreditar Llamas.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    {loading ? <p className={styles.empty}>Cargando resultados…</p> : items.length === 0
      ? <p className={styles.empty}>No hay partidas pendientes de revisión.</p>
      : <div className={styles.list}>{items.map((item) => <article className={styles.item} key={item.id}>
        <div className={styles.identity}><span><ShieldCheck size={17}/></span><div><b>{item.memberName}</b><small>{gameNames[item.gameId] ?? 'Juego bíblico'} · {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'} · {item.answerValidation === 'server-validated' ? 'Respuestas verificadas por servidor' : 'Revisión manual'}</small></div></div>
        <div className={styles.score}><strong>{item.score}</strong><small>puntos declarados por el dispositivo</small></div>
        <label className={styles.reward}>Puntuación comprobada<input type="number" min="0" max="10000" step="1" value={verifiedScores[item.id] ?? String(item.score)} onChange={(event) => setVerifiedScores((old) => ({...old, [item.id]: event.target.value}))}/></label>
        <label className={styles.reward}>Evidencia de revisión<textarea rows={2} value={verificationNotes[item.id] ?? ''} onChange={(event) => setVerificationNotes((old) => ({...old, [item.id]: event.target.value}))} placeholder="Describe cómo contrastaste las respuestas o el resultado."/></label>
        <p className={styles.reward}>Recompensa automática: <b>5 Llamas por partida aprobada</b> · máximo <b>15 Llamas al día</b>. El límite se aplica en el servidor.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => void review(item, 'approve')} disabled={Boolean(busyId)}><CheckCircle2 size={16}/> Validar</button>
          <button type="button" className={styles.reject} onClick={() => void review(item, 'reject')} disabled={Boolean(busyId)}><XCircle size={16}/> Rechazar</button>
        </div>
        {busyId === item.id && <small className={styles.processing}>Guardando revisión…</small>}
      </article>)}</div>}
  </section>;
}
