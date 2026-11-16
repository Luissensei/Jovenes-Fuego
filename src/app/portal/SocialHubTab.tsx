import {useCallback,useEffect,useState} from "react";
import {Bell,Compass,Users,MessageCircle,Plus,Send,ShieldBan,UserPlus,UserCheck,RefreshCw,Clock3} from "lucide-react";
import {getYouthSocialHub,toggleYouthCommunityFollow,toggleYouthCommunityBlock,createYouthCommunityStory,createYouthCommunityGroup,toggleYouthCommunityGroupMembership,getYouthCommunityDirectMessages,sendYouthCommunityDirectMessage,getYouthCommunityGroupMessages,sendYouthCommunityGroupMessage,markYouthCommunityNotificationsRead,type YouthSocialHub,type YouthSocialProfile,type YouthSocialGroup,type YouthSocialGroupMessage} from "../../services/youthPortal";
import styles from "../styles/SocialHubTab.module.css";
type Props={communitySession:string;memberName:string};
type Section="discover"|"stories"|"groups"|"messages"|"notifications";
type DirectMessage={id:string;senderId:string;content:string;createdAt:string};
export default function SocialHubTab({communitySession,memberName}:Props){
 const [section,setSection]=useState<Section>("discover");
 const [hub,setHub]=useState<YouthSocialHub>({profiles:[],groups:[],stories:[],notifications:[]});
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [busy,setBusy]=useState("");
 const [story,setStory]=useState("");const [groupName,setGroupName]=useState("");const [groupDescription,setGroupDescription]=useState("");
 const [selected,setSelected]=useState<YouthSocialProfile|null>(null);const [messages,setMessages]=useState<DirectMessage[]>([]);
 const [draft,setDraft]=useState("");const [messageLoading,setMessageLoading]=useState(false);
 const [activeGroup,setActiveGroup]=useState<YouthSocialGroup|null>(null);
 const [groupMessages,setGroupMessages]=useState<YouthSocialGroupMessage[]>([]);
 const [groupDraft,setGroupDraft]=useState("");
 const [groupLoading,setGroupLoading]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError("");try{setHub(await getYouthSocialHub(communitySession));}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo cargar la red social.");}finally{setLoading(false);}},[communitySession]);
 useEffect(()=>{void load();},[load]);
 async function follow(profile:YouthSocialProfile){setBusy(profile.id);setError("");try{await toggleYouthCommunityFollow(communitySession,profile.id);await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo actualizar el seguimiento.");}finally{setBusy("");}}
 async function block(profile:YouthSocialProfile){if(!window.confirm("¿Bloquear este perfil? Dejarán de ver e interactuar con sus contenidos."))return;setBusy(profile.id);setError("");try{await toggleYouthCommunityBlock(communitySession,profile.id);if(selected?.id===profile.id)setSelected(null);await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo bloquear el perfil.");}finally{setBusy("");}}
 async function publishStory(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(story.trim().length<2||busy)return;setBusy("story");setError("");try{await createYouthCommunityStory(communitySession,story.trim());setStory("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo publicar la historia.");}finally{setBusy("");}}
 async function createGroup(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(groupName.trim().length<3||busy)return;setBusy("group");setError("");try{await createYouthCommunityGroup(communitySession,groupName.trim(),groupDescription.trim());setGroupName("");setGroupDescription("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo crear el grupo.");}finally{setBusy("");}}
 async function joinGroup(groupId:string){setBusy(groupId);setError("");try{await toggleYouthCommunityGroupMembership(communitySession,groupId);await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo actualizar el grupo.");}finally{setBusy("");}}
 async function openMessages(profile:YouthSocialProfile){setSelected(profile);setSection("messages");setMessageLoading(true);setError("");try{setMessages(await getYouthCommunityDirectMessages(communitySession,profile.id));}catch(cause){setMessages([]);setError(cause instanceof Error?cause.message:"No se pudo abrir la conversación.");}finally{setMessageLoading(false);}}
 async function sendMessage(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selected||!draft.trim()||busy)return;setBusy("message");setError("");try{await sendYouthCommunityDirectMessage(communitySession,selected.id,draft.trim());setDraft("");setMessages(await getYouthCommunityDirectMessages(communitySession,selected.id));}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo enviar el mensaje.");}finally{setBusy("");}}
 async function openGroupChat(group:YouthSocialGroup){
  if(!group.joined)return;
  setActiveGroup(group);setGroupLoading(true);setError("");
  try{setGroupMessages(await getYouthCommunityGroupMessages(communitySession,group.id));}
  catch(cause){setGroupMessages([]);setError(cause instanceof Error?cause.message:"No se pudo abrir el chat del grupo.");}
  finally{setGroupLoading(false);}
 }
 async function sendGroupChatMessage(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!activeGroup||!groupDraft.trim()||busy)return;
  setBusy("group-message");setError("");
  try{
   await sendYouthCommunityGroupMessage(communitySession,activeGroup.id,groupDraft.trim());
   setGroupDraft("");
   setGroupMessages(await getYouthCommunityGroupMessages(communitySession,activeGroup.id));
  }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo enviar el mensaje al grupo.");}
  finally{setBusy("");}
 }
 async function markNotifications(){const unread=hub.notifications.filter(item=>!item.read).map(item=>item.id);if(!unread.length)return;setBusy("notifications");try{await markYouthCommunityNotificationsRead(communitySession,unread);setHub(current=>({...current,notifications:current.notifications.map(item=>({...item,read:true}))}));}catch(cause){setError(cause instanceof Error?cause.message:"No se pudieron actualizar las notificaciones.");}finally{setBusy("");}}
 const unreadCount=hub.notifications.filter(item=>!item.read).length;
 return <section className={styles.root}>
  <header className={styles.header}><div><span className={styles.eyebrow}>JÓVENES DE FUEGO · RED SOCIAL</span><h2>Conecta, comparte y crece</h2><p>Una comunidad para acompañarnos y edificarnos en la fe.</p></div><button className={styles.refresh} type="button" onClick={()=>void load()} disabled={loading} aria-label="Actualizar red social"><RefreshCw size={17}/></button></header>
  <nav className={styles.nav} aria-label="Secciones de la red social">
   <button className={section==="discover"?styles.active:""} onClick={()=>setSection("discover")}><Compass size={16}/>Descubrir</button>
   <button className={section==="stories"?styles.active:""} onClick={()=>setSection("stories")}><Clock3 size={16}/>Historias</button>
   <button className={section==="groups"?styles.active:""} onClick={()=>setSection("groups")}><Users size={16}/>Grupos</button>
   <button className={section==="messages"?styles.active:""} onClick={()=>setSection("messages")}><MessageCircle size={16}/>Mensajes</button>
   <button className={section==="notifications"?styles.active:""} onClick={()=>{setSection("notifications");void markNotifications();}}><Bell size={16}/>Avisos{unreadCount>0&&<i>{unreadCount>9?"9+":unreadCount}</i>}</button>
  </nav>
  {error&&<div className={styles.error} role="alert">{error}</div>}
  {loading?<div className={styles.loading}>Cargando tu comunidad...</div>:<>
   {section==="discover"&&<div className={styles.panel}><div className={styles.sectionTitle}><div><h3>Conoce a otros jóvenes</h3><p>Perfiles públicos disponibles en la comunidad.</p></div><span>{hub.profiles.length} perfiles</span></div>
    {hub.profiles.length===0?<p className={styles.empty}>Todavía no hay perfiles para descubrir.</p>:<div className={styles.profileGrid}>{hub.profiles.map(profile=><article className={styles.profile} key={profile.id}>{profile.avatarUrl?<img className={styles.avatarImage} src={profile.avatarUrl} alt="" loading="lazy"/>:<div className={styles.avatar}>{profile.name.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}</div>}<h4>{profile.name}</h4>{profile.nickname&&<small>@{profile.nickname}</small>}{profile.bio&&<p>{profile.bio}</p>}<div className={styles.actions}><button type="button" onClick={()=>void follow(profile)} disabled={busy===profile.id||profile.blocked}>{profile.following?<UserCheck size={14}/>:<UserPlus size={14} />}{profile.following?"Siguiendo":"Seguir"}</button><button type="button" onClick={()=>void openMessages(profile)}><MessageCircle size={14}/>Mensaje</button></div><button className={styles.block} type="button" onClick={()=>void block(profile)} disabled={busy===profile.id}><ShieldBan size={13}/>{profile.blocked?"Desbloquear":"Bloquear"}</button></article>)}</div>}
   </div>}
   {section==="stories"&&<div className={styles.panel}><div className={styles.sectionTitle}><div><h3>Historias de la comunidad</h3><p>Las historias de texto desaparecen automáticamente después de 24 horas.</p></div><span>{hub.stories.length} activas</span></div>
    <form className={styles.form} onSubmit={publishStory}><label htmlFor="jdf-story">Comparte algo breve, {memberName.split(" ")[0]}</label><textarea id="jdf-story" value={story} onChange={e=>setStory(e.target.value)} maxLength={500} rows={3} placeholder="Una reflexión, una oración o algo por lo que estás agradecido..."/><div><small>{story.length}/500</small><button type="submit" disabled={busy==="story"||story.trim().length<2}><Plus size={15}/>Publicar historia</button></div></form>
    <div className={styles.storyGrid}>{hub.stories.map(item=><article className={styles.story} key={item.id}><span>{item.author.slice(0,1).toUpperCase()}</span><b>{item.author}</b><p>{item.content}</p><small>Vence {new Intl.DateTimeFormat("es-CO",{hour:"2-digit",minute:"2-digit"}).format(item.expiresAt)}</small></article>)}</div>{hub.stories.length===0&&<p className={styles.empty}>Todavía no hay historias activas. ¡Publica la primera!</p>}
   </div>}
   {section==="groups"&&<div className={styles.panel}><div className={styles.sectionTitle}><div><h3>Grupos y ministerios</h3><p>Organízate alrededor de intereses, oración y servicio.</p></div><span>{hub.groups.length} grupos</span></div>
    <form className={styles.form} onSubmit={createGroup}><label htmlFor="jdf-group-name">Crear un grupo</label><input id="jdf-group-name" value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={80} placeholder="Ej. Jóvenes de oración" required minLength={3}/><textarea value={groupDescription} onChange={e=>setGroupDescription(e.target.value)} maxLength={240} rows={2} placeholder="Describe el propósito del grupo (opcional)"/><div><small>{groupDescription.length}/240</small><button type="submit" disabled={busy==="group"||groupName.trim().length<3}><Plus size={15}/>Crear grupo</button></div></form>
    <div className={styles.groupList}>{hub.groups.map(group=><article className={styles.group} key={group.id}><span><Users size={19}/></span><div><b>{group.name}</b><p>{group.description||"Comunidad de Jóvenes de Fuego"}</p><small>{group.memberCount} integrantes</small></div><button type="button" onClick={()=>void joinGroup(group.id)} disabled={busy===group.id}>{group.joined?<UserCheck size={14}/>:<Plus size={14} />}{group.joined?"Salir":"Unirme"}</button>{group.joined&&<button type="button" onClick={()=>void openGroupChat(group)}>Chat</button>}</article>)}</div>{hub.groups.length===0&&<p className={styles.empty}>Aún no existen grupos. Crea el primero.</p>}
    {activeGroup&&<div className={styles.conversation}><header><button type="button" onClick={()=>{setActiveGroup(null);setGroupMessages([]);}}>← Grupos</button><b>{activeGroup.name}</b></header><div className={styles.messageList}>{groupLoading?"Cargando mensajes...":groupMessages.map(message=><article className={message.senderId===communitySession?styles.sent:styles.received} key={message.id}><b>{message.author}</b><p>{message.content}</p><small>{new Intl.DateTimeFormat("es-CO",{hour:"2-digit",minute:"2-digit"}).format(new Date(message.createdAt))}</small></article>)}</div><form className={styles.messageForm} onSubmit={sendGroupChatMessage}><input value={groupDraft} onChange={e=>setGroupDraft(e.target.value)} maxLength={1000} placeholder="Escribe al grupo..." aria-label="Mensaje al grupo"/><button type="submit" disabled={busy==="group-message"||!groupDraft.trim()}><Send size={16}/></button></form></div>}
   </div>}
   {section==="messages"&&<div className={styles.panel}><div className={styles.sectionTitle}><div><h3>Mensajes privados</h3><p>Conversaciones individuales protegidas por controles de bloqueo.</p></div></div>
    {!selected?<div className={styles.profileGrid}>{hub.profiles.map(profile=><button className={styles.messageChoice} type="button" key={profile.id} onClick={()=>void openMessages(profile)}><span className={styles.avatar}>{profile.name.slice(0,1)}</span><b>{profile.name}</b><small>Iniciar conversación</small></button>)}</div>:<div className={styles.conversation}><header><button type="button" onClick={()=>setSelected(null)}>← Contactos</button><b>{selected.name}</b></header><div className={styles.messageList}>{messageLoading?"Cargando mensajes...":messages.map(message=><article className={message.senderId===selected.id?styles.received:styles.sent} key={message.id}><p>{message.content}</p><small>{new Intl.DateTimeFormat("es-CO",{hour:"2-digit",minute:"2-digit"}).format(new Date(message.createdAt))}</small></article>)}</div><form className={styles.messageForm} onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} placeholder="Escribe un mensaje..." aria-label="Mensaje privado"/><button type="submit" disabled={busy==="message"||!draft.trim()}><Send size={16}/></button></form></div>}
   </div>}
   {section==="notifications"&&<div className={styles.panel}><div className={styles.sectionTitle}><div><h3>Notificaciones</h3><p>Actividad y mensajes relacionados con tu comunidad.</p></div><span>{unreadCount} sin leer</span></div>{hub.notifications.length===0?<p className={styles.empty}>No tienes notificaciones todavía.</p>:<div className={styles.notifications}>{hub.notifications.map(item=><article className={!item.read?styles.unread:""} key={item.id}><Bell size={16}/><div><p>{item.message}</p><small>{item.createdAt}</small></div></article>)}</div>}</div>}
  </>}
  <footer className={styles.privacy}><ShieldBan size={15}/> Puedes bloquear perfiles y reportar contenido. No compartas contraseñas, PIN ni información privada.</footer>
 </section>;
}
