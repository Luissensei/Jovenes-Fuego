import {Sparkles, ShieldCheck, CalendarDays, FileText, MessageSquareText} from 'lucide-react';

const features = [
  {icon: CalendarDays, label: 'Planificación de servicios y actividades'},
  {icon: MessageSquareText, label: 'Comunicaciones y anuncios'},
  {icon: FileText, label: 'Informes, documentos y cronogramas'},
];

export default function AdminAssistantPage() {
  return (
    <main className="jf-assistant-workspace jf-assistant-launch-page">
      <header className="jf-assistant-workspace-hero">
        <div className="jf-assistant-orb"><Sparkles size={28}/></div>
        <div>
          <span>CENTRO DE APOYO ADMINISTRATIVO</span>
          <h1>Fuego AI</h1>
          <p>Tu asistente está disponible desde el botón circular flotante en cualquier pantalla.</p>
        </div>
      </header>
      <div className="jf-assistant-feature-row">
        {features.map(({icon: Icon, label}) => <article key={label}><Icon size={18}/><span>{label}</span></article>)}
      </div>
      <section className="jf-assistant-launch-card">
        <span><Sparkles size={24}/></span>
        <div><strong>Abre tu asistente</strong><p>Pulsa el círculo Fuego AI de la esquina inferior derecha para abrir el chat sin salir del módulo en el que estés trabajando.</p></div>
      </section>
      <p className="jf-assistant-safety"><ShieldCheck size={15}/> Fuego AI prepara propuestas; no consulta automáticamente registros privados de Firebase ni modifica usuarios, permisos o registros. No compartas datos personales ni información pastoral sensible.</p>
    </main>
  );
}
