import ManagedRecordsPage, {
  type ManagedPageConfig,
} from './ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'turns',
  eyebrow: 'ORGANIZACIÓN Y SERVICIO',
  title: 'Turnos',
  description: 'Organiza los responsables y horarios de los servicios juveniles.',
  createLabel: 'Crear turno',
  fields: [
    {
      key: 'service',
      label: 'Servicio o actividad',
      placeholder: 'Ej. Servicio juvenil',
    },
    {
      key: 'responsibleName',
      label: 'Responsable',
      placeholder: 'Nombre del responsable',
    },
    {
      key: 'date',
      label: 'Fecha',
      type: 'date',
    },
    {
      key: 'startTime',
      label: 'Hora de inicio',
      type: 'time',
    },
    {
      key: 'endTime',
      label: 'Hora de finalización',
      type: 'time',
    },
    {
      key: 'notes',
      label: 'Observaciones',
      type: 'textarea',
      placeholder: 'Notas adicionales...',
      required: false,
    },
  ],
  statusOptions: ['Pendiente', 'Confirmado', 'Completado'],
  emptyTitle: 'No hay turnos programados',
  emptyDescription: 'Crea un turno y asigna un responsable.',
};

export default function TurnsPage() {
  return <ManagedRecordsPage config={config} />;
}
