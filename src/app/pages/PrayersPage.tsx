import ManagedRecordsPage, {
  type ManagedPageConfig,
} from './ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'prayers',
  eyebrow: 'ACOMPAÑAMIENTO ESPIRITUAL',
  title: 'Peticiones de oración',
  description: 'Recibe y acompaña las necesidades de oración de la comunidad.',
  createLabel: 'Nueva petición',
  fields: [
    {
      key: 'requester',
      label: 'Nombre de quien solicita',
      placeholder: 'Nombre de la persona',
    },
    {
      key: 'request',
      label: 'Petición',
      type: 'textarea',
      placeholder: 'Describe la petición de oración...',
    },
    {
      key: 'category',
      label: 'Categoría',
      placeholder: 'Familia, salud, agradecimiento...',
    },
  ],
  statusOptions: ['Pendiente', 'En oración', 'Atendida'],
  emptyTitle: 'Todavía no hay peticiones',
  emptyDescription: 'Registra la primera petición de oración.',
};

export default function PrayersPage() {
  return <ManagedRecordsPage config={config} />;
}
