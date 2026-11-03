import ManagedRecordsPage, {
  type ManagedPageConfig,
} from './ManagedRecordsPage';

const config: ManagedPageConfig = {
  collection: 'inbox',
  eyebrow: 'COMUNICACIÓN',
  title: 'Bandeja de entrada',
  description: 'Consulta y administra los mensajes recibidos por la comunidad.',
  createLabel: 'Registrar mensaje',
  fields: [
    {
      key: 'senderName',
      label: 'Nombre del remitente',
      placeholder: 'Nombre de quien envía',
    },
    {
      key: 'subject',
      label: 'Asunto',
      placeholder: 'Asunto del mensaje',
    },
    {
      key: 'senderContact',
      label: 'Contacto',
      type: 'text',
      placeholder: 'Teléfono o correo, si corresponde',
      required: false,
    },
    {
      key: 'message',
      label: 'Mensaje',
      type: 'textarea',
      placeholder: 'Contenido del mensaje...',
    },
  ],
  statusOptions: ['Nuevo', 'En revisión', 'Respondido', 'Archivado'],
  emptyTitle: 'Bandeja vacía',
  emptyDescription: 'Todavía no hay mensajes registrados.',
};

export default function InboxPage() {
  return <ManagedRecordsPage config={config} />;
}
