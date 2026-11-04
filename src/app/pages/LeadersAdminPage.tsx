import {useEffect, useMemo, useState} from 'react';
import {Users, UserPlus, RefreshCw, Copy, Pencil, UserX, UserCheck, X, Save, LockKeyhole} from 'lucide-react';
import {createLeader, listLeaders, updateLeader, type LeaderRecord} from '../../services/leaders';
import styles from '../styles/LeadersAdminPage.module.css';

const permissionOptions = [
  {id:'members',label:'Jóvenes'},
  {id:'attendance',label:'Asistencia'},
  {id:'followups',label:'Seguimiento'},
  {id:'devotionals',label:'Devocionales'},
  {id:'visitors',label:'Visitantes'},
  {id:'prayers',label:'Peticiones'},
  {id:'events',label:'Agenda y eventos'},
  {id:'checkins',label:'Check-in QR'},
  {id:'turns',label:'Turnos'},
  {id:'reports',label:'Informes'},
  {id:'ranking',label:'Clasificación'},
  {id:'games',label:'Juegos bíblicos'},
  {id:'profile',label:'Perfil público'},
];

type Draft = {name:string;email:string;role:string;groups:string;permissions:string[]};
const emptyDraft: Draft = {name:'',email:'',role:'lider',groups:'',permissions:['members','attendance','followups','devotionals','visitors','events']};
function toGroups(value:string){return value.split(',').map((item)=>item.trim()).filter(Boolean).slice(0,20);}

export default function LeadersAdminPage(){
  const [leaders,setLeaders]=useState<LeaderRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [showCreate,setShowCreate]=useState(false);
  const [editing,setEditing]=useState<LeaderRecord|null>(null);
  const [draft,setDraft]=useState<Draft>(emptyDraft);
  const [setupLink,setSetupLink]=useState('');

  async function refresh(){
    setLoading(true);setError('');
    try{setLeaders(await listLeaders());}
    catch(cause){setError(cause instanceof Error?cause.message:'No se pudo consultar la lista de líderes.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[]);

  const filtered=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase('es');
    if(!term)return leaders;
    return leaders.filter((item)=>[item.name,item.email,item.role,...item.groups].join(' ').toLocaleLowerCase('es').includes(term));
  },[leaders,query]);

  function openCreate(){
    setDraft(emptyDraft);setSetupLink('');setShowCreate(true);setEditing(null);setError('');setNotice('');
  }
  function openEdit(item:LeaderRecord){
    setDraft({name:item.name,email:item.email,role:item.role,groups:item.groups.join(', '),permissions:[...item.permissions]});
    setEditing(item);setShowCreate(false);setError('');setNotice('');
  }
  function togglePermission(id:string){
    setDraft((current)=>({...current,permissions:current.permissions.includes(id)?current.permissions.filter((item)=>item!==id):[...current.permissions,id]}));
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError('');setNotice('');
    try{
      if(editing){
        await updateLeader({uid:editing.id,role:draft.role,groups:toGroups(draft.groups),permissions:draft.permissions,active:editing.active});
        setNotice('Los datos y permisos del líder se actualizaron.');
        setEditing(null);
      }else{
        const result=await createLeader({name:draft.name.trim(),email:draft.email.trim().toLowerCase(),role:draft.role,groups:toGroups(draft.groups),permissions:draft.permissions});
        setSetupLink(result.setupLink);
        setNotice('La cuenta fue creada. Copia y entrega el enlace de activación al nuevo líder.');
      }
      await refresh();
      if(editing){setShowCreate(false);} 
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la operación.');}
    finally{setSaving(false);}
  }
  async function toggleAccess(item:LeaderRecord){
    const action=item.active?'suspender':'restaurar';
    if(!window.confirm(`¿Deseas ${action} el acceso de ${item.name}? ${item.active?'Podrá restaurarse después.':'La cuenta volverá a estar habilitada.'}`))return;
    setSaving(true);setError('');setNotice('');
    try{
      await updateLeader({uid:item.id,role:item.role,groups:item.groups,permissions:item.permissions,active:!item.active});
      setNotice(item.active?'Acceso suspendido. La cuenta y su historial se conservaron.':'Acceso restaurado.');
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cambiar el acceso.');}
    finally{setSaving(false);}
  }
  async function copyLink(){
    try{await navigator.clipboard.writeText(setupLink);setNotice('Enlace copiado. Envíalo únicamente al correo del nuevo líder.');}
    catch{setError('No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.');}
  }

  return (
    <main className={styles.scope}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}><Users size={25}/></div>
        <div><span>CONTROL DE ACCESOS</span><h1>Líderes y permisos</h1><p>Invita responsables, organiza grupos y limita el acceso a los módulos necesarios.</p></div>
        <button type="button" onClick={openCreate}><UserPlus size={17}/> Agregar líder</button>
      </header>
      <div className={styles.summary}>
        <article><span>CUENTAS</span><strong>{leaders.length}</strong></article>
        <article><span>ACTIVAS</span><strong>{leaders.filter((item)=>item.active).length}</strong></article>
        <article><span>SUSPENDIDAS</span><strong>{leaders.filter((item)=>!item.active).length}</strong></article>
      </div>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      {notice&&<p className={styles.notice} role="status">{notice}</p>}
      {setupLink&&<section className={styles.inviteLink}><div><b>Enlace de activación</b><p>Este enlace permite establecer la contraseña de la cuenta nueva. No lo publiques en grupos ni lo compartas con otras personas.</p><input readOnly value={setupLink} aria-label="Enlace de activación"/></div><button type="button" onClick={()=>void copyLink()}><Copy size={16}/> Copiar enlace</button></section>}
      <section className={styles.listPanel}>
        <div className={styles.listHeader}><div><h2>Directorio de líderes</h2><p>La cuenta se suspende de forma reversible; no se borran sus registros históricos.</p></div><button type="button" className={styles.refresh} onClick={()=>void refresh()} disabled={loading}><RefreshCw size={16}/></button></div>
        <label className={styles.search}>Buscar por nombre, correo o grupo<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar líder..."/></label>
        {loading?<div className={styles.empty}>Cargando cuentas...</div>:filtered.length===0?<div className={styles.empty}><Users size={26}/><b>No hay líderes para mostrar</b><span>Verifica la conexión o agrega la primera cuenta.</span></div>:(
          <div className={styles.rows}>{filtered.map((item)=>(
            <article className={styles.row} key={item.id}>
              <div className={styles.avatar}>{item.name.trim().slice(0,1).toUpperCase()||'L'}</div>
              <div className={styles.identity}><b>{item.name||'Líder sin nombre'}</b><span>{item.email||item.user||'Sin correo'}</span><small>{item.groups.length?item.groups.join(' · '):'Sin grupo asignado'}</small></div>
              <span className={styles.role}>{item.role}</span>
              <span className={item.active?styles.active:styles.inactive}>{item.active?'Activo':'Suspendido'}</span>
              <div className={styles.actions}><button type="button" onClick={()=>openEdit(item)} aria-label={`Editar ${item.name}`}><Pencil size={16}/></button><button type="button" onClick={()=>void toggleAccess(item)} disabled={saving} aria-label={item.active?'Suspender acceso':'Restaurar acceso'} title={item.active?'Suspender acceso':'Restaurar acceso'}>{item.active?<UserX size={16}/>:<UserCheck size={16}/>}</button></div>
            </article>
          ))}</div>
        )}
      </section>
      {(showCreate||editing)&&(
        <div className={styles.backdrop} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving){setShowCreate(false);setEditing(null);}}}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="leader-modal-title">
            <header><div><span>GESTIÓN AVANZADA</span><h2 id="leader-modal-title">{editing?'Editar líder y permisos':'Crear cuenta de líder'}</h2></div><button type="button" onClick={()=>{setShowCreate(false);setEditing(null);}} disabled={saving} aria-label="Cerrar"><X size={19}/></button></header>
            <form onSubmit={(event)=>void submit(event)}>
              <label>Nombre completo<input value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})} required minLength={2} maxLength={100} disabled={Boolean(editing)}/></label>
              <label>Correo electrónico<input type="email" value={draft.email} onChange={(event)=>setDraft({...draft,email:event.target.value})} required disabled={Boolean(editing)}/></label>
              <label>Rol<select value={draft.role} onChange={(event)=>setDraft({...draft,role:event.target.value})}><option value="lider">Líder</option><option value="pastor">Pastor</option><option value="administrador">Administrador</option></select></label>
              <label>Grupos asignados<input value={draft.groups} onChange={(event)=>setDraft({...draft,groups:event.target.value})} placeholder="Ej. Jóvenes mayores, Alabanza"/></label>
              <fieldset><legend>Permisos por módulo</legend><div className={styles.permissionGrid}>{permissionOptions.map((permission)=><label key={permission.id}><input type="checkbox" checked={draft.permissions.includes(permission.id)} onChange={()=>togglePermission(permission.id)}/><span>{permission.label}</span></label>)}</div></fieldset>
              <p className={styles.securityHint}><LockKeyhole size={15}/> Los permisos de administración general no se otorgan desde este formulario. Las operaciones se validan en el servidor.</p>
              {error&&<p className={styles.error} role="alert">{error}</p>}
              <footer><button type="button" onClick={()=>{setShowCreate(false);setEditing(null);}} disabled={saving}>Cancelar</button><button type="submit" disabled={saving||draft.permissions.length===0}><Save size={16}/>{saving?'Guardando...':editing?'Guardar cambios':'Crear cuenta y generar invitación'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
