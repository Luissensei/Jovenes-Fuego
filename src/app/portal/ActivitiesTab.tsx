import { AlertCircle, CalendarDays, CheckCircle2, Circle, Clock3, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getYouthWeeklyActivityAttendance, setYouthWeeklyActivityAttendance } from '../../services/youthPortal';
import type { WeeklyActivityAttendanceResponse } from '../../services/youthPortal';
import type { WeeklyActivity } from '../../services/youthPortal';
import { SkeletonList } from '../components/Skeleton';

const weeklyGrowthPlan = [
  {id:'day-1',day:'Día 1',title:'Una fe firme',reference:'Hebreos 11:1',challenge:'Escribe una situación en la que quieras confiar más en Dios.'},
  {id:'day-2',day:'Día 2',title:'Valor para avanzar',reference:'Josué 1:9',challenge:'Da hoy un paso que has estado posponiendo por temor.'},
  {id:'day-3',day:'Día 3',title:'Una vida de oración',reference:'1 Tesalonicenses 5:17',challenge:'Aparta unos minutos para orar por otra persona.'},
  {id:'day-4',day:'Día 4',title:'Amar al prójimo',reference:'Juan 13:34-35',challenge:'Haz un acto de servicio sin esperar reconocimiento.'},
  {id:'day-5',day:'Día 5',title:'Palabras que edifican',reference:'Efesios 4:29',challenge:'Anima a alguien con palabras sinceras.'},
  {id:'day-6',day:'Día 6',title:'Luz en tu entorno',reference:'Mateo 5:14-16',challenge:'Comparte una buena acción y sé ejemplo con respeto.'},
  {id:'day-7',day:'Día 7',title:'Gratitud',reference:'1 Tesalonicenses 5:18',challenge:'Anota tres motivos por los que estás agradecido.'},
];

function formatActivityDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || 'Fecha por confirmar';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function ActivityCard({activity, communitySession, initialResponse}: {activity: WeeklyActivity; communitySession: string; initialResponse?: WeeklyActivityAttendanceResponse}) {
  const [response, setResponse] = useState<WeeklyActivityAttendanceResponse | ''>(initialResponse ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setResponse(initialResponse ?? ''), [initialResponse]);
  async function choose(next: WeeklyActivityAttendanceResponse) {
    if (!communitySession || activity.id.startsWith('legacy-')) return;
    const previous = response;
    setResponse(next);
    setSaving(true);
    setError('');
    try { await setYouthWeeklyActivityAttendance(communitySession, activity.id, next); }
    catch (cause) {
      setResponse(previous);
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar tu respuesta.');
    } finally { setSaving(false); }
  }
  return (
    <article className="youth-activity-card">
      <div className="youth-activity-date"><CalendarDays size={17} /><span>{formatActivityDate(activity.date)}</span></div>
      <h3>{activity.title}</h3>
      {activity.description && <p>{activity.description}</p>}
      <div className="youth-activity-meta">
        {activity.time && <span><Clock3 size={14} /> {activity.time}</span>}
        {activity.location && <span><MapPin size={14} /> {activity.location}</span>}
      </div>
      {!activity.id.startsWith('legacy-') && (
        <div className="youth-activity-attendance">
          <strong>¿Vas a asistir?</strong>
          <div role="group" aria-label={`Confirmar asistencia a ${activity.title}`}>
            <button type="button" disabled={saving} aria-pressed={response === 'yes'} className={response === 'yes' ? 'selected' : ''} onClick={() => void choose('yes')}>Sí, voy</button>
            <button type="button" disabled={saving} aria-pressed={response === 'maybe'} className={response === 'maybe' ? 'selected' : ''} onClick={() => void choose('maybe')}>Tal vez</button>
            <button type="button" disabled={saving} aria-pressed={response === 'no'} className={response === 'no' ? 'selected' : ''} onClick={() => void choose('no')}>No podré</button>
          </div>
          {saving && <small>Guardando...</small>}
          {response && !saving && <small><CheckCircle2 size={13}/> Respuesta guardada</small>}
          {error && <small role="alert">{error}</small>}
        </div>
      )}
    </article>
  );
}

type ActivitiesTabProps = {
  communitySession: string;
  activities: WeeklyActivity[];
  loading: boolean;
  error: string;
  growthDone: string[];
  growthProgress: number;
  onToggleGrowthDay: (dayId: string) => void;
  onRetry: () => void;
};

export default function ActivitiesTab({communitySession,activities,loading,error,growthDone,growthProgress,onToggleGrowthDay,onRetry}: ActivitiesTabProps) {
  const [attendance, setAttendance] = useState<Record<string, WeeklyActivityAttendanceResponse>>({});
  const loadAttendance = useCallback(async () => {
    const ids = activities.filter((item) => !item.id.startsWith('legacy-')).map((item) => item.id);
    if (!communitySession || !ids.length) { setAttendance({}); return; }
    try { setAttendance(await getYouthWeeklyActivityAttendance(communitySession, ids)); }
    catch { /* La agenda sigue disponible aunque falle la consulta de confirmaciones. */ }
  }, [activities, communitySession]);
  useEffect(() => { void loadAttendance(); }, [loadAttendance]);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const publishedActivities = activities.filter((activity) => activity.date >= key(start) && activity.date <= key(end));

  return (
    <div className="youth-tab-page youth-activities-tab">
      <section className="youth-activities">
        <header><div><span>AGENDA DE LA GENERACIÓN</span><h2>Actividades de esta semana</h2></div><CalendarDays size={22}/></header>
        {loading && <SkeletonList />}
        {error && <div className="youth-data-alert" role="alert"><AlertCircle size={17}/><span>{error}</span><button type="button" onClick={onRetry}><RefreshCw size={15}/> Reintentar</button></div>}
        {!loading && publishedActivities.length > 0 && (
          <div className="youth-activities-grid">{publishedActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} communitySession={communitySession} initialResponse={attendance[activity.id]}/>)}</div>
        )}
        {!loading && !error && publishedActivities.length === 0 && (
          <div className="youth-empty-activities"><CalendarDays size={25}/><strong>No hay actividades publicadas por ahora</strong><span>Cuando el equipo publique la agenda, aparecerá aquí al entrar.</span></div>
        )}
      </section>
      <section className="youth-growth-plan">
        <header><div><span>CRECIMIENTO PERSONAL</span><h2>Reto de 7 días</h2><p>Un pequeño paso cada día para crecer en la fe y servir a los demás.</p></div><strong>{growthDone.length}/7</strong></header>
        <div className="youth-growth-progress"><i style={{width:growthProgress + '%'}}/></div>
        <div className="youth-growth-grid">
          {weeklyGrowthPlan.map((item) => {
            const done = growthDone.includes(item.id);
            return <article key={item.id} className={done ? 'is-done' : ''}>
              <div><span>{item.day}</span><b>{item.title}</b><small>{item.reference}</small><p>{item.challenge}</p></div>
              <button type="button" aria-pressed={done} onClick={() => onToggleGrowthDay(item.id)}>{done ? <CheckCircle2 size={16}/> : <Circle size={16}/>} {done ? 'Completado' : 'Marcar leído'}</button>
            </article>;
          })}
        </div>
        <small className="youth-growth-local-note">Tu progreso se guarda solo en este dispositivo y puedes retomarlo cuando vuelvas a entrar.</small>
      </section>
    </div>
  );
}
