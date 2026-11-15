import {useCallback,useEffect,useState} from "react";
import {Flag,RefreshCw,ShieldCheck,EyeOff,Undo2,Clock3} from "lucide-react";
import {getAdminYouthCommunityReports,moderateYouthCommunityPost,type AdminYouthCommunityReport} from "../../services/youthPortal";

const reasonLabels:Record<string,string>={inappropriate:"Contenido inapropiado",bullying:"Acoso o maltrato",privacy:"Privacidad",spam:"Spam",other:"Otro motivo"};

export default function CommunityModerationPage(){
  const [reports,setReports]=useState<AdminYouthCommunityReport[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{setReports(await getAdminYouthCommunityReports());}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudieron cargar los reportes.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function moderate(report:AdminYouthCommunityReport,action:"hide"|"restore"){
    setBusy(report.id);setError("");
    try{await moderateYouthCommunityPost(report.postId,action);await load();}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo completar la moderación.");}
    finally{setBusy("");}
  }
  return <section className="page-card jf-community-moderation">
    <div className="eyebrow">CUIDADO DE LA COMUNIDAD</div>
    <h1>Moderación JDF</h1>
    <p className="lead">Revisa los reportes enviados por los jóvenes y toma medidas para mantener un espacio respetuoso y seguro.</p>
    <div className="jf-moderation-toolbar"><span><Flag size={17}/> {reports.length} reportes pendientes</span><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Actualizar</button></div>
    {error&&<div className="notice" role="alert">{error}</div>}
    {loading?<p>Consultando reportes...</p>:reports.length===0?<div className="notice"><ShieldCheck size={20}/><div><strong>Todo al día</strong><p>No hay reportes pendientes por revisar.</p></div></div>:<div className="jf-moderation-list">
      {reports.map(report=><article className="jf-moderation-card" key={report.id}>
        <header><span><Flag size={15}/>{reasonLabels[report.reason]??"Reporte"}</span><small><Clock3 size={13}/>{new Date(report.createdAt).toLocaleString("es-CO")}</small></header>
        <p className="jf-moderation-author">Publicación de <strong>{report.postAuthor||"Joven"}</strong></p>
        <blockquote>{report.postContent}</blockquote>
        {report.details&&<p className="jf-moderation-details"><b>Detalle:</b> {report.details}</p>}
        <div className="jf-moderation-actions"><button type="button" onClick={()=>void moderate(report,"hide")} disabled={busy===report.id}><EyeOff size={15}/> Ocultar publicación</button><button type="button" className="secondary" onClick={()=>void moderate(report,"restore")} disabled={busy===report.id}><Undo2 size={15}/> Mantener y cerrar reporte</button></div>
      </article>)}
    </div>}
    <p className="jf-moderation-footnote"><ShieldCheck size={14}/> Solo administración y pastoral pueden consultar esta bandeja. Cada decisión queda registrada en auditoría.</p>
  </section>;
}
