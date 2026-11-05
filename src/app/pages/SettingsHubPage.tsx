import styles from '../styles/SettingsHubPage.module.css';
import {NavLink} from 'react-router-dom';
import {firebaseProjectId,firebaseReadOnlyMode} from '../../services/firebase/client';
import ManagementPage from './ManagementPages';
import {
  Users, ShieldCheck, CalendarDays, BookOpen, ClipboardList,
  Sparkles, Palette, ChevronRight, LockKeyhole,
} from 'lucide-react';

const areas=[
  {title:'Líderes y permisos',description:'Invitar responsables, asignar roles, grupos y accesos por módulo.',path:'/lideres',icon:Users,tag:'ACCESO'},
  {title:'Agenda y servicios',description:'Organizar reuniones, cultos, encuentros y actividades juveniles.',path:'/eventos',icon:CalendarDays,tag:'AGENDA'},
  {title:'Devocionales',description:'Publicar contenido de crecimiento espiritual y organizar su revisión.',path:'/devocionales',icon:BookOpen,tag:'CONTENIDO'},
  {title:'Auditoría',description:'Consultar el historial disponible de cambios administrativos.',path:'/auditoria',icon:ClipboardList,tag:'SEGURIDAD'},
  {title:'Fuego AI',description:'Abrir el asistente de planificación y apoyo administrativo.',path:'/asistente',icon:Sparkles,tag:'ASISTENTE'},
];

export default function SettingsHubPage(){
  return(
    <main className={styles.scope}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}><Palette size={25}/></div>
        <div><span>CONTROL DE LA PLATAFORMA</span><h1>Configuración</h1><p>Administra accesos, contenido y preferencias de Jóvenes de Fuego desde un solo lugar.</p></div>
      </header>
      <section className={styles.themeCard}>
        <div className={styles.themeIcon}><Palette size={22}/></div>
        <div className={styles.themeCopy}><span>IDENTIDAD VISUAL</span><b>Command Center · Tema único</b><small>Una interfaz oscura, clara y consistente en administración y portal juvenil. La personalización de perfiles no cambia el tema general de la aplicación.</small></div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionTitle}><span>HERRAMIENTAS DE ADMINISTRACIÓN</span><h2>Áreas de configuración</h2><p>Entra directamente en la función que necesitas.</p></div>
        <div className={styles.areaGrid}>
          {areas.map((area)=>{const Icon=area.icon;return <NavLink to={area.path} key={area.path} className={styles.areaCard}><span className={styles.areaIcon}><Icon size={20}/></span><span className={styles.areaTag}>{area.tag}</span><b>{area.title}</b><small>{area.description}</small><span className={styles.areaGo}>Abrir módulo <ChevronRight size={15}/></span></NavLink>;})}
        </div>
      </section>
      <section className={styles.security}>
        <div><LockKeyhole size={19}/><div><b>{firebaseReadOnlyMode?'Firebase original · solo lectura':'Firebase original conectado'}</b><small>{firebaseReadOnlyMode?'Las operaciones de escritura permanecen bloqueadas mientras se revisan los permisos y las reglas.':'Proyecto vinculado: las operaciones siguen sujetas a los permisos de Firebase.'}</small></div></div>
        <code>{firebaseProjectId}</code>
      </section>
      <details className={styles.advanced}>
        <summary><ShieldCheck size={17}/> Ajustes generales adicionales</summary>
        <p>Estos valores se mantienen separados de la gestión de cuentas y se guardan en la configuración de la aplicación.</p>
        <ManagementPage kind="settings"/>
      </details>
    </main>
  );
}
