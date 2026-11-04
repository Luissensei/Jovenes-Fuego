import styles from './styles/DashboardPage.module.css';
import {useEffect,useMemo,useState} from 'react';
import {NavLink} from 'react-router-dom';
import {
  ArrowUpRight, CalendarDays, Users, Flame, Trophy, BookOpen,
  ClipboardCheck, Sparkles, ShieldCheck, Clock3, MapPin,
  ArrowRight, RefreshCw, LayoutDashboard, UserRound,
} from 'lucide-react';
import {useAuth} from './AuthContext';
import {getPublicRankingMetrics,type PublicRankingMetric} from '../services/publicProfiles';
import {getWeeklyActivities,type WeeklyActivity} from '../services/youthPortal';
import {firebaseProjectId,firebaseReadOnlyMode} from '../services/firebase/client';

const shortcuts=[
  {label:'Jóvenes',detail:'Directorio y perfiles',path:'/jovenes',icon:Users},
  {label:'Asistencia',detail:'Registro de servicios',path:'/asistencia',icon:ClipboardCheck},
  {label:'Agenda',detail:'Actividades y eventos',path:'/eventos',icon:CalendarDays},
  {label:'Devocionales',detail:'Contenido de crecimiento',path:'/devocionales',icon:BookOpen},
  {label:'Líderes',detail:'Roles y permisos',path:'/lideres',icon:ShieldCheck,adminOnly:true},
];
function localDateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}

export default function DashboardPage(){
  const {profile,user,configured}=useAuth();
  const role=String(profile?.role??'').toLowerCase();
  const isAdmin=['admin','administrador'].includes(role);
  const firstName=String(profile?.name??user?.email?.split('@')[0]??'equipo').trim().split(/\s+/)[0]||'equipo';
  const [people,setPeople]=useState<PublicRankingMetric[]>([]);
  const [activities,setActivities]=useState<WeeklyActivity[]>([]);
  const [loading,setLoading]=useState(configured);
  const [error,setError]=useState('');
  const [refreshKey,setRefreshKey]=useState(0);

  useEffect(()=>{
    if(!configured){setPeople([]);setActivities([]);setLoading(false);return;}
    let active=true;
    setLoading(true);setError('');
    Promise.allSettled([getPublicRankingMetrics(),getWeeklyActivities()]).then((results)=>{
      if(!active)return;
      if(results[0].status==='fulfilled')setPeople(results[0].value);
      else setError('No se pudieron consultar los perfiles y puntos públicos.');
      if(results[1].status==='fulfilled')setActivities(results[1].value);
      else setError((old)=>old||'No se pudo consultar la agenda publicada.');
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[configured,refreshKey]);

  const ranked=useMemo(()=>[...people].sort((a,b)=>(b.points??0)-(a.points??0)||a.name.localeCompare(b.name,'es')),[people]);
  const totalPoints=people.reduce((sum,item)=>sum+(item.points??0),0);
  const today=localDateKey(new Date());
  const upcoming=useMemo(()=>activities.filter((item)=>item.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')).slice(0,4),[activities,today]);
  const availableShortcuts=shortcuts.filter((item)=>!item.adminOnly||isAdmin);

  return(
    <main className={styles.scope}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span className={styles.liveDot}/> CENTRO DE CONTROL <span className={styles.eyebrowDivider}>/</span> JÓVENES DE FUEGO</div>
          <p className={styles.overline}>FE · COMUNIDAD · PROPÓSITO</p>
          <h1>Una comunidad que<br/><em>mantiene la llama viva.</em></h1>
          <p className={styles.intro}>Bienvenido, {firstName}. Aquí tienes lo importante para acompañar, organizar y activar a nuestra generación.</p>
          <div className={styles.heroActions}>
            {isAdmin&&<NavLink to="/asistente" className={styles.goldButton}><Sparkles size={17}/> Abrir Fuego AI <ArrowUpRight size={15}/></NavLink>}
            <NavLink to="/eventos" className={styles.quietButton}>Organizar actividades <ArrowUpRight size={15}/></NavLink>
          </div>
        </div>
        <div className={styles.heroSeal} aria-hidden="true">
          <div className={styles.sealOrbit}/><div className={styles.sealInner}><Flame size={76} strokeWidth={1.2}/></div>
          <span className={styles.sealTop}>ALFA Y OMEGA</span><span className={styles.sealBottom}>BUILT ON FAITH</span>
        </div>
        <div className={styles.heroFoot}><span><ShieldCheck size={14}/> {configured?(firebaseReadOnlyMode?'ORIGINAL · SOLO LECTURA':`STAGING · ${firebaseProjectId}`):'VISTA PREVIA'}</span><span>GESTIÓN · CRECIMIENTO · SERVICIO</span></div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>PANORAMA DE LA COMUNIDAD</span><h2>Lo que está pasando</h2><p>Información pública disponible en el sistema.</p></div><button type="button" onClick={()=>setRefreshKey((value)=>value+1)} disabled={!configured||loading}><RefreshCw size={15} className={loading?styles.spinning:''}/> Actualizar</button></div>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <div className={styles.metrics}>
          <article><span className={styles.metricIcon}><Users size={18}/></span><div><small>PERFILES PUBLICADOS</small><strong>{loading?'…':configured?people.length:'—'}</strong><span>Visibles en la clasificación</span></div></article>
          <article><span className={styles.metricIcon}><Flame size={18}/></span><div><small>PUNTOS PUBLICADOS</small><strong>{loading?'…':configured?totalPoints.toLocaleString('es-CO'):'—'}</strong><span>Suma del ranking público</span></div></article>
          <article><span className={styles.metricIcon}><Trophy size={18}/></span><div><small>PRIMER LUGAR</small><strong className={styles.metricName}>{loading?'…':ranked[0]?.name||'—'}</strong><span>{ranked[0]?(`${ranked[0].points??0} puntos`):'Sin datos publicados'}</span></div></article>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>AGENDA</span><h2>Próximas actividades</h2></div><NavLink to="/eventos">Ver agenda <ArrowRight size={14}/></NavLink></div>
          {upcoming.length?upcoming.map((item)=>(
            <article className={styles.eventRow} key={item.id}>
              <div className={styles.dateTile}><strong>{item.date.slice(8,10)}</strong><span>{new Date(item.date+'T12:00:00').toLocaleDateString('es-CO',{month:'short'}).toUpperCase()}</span></div>
              <div className={styles.eventInfo}><b>{item.title}</b><p>{item.description||'Actividad de Jóvenes de Fuego'}</p><span>{item.time&&<><Clock3 size={13}/>{item.time}</>}{item.location&&<><MapPin size={13}/>{item.location}</>}</span></div>
            </article>
          )):<div className={styles.empty}><CalendarDays size={25}/><b>{loading?'Consultando la agenda...':'No hay próximas actividades publicadas'}</b><span>Las actividades aparecerán aquí cuando estén disponibles.</span></div>}
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.kicker}>ACCESOS DIRECTOS</span><h2>Ir a un módulo</h2></div><LayoutDashboard size={19}/></div>
          <div className={styles.shortcuts}>
            {availableShortcuts.map((item)=>{const Icon=item.icon;return <NavLink to={item.path} key={item.path}><span><Icon size={17}/></span><div><b>{item.label}</b><small>{item.detail}</small></div><ArrowUpRight size={15}/></NavLink>;})}
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.aiCard}>
          <div className={styles.aiOrb}><Sparkles size={23}/></div>
          <div><span className={styles.kicker}>ASISTENTE INTELIGENTE</span><h2>Fuego AI</h2><p>Prepara invitaciones, cronogramas, reuniones e informes con ayuda de inteligencia artificial.</p></div>
          {isAdmin?<NavLink to="/asistente">Entrar al asistente <ArrowUpRight size={15}/></NavLink>:<span className={styles.restricted}>Disponible para administración</span>}
        </article>
        <article className={styles.environmentCard}><span className={styles.kicker}>ENTORNO Y PROTECCIÓN</span><div><ShieldCheck size={19}/><b>{firebaseReadOnlyMode?'Base original protegida':'Entorno de trabajo'}</b></div><p>{configured?(firebaseReadOnlyMode?'Las operaciones de escritura están bloqueadas en producción.':'Los cambios de prueba se limitan a Firebase Staging.'):'Vista previa sin conexión a Firebase.'}</p><small><UserRound size={13}/> Sesión: {String(profile?.name??user?.email??'sin identificar')}</small></article>
      </section>
    </main>
  );
}
