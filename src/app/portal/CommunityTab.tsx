import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {BookOpen,Heart,Link2,MessageCircle,Music2,RefreshCw,Send,Sparkles,Users,Quote,Flag,ShieldCheck,Clock3,Bell,UserPlus,UserCheck,Trash2,Search,UsersRound} from "lucide-react";
import {
  createYouthCommunityComment,createYouthCommunityPost,getYouthCommunityFeed,getYouthCommunityChat,getYouthCommunityAnnouncements,reportYouthCommunityChatMessage,reportYouthCommunityPost,sendYouthCommunityChatMessage,toggleYouthCommunityReaction,toggleYouthCommunityFollow,deleteYouthCommunityPost,
  type YouthCommunityPost,type YouthCommunityPostInput,type YouthCommunityChatMessage,type YouthCommunityAnnouncement,type YouthCommunityFeedMode,
} from "../../services/youthPortal";

type Props={memberName:string;communitySession:string};

const postKinds=[
  {value:"text",label:"Mensaje",icon:MessageCircle,placeholder:"¿Qué quieres compartir con la comunidad?"},
  {value:"verse",label:"Versículo",icon:BookOpen,placeholder:"Comparte el versículo y lo que significa para ti..."},
  {value:"song",label:"Canción",icon:Music2,placeholder:"¿Por qué esta canción te inspira?"},
  {value:"testimony",label:"Testimonio",icon:Sparkles,placeholder:"Cuéntanos algo bueno que Dios ha hecho..."},
] as const;

function formatDate(value:string){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Ahora";
  return new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(date);
}

export default function CommunityTab({memberName,communitySession}:Props){
  const [posts,setPosts]=useState<YouthCommunityPost[]>([]);
  const [feedMode,setFeedMode]=useState<YouthCommunityFeedMode>("all");
  const [followingIds,setFollowingIds]=useState<string[]>([]);
  const [followingCount,setFollowingCount]=useState(0);
  const [followerCount,setFollowerCount]=useState(0);
  const [feedSearch,setFeedSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const [kind,setKind]=useState<YouthCommunityPostInput["type"]>("text");
  const [content,setContent]=useState("");
  const [reference,setReference]=useState("");
  const [linkUrl,setLinkUrl]=useState("");
  const [publishing,setPublishing]=useState(false);
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
  const [busyPost,setBusyPost]=useState("");
  const [reportedPosts,setReportedPosts]=useState<string[]>([]);
  const chatRequestRef=useRef(false);
  const [chatMessages,setChatMessages]=useState<YouthCommunityChatMessage[]>([]);
  const [chatDraft,setChatDraft]=useState("");
  const [chatLoading,setChatLoading]=useState(true);
  const [chatSending,setChatSending]=useState(false);
  const [chatError,setChatError]=useState("");
  const [reportedChatMessages,setReportedChatMessages]=useState<string[]>([]);
  const [announcements,setAnnouncements]=useState<YouthCommunityAnnouncement[]>([]);
  const [announcementsLoading,setAnnouncementsLoading]=useState(true);
  const [announcementsError,setAnnouncementsError]=useState("");

  const load=useCallback(async(showRefresh=false)=>{
    if(showRefresh)setRefreshing(true);else setLoading(true);
    setError("");
    try{
      const result=await getYouthCommunityFeed(communitySession,feedMode);
      setPosts(result.posts);
      setFollowingIds(result.followingIds);
      setFollowingCount(result.followingCount);
      setFollowerCount(result.followerCount);
    }
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo cargar la comunidad.");}
    finally{setLoading(false);setRefreshing(false);}
  },[communitySession,feedMode]);

  useEffect(()=>{void load();},[load]);

  const loadAnnouncements=useCallback(async()=>{
    try{setAnnouncements(await getYouthCommunityAnnouncements(communitySession));setAnnouncementsError("");}
    catch(cause){setAnnouncementsError(cause instanceof Error?cause.message:"No se pudieron cargar los avisos.");}
    finally{setAnnouncementsLoading(false);}
  },[communitySession]);

  useEffect(()=>{
    void loadAnnouncements();
    const interval=window.setInterval(()=>void loadAnnouncements(),60000);
    return ()=>window.clearInterval(interval);
  },[loadAnnouncements]);

  const loadChat=useCallback(async()=>{
    if(chatRequestRef.current)return;
    chatRequestRef.current=true;
    try{setChatMessages(await getYouthCommunityChat(communitySession));setChatError("");}
    catch(cause){setChatError(cause instanceof Error?cause.message:"No se pudo cargar el chat.");}
    finally{chatRequestRef.current=false;setChatLoading(false);}
  },[communitySession]);

  useEffect(()=>{
    void loadChat();
    const interval=window.setInterval(()=>void loadChat(),30000);
    return ()=>window.clearInterval(interval);
  },[loadChat]);

  async function sendChat(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const message=chatDraft.trim();
    if(!message||chatSending)return;
    setChatSending(true);setChatError("");
    try{
      await sendYouthCommunityChatMessage(communitySession,message);
      setChatDraft("");
      await loadChat();
    }catch(cause){setChatError(cause instanceof Error?cause.message:"No se pudo enviar el mensaje.");}
    finally{setChatSending(false);}
  }

  async function reportChatMessage(messageId:string){
    if(reportedChatMessages.includes(messageId))return;
    const reason=window.prompt("Motivo del reporte: inapropiado, acoso, privacidad, spam u otro.");
    if(!reason)return;
    const reasons:Record<string,"inappropriate"|"bullying"|"privacy"|"spam"|"other">={
      "inapropiado":"inappropriate","acoso":"bullying","privacidad":"privacy","spam":"spam","otro":"other",
    };
    const selected=reasons[reason.trim().toLowerCase()];
    if(!selected){setChatError("Escribe: inapropiado, acoso, privacidad, spam u otro.");return;}
    try{
      await reportYouthCommunityChatMessage(communitySession,messageId,selected);
      setReportedChatMessages(current=>[...current,messageId]);
    }catch(cause){setChatError(cause instanceof Error?cause.message:"No se pudo reportar el mensaje.");}
  }



  async function publish(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(publishing||content.trim().length<2)return;
    setPublishing(true);setError("");
    try{
      await createYouthCommunityPost(communitySession,{
        type:kind,content:content.trim(),
        ...(kind==="verse"?{reference:reference.trim()}:{}),
        ...(kind==="song"&&linkUrl.trim()?{linkUrl:linkUrl.trim()}:{}),
      });
      setContent("");setReference("");setLinkUrl("");
      await load(true);
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo publicar.");}
    finally{setPublishing(false);}
  }

  async function comment(postId:string){
    const message=(commentDrafts[postId]??"").trim();
    if(!message||busyPost)return;
    setBusyPost(postId);setError("");
    try{
      await createYouthCommunityComment(communitySession,postId,message);
      setCommentDrafts(current=>({...current,[postId]:""}));
      await load(true);
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo comentar.");}
    finally{setBusyPost("");}
  }

  async function react(postId:string){
    if(busyPost)return;
    setBusyPost(postId);
    try{
      const reacted=await toggleYouthCommunityReaction(communitySession,postId);
      setPosts(current=>current.map(post=>post.id===postId?{...post,reactedByMe:reacted,reactionCount:Math.max(0,post.reactionCount+(reacted?1:-1))}:post));
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo reaccionar.");}
    finally{setBusyPost("");}
  }

  async function report(postId:string){
    if(reportedPosts.includes(postId)||busyPost)return;
    const reason=window.prompt("¿Por qué deseas reportar esta publicación? Escribe: inapropiado, acoso, privacidad, spam u otro.");
    if(!reason)return;
    const normalized=reason.trim().toLowerCase();
    const reasons:Record<string,"inappropriate"|"bullying"|"privacy"|"spam"|"other">={
      "inapropiado":"inappropriate","acoso":"bullying","privacidad":"privacy","spam":"spam","otro":"other","otro motivo":"other",
    };
    const selected=reasons[normalized];
    if(!selected){setError("Selecciona: inapropiado, acoso, privacidad, spam u otro.");return;}
    setBusyPost(postId);setError("");
    try{
      await reportYouthCommunityPost(communitySession,postId,selected);
      setReportedPosts(current=>[...current,postId]);
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo enviar el reporte.");}
    finally{setBusyPost("");}
  }

  async function toggleFollow(post:YouthCommunityPost){
    if(busyPost||post.isMine)return;
    const actionKey=`follow:${post.memberId}`;
    setBusyPost(actionKey);
    try{
      const followed=await toggleYouthCommunityFollow(communitySession,post.memberId);
      setFollowingIds(current=>followed
        ? [...new Set([...current,post.memberId])]
        : current.filter(id=>id!==post.memberId));
      setFollowingCount(current=>Math.max(0,current+(followed?1:-1)));
      setPosts(current=>feedMode==="following"&&!followed
        ? current.filter(item=>item.memberId!==post.memberId)
        : current.map(item=>item.memberId===post.memberId?{...item,followingAuthor:followed}:item));
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo actualizar el seguimiento.");}
    finally{setBusyPost("");}
  }

  async function removeOwnPost(postId:string){
    if(busyPost||!window.confirm("¿Quieres retirar esta publicación del muro?"))return;
    setBusyPost(postId);
    try{
      await deleteYouthCommunityPost(communitySession,postId);
      setPosts(current=>current.filter(post=>post.id!==postId));
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo retirar la publicación.");}
    finally{setBusyPost("");}
  }

  const visiblePosts=useMemo(()=>{
    const term=feedSearch.trim().toLocaleLowerCase("es");
    if(!term)return posts;
    return posts.filter(post=>
      `${post.author} ${post.nickname} ${post.content} ${post.reference}`
        .toLocaleLowerCase("es").includes(term),
    );
  },[posts,feedSearch]);

  const activeKind=postKinds.find(item=>item.value===kind)??postKinds[0];

  return <div className="youth-tab-page jf-community">
    <section className="jf-community-hero">
      <div className="jf-community-hero-orb" aria-hidden="true"/>
      <div className="jf-community-hero-copy">
        <span className="jf-community-eyebrow"><Users size={14}/> JÓVENES DE FUEGO</span>
        <h2>Un lugar para crecer juntos.</h2>
        <p>Comparte lo que Dios está haciendo en tu vida, anima a alguien y deja que la fe nos conecte.</p>
        <div className="jf-community-hero-meta"><span><i/> Comunidad activa</span><span>Bienvenido, {memberName.split(" ")[0]}</span></div>
      </div>
      <div className="jf-community-hero-mark" aria-hidden="true"><span>✦</span><b>JDF</b><small>FE · AMOR · UNIDAD</small></div>
    </section>

    <section className="jf-community-announcements" aria-labelledby="jf-community-announcements-title">
      <header><span className="jf-community-announcements-icon"><Bell size={17}/></span><div><span>COMUNICADOS OFICIALES</span><h3 id="jf-community-announcements-title">Avisos del equipo</h3></div></header>
      {announcementsLoading?<p className="jf-community-announcements-empty">Consultando avisos...</p>:announcementsError?<p className="jf-community-announcements-empty" role="alert">{announcementsError}<button type="button" onClick={()=>void loadAnnouncements()}>Reintentar</button></p>:announcements.length===0?<p className="jf-community-announcements-empty">Por ahora no hay avisos nuevos.</p>:<div className="jf-community-announcements-list">{announcements.map(item=><article key={item.id}><div><b>{item.title}</b><time>{formatDate(item.createdAt)}</time></div><p>{item.message}</p></article>)}</div>}
    </section>

    <div className="jf-community-layout">
      <div className="jf-community-main">
        <section className="jf-community-chat">
          <header className="jf-community-chat-head"><div><span className="jf-community-chat-kicker"><MessageCircle size={14}/> CONVERSACIÓN GRUPAL</span><h3>Chat JDF</h3><p>Conversemos, animémonos y crezcamos juntos.</p></div><span className="jf-community-chat-safe"><ShieldCheck size={14}/> Espacio supervisado</span></header>
          {chatError&&<div className="jf-community-error" role="alert">{chatError}</div>}
          <div className="jf-community-chat-messages" aria-live="polite">
            {chatLoading?<p className="jf-community-chat-empty">Cargando conversación...</p>:chatMessages.length===0?<p className="jf-community-chat-empty">Aún no hay mensajes. ¡Saluda a todos!</p>:chatMessages.map(message=><article className="jf-community-chat-message" key={message.id}>
              <span className="jf-community-chat-avatar">{message.author.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}</span>
              <div className="jf-community-chat-bubble"><header><b>{message.author}</b><time><Clock3 size={11}/>{formatDate(message.createdAt)}</time><button type="button" onClick={()=>void reportChatMessage(message.id)} disabled={reportedChatMessages.includes(message.id)}>{reportedChatMessages.includes(message.id)?"Reportado":"Reportar"}</button></header><p>{message.content}</p></div>
            </article>)}
          </div>
          <form className="jf-community-chat-form" onSubmit={sendChat}><input aria-label="Mensaje para el chat grupal" value={chatDraft} onChange={event=>setChatDraft(event.target.value)} maxLength={500} placeholder="Escribe un mensaje para todos..."/><button type="submit" disabled={chatSending||!chatDraft.trim()} aria-label="Enviar mensaje">{chatSending?"Enviando...":<Send size={16}/>}</button></form>
          <small className="jf-community-chat-note"><ShieldCheck size={13}/> No compartas datos personales. Los mensajes reportados pueden ser revisados por el equipo pastoral.</small>
        </section>

        <section className="jf-community-composer">
          <div className="jf-community-composer-head"><span className="jf-community-avatar">{memberName.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}</span><div><b>Comparte con la comunidad</b><small>Una palabra puede animar el día de alguien.</small></div></div>
          <div className="jf-community-kind-picker" role="group" aria-label="Tipo de publicación">
            {postKinds.map(item=>{const Icon=item.icon;return <button type="button" key={item.value} className={kind===item.value?"active":""} onClick={()=>setKind(item.value)}><Icon size={15}/>{item.label}</button>;})}
          </div>
          <form onSubmit={publish}>
            <label className="jf-community-sr-only" htmlFor="jf-community-message">Tu publicación</label>
            <textarea id="jf-community-message" value={content} onChange={event=>setContent(event.target.value)} maxLength={2000} rows={4} placeholder={activeKind.placeholder}/>
            {kind==="verse"&&<label className="jf-community-field">Referencia bíblica<input value={reference} onChange={event=>setReference(event.target.value)} maxLength={160} placeholder="Ej. Filipenses 4:13" required/></label>}
            {kind==="song"&&<label className="jf-community-field">Enlace de YouTube o Spotify (opcional)<input type="url" value={linkUrl} onChange={event=>setLinkUrl(event.target.value)} maxLength={500} placeholder="https://youtu.be/..."/></label>}
            <div className="jf-community-composer-foot"><small>{content.length}/2000</small><button type="submit" disabled={publishing||content.trim().length<2||(kind==="verse"&&!reference.trim())}>{publishing?"Publicando...":"Publicar"}<Send size={15}/></button></div>
          </form>
        </section>

        <div className="jf-community-feed-heading">
          <div><span>COMUNIDAD JDF</span><h3>El muro de todos</h3></div>
          <button type="button" onClick={()=>void load(true)} disabled={refreshing} aria-label="Actualizar publicaciones"><RefreshCw size={16} className={refreshing?"is-spinning":""}/></button>
        </div>
        <div className="jf-community-social-toolbar">
          <nav className="jf-community-feed-tabs" aria-label="Vistas del muro">
            <button type="button" className={feedMode==="all"?"active":""} aria-pressed={feedMode==="all"} onClick={()=>setFeedMode("all")}>Para todos</button>
            <button type="button" className={feedMode==="following"?"active":""} aria-pressed={feedMode==="following"} onClick={()=>setFeedMode("following")}>Siguiendo <span>{followingCount>=500?"500+":followingCount}</span></button>
            <button type="button" className={feedMode==="mine"?"active":""} aria-pressed={feedMode==="mine"} onClick={()=>setFeedMode("mine")}>Mis publicaciones</button>
          </nav>
          <label className="jf-community-feed-search"><Search size={15} aria-hidden="true"/><input value={feedSearch} onChange={event=>setFeedSearch(event.target.value)} placeholder="Buscar en estas publicaciones..." aria-label="Buscar publicaciones"/></label>
        </div>

        {error&&<div className="jf-community-error" role="alert">{error}<button type="button" onClick={()=>void load(true)}>Reintentar</button></div>}
        {loading&&<div className="jf-community-loading"><span/><span/><span/></div>}
        {!loading&&!error&&visiblePosts.length===0&&<div className="jf-community-empty"><div><Quote size={25}/></div><h3>{feedSearch.trim()?"No hay coincidencias":feedMode==="following"?(followingCount===0?"Todavía no sigues a nadie":"Aún no hay publicaciones recientes de los perfiles que sigues"):feedMode==="mine"?"Aún no tienes publicaciones":"Este muro comienza contigo"}</h3><p>{feedSearch.trim()?"Prueba con otra palabra.":feedMode==="following"?"Sigue a jóvenes desde sus publicaciones para ver su actividad aquí.":feedMode==="mine"?"Cuando publiques algo, aparecerá en esta sección.":"Comparte un versículo, una canción o una palabra de ánimo."}</p><button type="button" className="jf-community-empty-action" onClick={()=>feedMode==="following"?setFeedMode("all"):document.getElementById("jf-community-message")?.focus()}>{feedMode==="following"?"Explorar el muro":"Crear publicación"}</button></div>}
        {!loading&&visiblePosts.map(post=>{
          const postKind=postKinds.find(item=>item.value===post.type)??postKinds[0];
          const Icon=postKind.icon;
          return <article className="jf-community-post" key={post.id}>
            <header className="jf-community-post-head">
              <span className="jf-community-avatar">{post.author.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}</span>
              <div className="jf-community-author"><b>{post.author}</b>{post.nickname&&<small>@{post.nickname}</small>}<time>{formatDate(post.createdAt)}</time></div>
              <span className="jf-community-post-kind"><Icon size={13}/>{postKind.label}</span>
              <div className="jf-community-post-menu">
                {post.isMine
                  ? <button type="button" className="jf-community-own-post-action" onClick={()=>void removeOwnPost(post.id)} disabled={busyPost===post.id} title="Retirar mi publicación"><Trash2 size={14}/> Retirar</button>
                  : <button type="button" className="jf-community-follow-action" onClick={()=>void toggleFollow(post)} disabled={Boolean(busyPost)} aria-pressed={followingIds.includes(post.memberId) || post.followingAuthor}>{(followingIds.includes(post.memberId) || post.followingAuthor)?<UserCheck size={14}/>:<UserPlus size={14}/>} {(followingIds.includes(post.memberId) || post.followingAuthor)?"Siguiendo":"Seguir"}</button>}
                <button type="button" className="jf-community-report" onClick={()=>void report(post.id)} disabled={busyPost===post.id||reportedPosts.includes(post.id)} aria-label="Reportar publicación" title={reportedPosts.includes(post.id)?"Reporte enviado":"Reportar publicación"}><Flag size={14}/>{reportedPosts.includes(post.id)?"Reportado":"Reportar"}</button>
              </div>
            </header>
            {post.type==="verse"&&post.reference&&<div className="jf-community-verse-ref"><BookOpen size={15}/>{post.reference}</div>}
            <p className="jf-community-post-content">{post.content}</p>
            {post.type==="song"&&post.linkUrl&&<a className="jf-community-song-link" href={post.linkUrl} target="_blank" rel="noreferrer"><Music2 size={16}/> Escuchar canción <Link2 size={14}/></a>}
            <div className="jf-community-post-actions"><button type="button" className={post.reactedByMe?"liked":""} onClick={()=>void react(post.id)} disabled={busyPost===post.id}><Heart size={16} fill={post.reactedByMe?"currentColor":"none"}/>{post.reactionCount||"Me gusta"}</button><span><MessageCircle size={16}/>{post.commentCount} comentarios</span></div>
            {post.recentComments.length>0&&<div className="jf-community-comments">{[...post.recentComments].reverse().map(comment=><div className="jf-community-comment" key={comment.id}><b>{comment.author}</b><p>{comment.content}</p></div>)}</div>}
            <form className="jf-community-comment-form" onSubmit={event=>{event.preventDefault();void comment(post.id);}}><input aria-label="Escribe un comentario" value={commentDrafts[post.id]??""} onChange={event=>setCommentDrafts(current=>({...current,[post.id]:event.target.value}))} maxLength={500} placeholder="Escribe algo que edifique..."/><button type="submit" aria-label="Enviar comentario" disabled={busyPost===post.id||!(commentDrafts[post.id]??"").trim()}><Send size={16}/></button></form>
          </article>;
        })}
      </div>
      <aside className="jf-community-sidebar">
        <section className="jf-community-network-card">
          <span className="jf-community-side-icon"><UsersRound size={18}/></span>
          <small>MI RED</small>
          <div><strong>{followingCount>=500?"500+":followingCount}</strong><span>Siguiendo</span><strong>{followerCount>=500?"500+":followerCount}</strong><span>Seguidores</span></div>
          <p>Conecta con jóvenes, comparte y acompáñense en la fe.</p>
        </section>
        <section><span className="jf-community-side-icon"><BookOpen size={18}/></span><small>PALABRA PARA HOY</small><h3>“Anímense y edifíquense unos a otros.”</h3><p>1 Tesalonicenses 5:11</p></section>
        <section className="jf-community-guidelines"><b>Hagamos de este un buen lugar</b><ul><li>Habla con respeto y amor.</li><li>Comparte contenido que edifique.</li><li>Cuida la privacidad de los demás.</li><li>Si algo te incomoda, comunícalo a un líder.</li></ul></section>
      </aside>
    </div>
  </div>;
}
