import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, CalendarCheck, MessageCircle, BookOpen, Bell,
  UserPlus, HandHeart, CalendarDays, QrCode, Trophy, Gamepad2,
  UserRound, Images, Star, ShieldCheck, Inbox, ClipboardList,
  BarChart3, Crown, Settings, Sparkles,
} from 'lucide-react';

export type ModuleDefinition = {
  id: string;
  label: string;
  path: string;
  description: string;
  icon: LucideIcon;
};

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Panel principal',
    path: '/',
    description: 'Resumen de la comunidad y actividad reciente.',
  },
  {
    id: 'assistant',
    icon: Sparkles,
    label: 'Fuego AI',
    path: '/asistente',
    description: 'Asistente inteligente para planificación y comunicación.',
  },
  {
    id: 'members',
    icon: Users,
    label: 'Jóvenes',
    path: '/jovenes',
    description: 'Fichas, perfiles y datos de los jóvenes.',
  },
  {
    id: 'attendance',
    icon: CalendarCheck,
    label: 'Asistencia',
    path: '/asistencia',
    description: 'Registro por fecha y servicio.',
  },
  {
    id: 'followups',
    icon: MessageCircle,
    label: 'Seguimiento',
    path: '/seguimiento',
    description: 'Contactos, visitas y próximos pasos.',
  },
  {
    id: 'devotionals',
    icon: BookOpen,
    label: 'Devocionales',
    path: '/devocionales',
    description: 'Seguimiento de entregas semanales.',
  },
  {
    id: 'visitors',
    icon: UserPlus,
    label: 'Visitantes',
    path: '/visitantes',
    description: 'Registro y acompañamiento de visitantes.',
  },
  {
    id: 'prayers',
    icon: HandHeart,
    label: 'Peticiones',
    path: '/peticiones',
    description: 'Peticiones recibidas y seguimiento.',
  },
  {
    id: 'events',
    icon: CalendarDays,
    label: 'Agenda y eventos',
    path: '/eventos',
    description: 'Calendario de actividades.',
  },
  {
    id: 'checkins',
    icon: QrCode,
    label: 'Check-in QR',
    path: '/checkin',
    description: 'Registro rápido por código o QR.',
  },
  {
    id: 'ranking',
    icon: Trophy,
    label: 'Clasificación',
    path: '/ranking',
    description: 'Puntos, rachas y ranking público.',
  },
  {
    id: 'games',
    icon: Gamepad2,
    label: 'Juegos bíblicos',
    path: '/juegos',
    description: 'Juegos, retos y puntuaciones.',
  },
  {
    id: 'profile',
    icon: UserRound,
    label: 'Perfil público',
    path: '/perfil',
    description: 'Perfil del joven y personalización.',
  },
  {
    id: 'photos',
    icon: Images,
    label: 'Fotos y aprobaciones',
    path: '/fotos',
    description: 'Fotos públicas y solicitudes pendientes.',
  },
  {
    id: 'bonus',
    icon: Star,
    label: 'Puntos extra',
    path: '/puntos-extra',
    description: 'Administración de puntos extra.',
  },
  {
    id: 'pastoral',
    icon: ShieldCheck,
    label: 'Notas pastorales',
    path: '/pastoral',
    description: 'Notas con acceso pastoral restringido.',
  },
  {
    id: 'notifications',
    icon: Bell,
    label: 'Notificaciones',
    path: '/notificaciones',
    description: 'Pendientes y novedades de la comunidad.',
  },
  {
    id: 'inbox',
    icon: Inbox,
    label: 'Bandeja de entrada',
    path: '/bandeja',
    description: 'Contenido enviado desde perfiles públicos.',
  },
  {
    id: 'turns',
    icon: ClipboardList,
    label: 'Turnos',
    path: '/turnos',
    description: 'Organización de turnos y servicios.',
  },
  {
    id: 'reports',
    icon: BarChart3,
    label: 'Informes',
    path: '/informes',
    description: 'Reportes y estadísticas.',
  },
  {
    id: 'leaders',
    icon: Crown,
    label: 'Líderes y usuarios',
    path: '/lideres',
    description: 'Gestión de cuentas y roles autorizados.',
  },
  {
    id: 'audit',
    icon: ClipboardList,
    label: 'Auditoría',
    path: '/auditoria',
    description: 'Historial de acciones.',
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Configuración',
    path: '/configuracion',
    description: 'Preferencias y ajustes.',
  },
];
