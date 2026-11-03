import ManagedRecordsPage, {
  type ManagedPageConfig,
} from './ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'events',
  eyebrow: 'VIDA DE LA COMUNIDAD',
  title: 'Agenda y eventos',
  description: 'Organiza cultos, reuniones, actividades y encuentros juveniles.',
  createLabel: 'Crear evento',
  fields: [
    {
      key: 'title',
      label: 'Nombre del evento',
      placeholder: 'Ej. Noche de jóvenes',
    },
    {
      key: 'description',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'Información del evento...',
    },
    {
      key: 'date',
      label: 'Fecha',
      type: 'date',
    },
    {
      key: 'time',
      label: 'Hora',
      type: 'time',
    },
    {
      key: 'location',
      label: 'Lugar',
      placeholder: 'Lugar del evento',
    },
  ],
  statusOptions: ['Programado', 'Realizado', 'Cancelado'],
  emptyTitle: 'No hay eventos registrados',
  emptyDescription: 'Crea un evento para comenzar a organizar la agenda.',
};

export default function EventsPage() {
  return <ManagedRecordsPage config={config} />;
}
