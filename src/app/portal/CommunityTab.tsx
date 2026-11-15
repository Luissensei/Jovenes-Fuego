import {useCallback,useEffect,useState} from "react";
import {BookOpen,Heart,Link2,MessageCircle,Music2,RefreshCw,Send,Sparkles,Users,Quote} from "lucide-react";
import {
  createYouthCommunityComment,createYouthCommunityPost,getYouthCommunityFeed,toggleYouthCommunityReaction,
  type YouthCommunityPost,type YouthCommunityPostInput,
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

  const load=useCallback(async(showRefresh=false)=>{
    if(showRefresh)setRefreshing(true);else setLoading(true);
    setError("");
    try{setPosts(await getYouthCommunityFeed(communitySession));}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo cargar la comunidad.");}
    finally{setLoading(false);setRefreshing(false);}
  },[communitySession]);

  useEffect(()=>{void load();},[load]);

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

    <div className="jf-community-layout">
      <div className="jf-community-main">
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

        <div className="jf-community-feed-heading"><div><span>EL MURO</span><h3>Lo que compartimos</h3></div><button type="button" onClick={()=>void load(true)} disabled={refreshing} aria-label="Actualizar publicaciones"><RefreshCw size={16} className={refreshing?"is-spinning":""}/></button></div>

        {error&&<div className="jf-community-error" role="alert">{error}<button type="button" onClick={()=>void load(true)}>Reintentar</button></div>}
        {loading&&<div className="jf-community-loading"><span/><span/><span/></div>}
        {!loading&&!error&&posts.length===0&&<div className="jf-community-empty"><div><Quote size={25}/></div><h3>Este muro comienza contigo</h3><p>Comparte un versículo, una canción o una palabra de ánimo. ¡Sé quien encienda la conversación!</p></div>}
        {!loading&&posts.map(post=>{
          const postKind=postKinds.find(item=>item.value===post.type)??postKinds[0];
          const Icon=postKind.icon;
          return <article className="jf-community-post" key={post.id}>
            <header className="jf-community-post-head"><span className="jf-community-avatar">{post.author.split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}</span><div className="jf-community-author"><b>{post.author}</b>{post.nickname&&<small>@{post.nickname}</small>}<time>{formatDate(post.createdAt)}</time></div><span className="jf-community-post-kind"><Icon size={13}/>{postKind.label}</span></header>
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
        <section><span className="jf-community-side-icon"><BookOpen size={18}/></span><small>PALABRA PARA HOY</small><h3>“Anímense y edifíquense unos a otros.”</h3><p>1 Tesalonicenses 5:11</p></section>
        <section className="jf-community-guidelines"><b>Hagamos de este un buen lugar</b><ul><li>Habla con respeto y amor.</li><li>Comparte contenido que edifique.</li><li>Cuida la privacidad de los demás.</li><li>Si algo te incomoda, comunícalo a un líder.</li></ul></section>
      </aside>
    </div>
  </div>;
}
