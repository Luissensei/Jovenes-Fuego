import {Sparkles, ShieldCheck, CalendarDays, FileText, MessageSquareText} from 'lucide-react';
import FuegoAssistant from '../components/FuegoAssistant';
import {useAuth} from '../AuthContext';

const suggestions = [
  'Prepara un cronograma para un encuentro juvenil de un día.',
  'Redacta una invitación cálida para el próximo servicio juvenil.',
  'Crea una lista de tareas para organizar una vigilia.',
  'Prepara una lista para revisar devocionales publicados y entregas semanales pendientes.',
  'Diseña una estructura de informe mensual de actividades y asistencia.',
];

export default function AdminAssistantPage() {
  const {profile} = useAuth();
  return (
    <main className="jf-assistant-workspace">
      <header className="jf-assistant-workspace-hero">
        <div className="jf-assistant-orb"><Sparkles size={28}/></div>
        <div>
          <span>CENTRO DE APOYO ADMINISTRATIVO</span>
          <h1>Fuego AI</h1>
          <p>Un espacio para planificar, comunicar y organizar mejor Jóvenes de Fuego.</p>
        </div>
      </header>
      <div className="jf-assistant-feature-row">
        <article><CalendarDays size={18}/><span>Planificación de servicios y actividades</span></article>
        <article><MessageSquareText size={18}/><span>Comunicaciones y anuncios</span></article>
        <article><FileText size={18}/><span>Informes y documentos</span></article>
      </div>
      <FuegoAssistant
        audience="admin"
        displayName={profile?.name || 'Administrador'}
        quickPrompts={suggestions}
        context="Eres el asistente administrativo de Jóvenes de Fuego. Ayuda con planificación, redacción y organización; no tienes acceso directo a los registros de Firebase."
      />
      <p className="jf-assistant-safety"><ShieldCheck size={15}/> Fuego AI prepara propuestas; por ahora no consulta automáticamente registros privados de Firebase. Para analizar cifras, comparte solo resúmenes agregados y sin datos sensibles. Las operaciones reales requieren autorización en su módulo correspondiente.</p>
    </main>
  );
}
