import ManagedRecordsPage, { type ManagedPageConfig } from './pages/ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'followups',
  eyebrow: 'ACOMPAÑAMIENTO JUVENIL',
  title: 'Seguimiento de jóvenes',
  description: 'Registra y consulta el acompañamiento de cada joven.',
  createLabel: 'Nuevo seguimiento',
  fields: [
    { key: 'name', label: 'Nombre del joven', placeholder: 'Nombre completo' },
    { key: 'date', label: 'Fecha', type: 'date' },
    { key: 'reason', label: 'Motivo', placeholder: 'Acompañamiento espiritual, inasistencia...' },
    { key: 'notes', label: 'Observaciones', type: 'textarea', placeholder: 'Detalles del seguimiento...' },
  ],
  statusOptions: ['Pendiente', 'En proceso', 'Completado'],
  emptyTitle: 'Sin seguimientos registrados',
  emptyDescription: 'Los seguimientos que registres aparecerán aquí.',
};

export default function FollowupPage() {
  return <ManagedRecordsPage config={config} />;
}
