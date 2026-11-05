import ManagedRecordsPage, { type ManagedPageConfig } from './pages/ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'visitors',
  eyebrow: 'BIENVENIDA E INTEGRACIÓN',
  title: 'Visitantes',
  description: 'Registra, conoce y acompaña a quienes nos visitan.',
  createLabel: 'Registrar visitante',
  fields: [
    { key: 'name', label: 'Nombre completo', placeholder: 'Nombre del visitante' },
    { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Número de contacto' },
    { key: 'email', label: 'Correo electrónico', placeholder: 'Correo (opcional)', required: false },
    { key: 'date', label: 'Fecha de visita', type: 'date' },
    { key: 'source', label: '¿Cómo nos conoció?', placeholder: 'Invitación, redes sociales...' },
    { key: 'notes', label: 'Observaciones', type: 'textarea', placeholder: 'Información importante (opcional)', required: false },
  ],
  statusOptions: ['Nuevo', 'Contactado', 'Integrado'],
  emptyTitle: 'Sin visitantes registrados',
  emptyDescription: 'Los visitantes que registres aparecerán aquí.',
};

export default function VisitorsPage() {
  return <ManagedRecordsPage config={config} />;
}
