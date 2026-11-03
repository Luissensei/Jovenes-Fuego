export type ModuleDefinition = {
  id: string;
  label: string;
  path: string;
  description: string;
};

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Panel principal',
    path: '/',
    description: 'Resumen de la comunidad y actividad reciente.',
  },
  {
    id: 'members',
    label: 'Jóvenes',
    path: '/jovenes',
    description: 'Fichas, perfiles y datos de los jóvenes.',
  },
  {
    id: 'attendance',
    label: 'Asistencia',
    path: '/asistencia',
    description: 'Registro por fecha y servicio.',
  },
  {
    id: 'followups',
    label: 'Seguimiento',
    path: '/seguimiento',
    description: 'Contactos, visitas y próximos pasos.',
  },
  {
    id: 'devotionals',
    label: 'Devocionales',
    path: '/devocionales',
    description: 'Seguimiento de entregas semanales.',
  },
  {
    id: 'visitors',
    label: 'Visitantes',
    path: '/visitantes',
    description: 'Registro y acompañamiento de visitantes.',
  },
  {
    id: 'prayers',
    label: 'Peticiones',
    path: '/peticiones',
    description: 'Peticiones recibidas y seguimiento.',
  },
  {
    id: 'events',
    label: 'Agenda y eventos',
    path: '/eventos',
    description: 'Calendario de actividades.',
  },
  {
    id: 'checkins',
    label: 'Check-in QR',
    path: '/checkin',
    description: 'Registro rápido por código o QR.',
  },
  {
    id: 'ranking',
    label: 'Clasificación',
    path: '/ranking',
    description: 'Puntos, rachas y ranking público.',
  },
  {
    id: 'games',
    label: 'Juegos bíblicos',
    path: '/juegos',
    description: 'Juegos, retos y puntuaciones.',
  },
  {
    id: 'profile',
    label: 'Perfil público',
    path: '/perfil',
    description: 'Perfil del joven y personalización.',
  },
  {
    id: 'photos',
    label: 'Fotos y aprobaciones',
    path: '/fotos',
    description: 'Fotos públicas y solicitudes pendientes.',
  },
  {
    id: 'bonus',
    label: 'Puntos extra',
    path: '/puntos-extra',
    description: 'Administración de puntos extra.',
  },
  {
    id: 'pastoral',
    label: 'Notas pastorales',
    path: '/pastoral',
    description: 'Notas con acceso pastoral restringido.',
  },
  {
    id: 'inbox',
    label: 'Bandeja de entrada',
    path: '/bandeja',
    description: 'Contenido enviado desde perfiles públicos.',
  },
  {
    id: 'turns',
    label: 'Turnos',
    path: '/turnos',
    description: 'Organización de turnos y servicios.',
  },
  {
    id: 'reports',
    label: 'Informes',
    path: '/informes',
    description: 'Reportes y estadísticas.',
  },
  {
    id: 'leaders',
    label: 'Líderes y usuarios',
    path: '/lideres',
    description: 'Gestión de cuentas y roles autorizados.',
  },
  {
    id: 'audit',
    label: 'Auditoría',
    path: '/auditoria',
    description: 'Historial de acciones.',
  },
  {
    id: 'settings',
    label: 'Configuración',
    path: '/configuracion',
    description: 'Preferencias y ajustes.',
  },
];
