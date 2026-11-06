import styles from './styles/YouthPortalPage.module.css';
import dashboardStyles from './styles/YouthPortalDashboard.module.css';
import { motion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {FormEvent} from 'react';

import {
  Search, Users, AlertCircle, ArrowLeft, Flame, Trophy, BookOpen,
  Gamepad2, RefreshCw, ChevronRight, ShieldCheck, Sparkles,
  CalendarDays, Clock3, MapPin, HeartHandshake, Send, Medal, Crown,
  Palette, Volume2, VolumeX, Star, X, WandSparkles,
  BookMarked, Timer, Swords, Brain, Layers, Moon, Sun, BadgeCheck, UserSearch, Circle, CheckCircle2, Save, Trash2, Home,
} from 'lucide-react';

import {getPublicProfiles, type PublicProfile} from '../services/publicProfiles';
import {
  getWeeklyActivities,
  getHallOfFame,
  sendPrayerRequest,
  type WeeklyActivity,
  type HallOfFamePlayer,
  type FaithfulPlayer,
} from '../services/youthPortal';

const TriviaGame = lazy(() => import('./TriviaGame'));
const VerseGame = lazy(() => import('./VerseGame'));
const TrueFalseGame = lazy(() => import('./QuickBibleGames').then((module) => ({default: module.TrueFalseGame})));
const WhoAmIGame = lazy(() => import('./QuickBibleGames').then((module) => ({default: module.WhoAmIGame})));
const MemoryGame = lazy(() => import('./MoreBibleGames').then((module) => ({default: module.MemoryGame})));
const ChallengeGame = lazy(() => import('./MoreBibleGames').then((module) => ({default: module.ChallengeGame})));
const SurvivalGame = lazy(() => import('./MoreBibleGames').then((module) => ({default: module.SurvivalGame})));
const DuelGame = lazy(() => import('./MoreBibleGames').then((module) => ({default: module.DuelGame})));
const OrderVerseGame = lazy(() => import('./MoreBibleGames').then((module) => ({default: module.OrderVerseGame})));

import { useThemePreference } from './useThemePreference';


type ProfileLook = {
  frame: string;
  background: string;
  avatar: string;
  title: string;
  ownedItems: string[];
  flames: number;
  effects: string;
  badge: string;
  hair: string;
  outfit: string;
  accessory: string;
};

type ProfileExtras = {displayName: string; nickname: string; motto: string; weeklyGoal: string};
const defaultProfileExtras: ProfileExtras = {displayName: '', nickname: '', motto: '', weeklyGoal: ''};
type LookShopCategory = 'frames' | 'avatars' | 'titles' | 'backgrounds' | 'effects' | 'badges' | 'hair' | 'outfits' | 'accessories';

const lookShop: Record<LookShopCategory, {key: string; label: string; emoji: string; cost: number}[]> = {
  frames: [
    {key:'fuego',label:'Fuego',emoji:'🔥',cost:0},
    {key:'neon',label:'Amatista',emoji:'💜',cost:40},
    {key:'cielo',label:'Cielo',emoji:'🕊️',cost:40},
    {key:'hielo',label:'Hielo',emoji:'❄️',cost:50},
    {key:'arco',label:'Arcoíris',emoji:'🌈',cost:60},
    {key:'esmeralda',label:'Esmeralda',emoji:'💚',cost:70},
    {key:'rayo',label:'Rayo',emoji:'⚡',cost:80},
    {key:'oro',label:'Oro',emoji:'👑',cost:120},
    {key:'galaxia',label:'Galaxia',emoji:'🌌',cost:150},
    {key:'corona',label:'Campeón',emoji:'🏆',cost:200},
    {key:'prisma',label:'Prisma',emoji:'🔮',cost:110},
    {key:'obsidiana',label:'Obsidiana',emoji:'🖤',cost:125},
    {key:'solar',label:'Solar',emoji:'☀️',cost:95},
    {key:'cristal',label:'Cristal',emoji:'💎',cost:145},
    {key:'emperador',label:'Emperador',emoji:'👑',cost:185},
    {key:'filigrana',label:'Filigrana dorada',emoji:'✨',cost:155},
    {key:'bronce',label:'Bronce noble',emoji:'🏅',cost:100},
    {key:'runa',label:'Runas reales',emoji:'🔱',cost:175},
  ],
  avatars: [
    {key:'',label:'Iniciales',emoji:'🔤',cost:0},
    {key:'paloma',label:'Paloma',emoji:'🕊️',cost:0},
    {key:'leon',label:'León de Judá',emoji:'🦁',cost:0},
    {key:'aguila',label:'Águila',emoji:'🦅',cost:0},
    {key:'cordero',label:'Cordero',emoji:'🐑',cost:20},
    {key:'mariposa',label:'Mariposa',emoji:'🦋',cost:25},
    {key:'lobo',label:'Lobo',emoji:'🐺',cost:30},
    {key:'estrella',label:'Estrella',emoji:'🌟',cost:40},
    {key:'guerrero',label:'Guerrero',emoji:'🛡️',cost:50},
    {key:'dragon',label:'Dragón',emoji:'🐉',cost:60},
    {key:'cohete',label:'Cohete',emoji:'🚀',cost:70},
    {key:'rey',label:'Rey',emoji:'👑',cost:80},
    {key:'volcan',label:'Volcán',emoji:'🌋',cost:90},
    {key:'fenix',label:'Fénix',emoji:'🪽',cost:95},
    {key:'delfin',label:'Delfín',emoji:'🐬',cost:45},
    {key:'zorro',label:'Zorro',emoji:'🦊',cost:55},
    {key:'pantera',label:'Pantera',emoji:'🐆',cost:75},
    {key:'tigre',label:'Tigre',emoji:'🐯',cost:75},
    {key:'fenix-real',label:'Fénix real',emoji:'🔥',cost:135},
  ],
  titles: [
    {key:'chispa',label:'Chispa Encendida',emoji:'✨',cost:0},
    {key:'valiente',label:'Valiente',emoji:'🛡️',cost:25},
    {key:'guerrero',label:'Guerrero de Fe',emoji:'⚔️',cost:40},
    {key:'intercesor',label:'Intercesor',emoji:'🙏',cost:50},
    {key:'adorador',label:'Adorador',emoji:'🎵',cost:60},
    {key:'sabio',label:'Sabio de la Palabra',emoji:'📖',cost:80},
    {key:'leyenda',label:'Leyenda de Fuego',emoji:'🏆',cost:150},
  ],
  backgrounds: [
    {key:'brasa',label:'Brasa',emoji:'🔥',cost:0},
    {key:'ocaso',label:'Ocaso',emoji:'🌅',cost:30},
    {key:'aurora',label:'Aurora',emoji:'🌌',cost:50},
    {key:'noche',label:'Noche',emoji:'🌙',cost:50},
    {key:'volcan',label:'Volcán',emoji:'🌋',cost:80},
    {key:'galaxia',label:'Galaxia',emoji:'✨',cost:100},
    {key:'oceano',label:'Océano',emoji:'🌊',cost:65},
    {key:'bosque',label:'Bosque',emoji:'🌳',cost:70},
    {key:'aurora-boreal',label:'Aurora boreal',emoji:'🌠',cost:115},
    {key:'atardecer',label:'Atardecer',emoji:'🌇',cost:55},
    {key:'cosmos',label:'Cosmos',emoji:'🪐',cost:125},
    {key:'imperial',label:'Imperial',emoji:'👑',cost:145},
    {key:'amatista',label:'Amatista real',emoji:'💜',cost:95},
    {key:'santuario',label:'Santuario',emoji:'🕯️',cost:110},
    {key:'aurum',label:'Aurum',emoji:'🌟',cost:130},
    {key:'seda',label:'Seda y oro',emoji:'🌙',cost:120},
    {key:'nebula-real',label:'Nebulosa real',emoji:'🪐',cost:155},
  ],
  effects: [
    {key:'ember',label:'Brasa suave',emoji:'🔥',cost:0},
    {key:'aurora',label:'Aura aurora',emoji:'🌈',cost:65},
    {key:'spark',label:'Chispas',emoji:'✨',cost:75},
    {key:'ice',label:'Escarcha',emoji:'❄️',cost:85},
    {key:'halo',label:'Resplandor',emoji:'💫',cost:110},
    {key:'galaxy',label:'Galaxia',emoji:'🌌',cost:140},
    {key:'sun',label:'Destello solar',emoji:'☀️',cost:90},
    {key:'lightning',label:'Relámpagos',emoji:'⚡',cost:105},
    {key:'bloom',label:'Luz floreciente',emoji:'🌸',cost:95},
    {key:'royal',label:'Aura imperial',emoji:'👑',cost:125},
    {key:'orbit',label:'Órbitas doradas',emoji:'🪐',cost:135},
    {key:'runes',label:'Runas de luz',emoji:'🔱',cost:150},
    {key:'golden',label:'Llama dorada',emoji:'🔥',cost:165},
    {key:'comet',label:'Cometa de oro',emoji:'☄️',cost:145},
    {key:'crown',label:'Resplandor de corona',emoji:'💫',cost:175},
    {key:'vortex',label:'Vórtice amatista',emoji:'🌀',cost:155},
  ],
  badges: [
    {key:'flame',label:'Llama viva',emoji:'🔥',cost:0},
    {key:'book',label:'Amante de la Palabra',emoji:'📖',cost:45},
    {key:'heart',label:'Corazón de servicio',emoji:'💛',cost:55},
    {key:'shield',label:'Fe firme',emoji:'🛡️',cost:65},
    {key:'star',label:'Luz del mundo',emoji:'⭐',cost:80},
    {key:'crown',label:'Corona de vida',emoji:'👑',cost:120},
    {key:'hope',label:'Esperanza',emoji:'🕊️',cost:70},
    {key:'mission',label:'En misión',emoji:'🌍',cost:85},
    {key:'brave',label:'Valentía',emoji:'🦁',cost:90},
    {key:'joy',label:'Gozo',emoji:'😊',cost:55},
    {key:'royal',label:'Linaje real',emoji:'👑',cost:135},
    {key:'guardian',label:'Guardián de fe',emoji:'🛡️',cost:110},
    {key:'victory',label:'Victoria',emoji:'🏆',cost:125},
    {key:'covenant',label:'Pacto de luz',emoji:'📜',cost:100},
    {key:'radiance',label:'Resplandor',emoji:'🌟',cost:145},
  ],
  hair: [
    {key:'natural',label:'Natural',emoji:'🌿',cost:0},
    {key:'waves',label:'Ondulado',emoji:'🌊',cost:35},
    {key:'curly',label:'Rizos',emoji:'🌀',cost:45},
    {key:'fade',label:'Degradado',emoji:'💈',cost:45},
    {key:'afro',label:'Afro',emoji:'☁️',cost:55},
    {key:'braids',label:'Trenzas',emoji:'🧶',cost:65},
    {key:'long',label:'Largo',emoji:'💇',cost:65},
    {key:'bun',label:'Recogido',emoji:'🪮',cost:60},
    {key:'classic',label:'Clásico',emoji:'✨',cost:30},
    {key:'cap',label:'Gorra',emoji:'🧢',cost:40},
  ],
  outfits: [
    {key:'basic',label:'Camiseta básica',emoji:'👕',cost:0},
    {key:'hoodie',label:'Sudadera urbana',emoji:'🧥',cost:55},
    {key:'white',label:'Blanco celestial',emoji:'🤍',cost:60},
    {key:'sport',label:'Deportivo',emoji:'🏃',cost:45},
    {key:'denim',label:'Chaqueta denim',emoji:'🧢',cost:70},
    {key:'royal',label:'Elegancia real',emoji:'👑',cost:100},
    {key:'worship',label:'Adorador',emoji:'🎵',cost:65},
    {key:'street',label:'Street style',emoji:'🛹',cost:75},
    {key:'warrior',label:'Guerrero de fe',emoji:'🛡️',cost:90},
    {key:'formal',label:'Formal',emoji:'🤵',cost:70},
    {key:'guardian',label:'Armadura noble',emoji:'🛡️',cost:115},
    {key:'imperial',label:'Manto imperial',emoji:'👑',cost:145},
    {key:'champion',label:'Campeón',emoji:'🏅',cost:120},
    {key:'satin',label:'Satén dorado',emoji:'✨',cost:130},
  ],
  accessories: [
    {key:'none',label:'Sin accesorio',emoji:'➖',cost:0},
    {key:'glasses',label:'Gafas',emoji:'👓',cost:25},
    {key:'headphones',label:'Auriculares',emoji:'🎧',cost:40},
    {key:'cross',label:'Colgante',emoji:'✝️',cost:45},
    {key:'wristband',label:'Pulsera',emoji:'📿',cost:25},
    {key:'halo',label:'Aureola',emoji:'😇',cost:70},
    {key:'book',label:'Biblia',emoji:'📖',cost:35},
    {key:'cap',label:'Gorra urbana',emoji:'🧢',cost:40},
    {key:'crown',label:'Corona',emoji:'👑',cost:80},
    {key:'scarf',label:'Bufanda',emoji:'🧣',cost:50},
    {key:'wings',label:'Alas reales',emoji:'🪽',cost:135},
    {key:'sword',label:'Espada ceremonial',emoji:'⚔️',cost:125},
    {key:'staff',label:'Bastón de luz',emoji:'🪄',cost:100},
    {key:'cape',label:'Capa de campeón',emoji:'🦸',cost:115},
  ],
};

const lookCategoryField: Record<LookShopCategory, keyof ProfileLook> = {
  frames: 'frame',
  avatars: 'avatar',
  titles: 'title',
  backgrounds: 'background',
  effects: 'effects',
  badges: 'badge',
  hair: 'hair',
  outfits: 'outfit',
  accessories: 'accessory',
};

const lookCategoryStorage: Record<LookShopCategory, string> = {
  frames: 'frames',
  avatars: 'avs',
  titles: 'tits',
  backgrounds: 'bans',
  effects: 'fx',
  badges: 'bdg',
  hair: 'hair',
  outfits: 'outfits',
  accessories: 'accessories',
};

type MiniGame = 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order' | 'truefalse' | 'whoami';
type YouthSection = 'home' | 'activities' | 'ranking' | 'games' | 'space';

const youthNavigation: Array<{id: YouthSection; label: string; icon: typeof Home}> = [
  {id: 'home', label: 'Inicio', icon: Home},
  {id: 'activities', label: 'Actividades', icon: CalendarDays},
  {id: 'ranking', label: 'Ranking', icon: Trophy},
  {id: 'games', label: 'Juegos', icon: Gamepad2},
  {id: 'space', label: 'Mi espacio', icon: UserRound},
];

const defaultLook: ProfileLook = {frame: 'fuego', background: 'brasa', avatar: '', title: 'chispa', ownedItems: [], flames: 0, effects: 'ember', badge: 'flame', hair: 'natural', outfit: 'basic', accessory: 'none'};


type LookPreset = Pick<ProfileLook, 'frame' | 'background' | 'avatar' | 'title' | 'effects' | 'badge' | 'hair' | 'outfit' | 'accessory'>;
const lookTemplates: {key:string;label:string;description:string;emoji:string;preset:LookPreset}[] = [
  {key:'llama',label:'Llama viva',description:'Energía cálida y espíritu valiente.',emoji:'🔥',preset:{frame:'fuego',background:'brasa',avatar:'leon',title:'guerrero',effects:'ember',badge:'flame',hair:'natural',outfit:'basic',accessory:'none'}},
  {key:'celestial',label:'Cielo abierto',description:'Luz, paz y una identidad luminosa.',emoji:'🕊️',preset:{frame:'cielo',background:'aurora',avatar:'paloma',title:'adorador',effects:'aurora',badge:'star',hair:'waves',outfit:'white',accessory:'halo'}},
  {key:'guerrero',label:'Guerrero de fe',description:'Un look de fuerza, valor y propósito.',emoji:'🛡️',preset:{frame:'corona',background:'volcan',avatar:'guerrero',title:'valiente',effects:'spark',badge:'shield',hair:'fade',outfit:'warrior',accessory:'wristband'}},
  {key:'urbano',label:'Luz urbana',description:'Estilo moderno con personalidad propia.',emoji:'🎧',preset:{frame:'amatista',background:'noche',avatar:'estrella',title:'chispa',effects:'galaxy',badge:'heart',hair:'curly',outfit:'street',accessory:'headphones'}},
  {key:'sabiduria',label:'Amante de la Palabra',description:'Una identidad centrada en aprender y crecer.',emoji:'📖',preset:{frame:'oro',background:'ocaso',avatar:'cordero',title:'sabio',effects:'halo',badge:'book',hair:'classic',outfit:'formal',accessory:'book'}},
  {key:'imperial',label:'Imperial',description:'Oro antiguo, amatista y presencia de leyenda.',emoji:'👑',preset:{frame:'emperador',background:'imperial',avatar:'fenix-real',title:'leyenda',effects:'royal',badge:'royal',hair:'long',outfit:'royal',accessory:'wings'}},
  {key:'amatista',label:'Amatista real',description:'Tonos ciruela con detalles de oro suave.',emoji:'💜',preset:{frame:'amatista',background:'amatista',avatar:'pantera',title:'valiente',effects:'orbit',badge:'guardian',hair:'afro',outfit:'satin',accessory:'cape'}},
  {key:'aurum',label:'Aurum',description:'Un estilo luminoso con marco y detalles dorados.',emoji:'🌟',preset:{frame:'filigrana',background:'aurum',avatar:'guerrero',title:'guerrero',effects:'golden',badge:'victory',hair:'classic',outfit:'champion',accessory:'sword'}},
  {key:'misionero',label:'Luz en el mundo',description:'Una imagen alegre, cercana y lista para servir.',emoji:'🌍',preset:{frame:'esmeralda',background:'bosque',avatar:'aguila',title:'intercesor',effects:'sun',badge:'mission',hair:'braids',outfit:'sport',accessory:'book'}},
  {key:'cosmico',label:'Fuego galáctico',description:'Colores intensos, brillo y una vibra futurista.',emoji:'🌌',preset:{frame:'prisma',background:'cosmos',avatar:'fenix',title:'leyenda',effects:'galaxy',badge:'hope',hair:'afro',outfit:'street',accessory:'glasses'}},
];


type SavedLookTemplate = {key:string;label:string;description:string;emoji:string;preset:LookPreset};
function isSavedLookTemplate(value: unknown): value is SavedLookTemplate {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedLookTemplate>;
  const preset = item.preset as LookPreset | undefined;
  if (typeof item.key !== 'string' || typeof item.label !== 'string' || typeof item.description !== 'string' || typeof item.emoji !== 'string' || !preset) return false;
  return isValidLookValue('frames', preset.frame)
    && lookShop.backgrounds.some((entry) => entry.key === preset.background)
    && lookShop.avatars.some((entry) => entry.key === preset.avatar)
    && lookShop.titles.some((entry) => entry.key === preset.title)
    && lookShop.effects.some((entry) => entry.key === preset.effects)
    && lookShop.badges.some((entry) => entry.key === preset.badge)
    && lookShop.hair.some((entry) => entry.key === preset.hair)
    && lookShop.outfits.some((entry) => entry.key === preset.outfit)
    && lookShop.accessories.some((entry) => entry.key === preset.accessory);
}
const weeklyGrowthPlan = [
  {id:'day-1',day:'Día 1',title:'Una fe firme',reference:'Hebreos 11:1',challenge:'Escribe una situación en la que quieras confiar más en Dios.'},
  {id:'day-2',day:'Día 2',title:'Valor para avanzar',reference:'Josué 1:9',challenge:'Da hoy un paso que has estado posponiendo por temor.'},
  {id:'day-3',day:'Día 3',title:'Una vida de oración',reference:'1 Tesalonicenses 5:17',challenge:'Aparta unos minutos para orar por otra persona.'},
  {id:'day-4',day:'Día 4',title:'Amar al prójimo',reference:'Juan 13:34-35',challenge:'Haz un acto de servicio sin esperar reconocimiento.'},
  {id:'day-5',day:'Día 5',title:'Palabras que edifican',reference:'Efesios 4:29',challenge:'Anima a alguien con palabras sinceras.'},
  {id:'day-6',day:'Día 6',title:'Luz en tu entorno',reference:'Mateo 5:14-16',challenge:'Comparte una buena acción y sé ejemplo con respeto.'},
  {id:'day-7',day:'Día 7',title:'Gratitud',reference:'1 Tesalonicenses 5:18',challenge:'Anota tres motivos por los que estás agradecido.'},
];

const games: {id: MiniGame; title: string; subtitle: string; icon: typeof Trophy; color: string}[] = [
  {id: 'trivia', title: 'Trivia bíblica', subtitle: 'Preguntas y conocimiento', icon: BookOpen, color: 'orange'},
  {id: 'verse', title: 'Completa el versículo', subtitle: 'Memoria de las Escrituras', icon: BookMarked, color: 'violet'},
  {id: 'memory', title: 'Memoria bíblica', subtitle: 'Encuentra las parejas', icon: Brain, color: 'cyan'},
  {id: 'challenge', title: 'Reto de 60 segundos', subtitle: 'Rapidez y precisión', icon: Timer, color: 'green'},
  {id: 'survival', title: 'Supervivencia', subtitle: 'No pierdas tus tres vidas', icon: Flame, color: 'rose'},
  {id: 'duel', title: 'Duelo 1 contra 1', subtitle: 'Juega por turnos en el mismo móvil', icon: Swords, color: 'gold'},
  {id: 'order', title: 'Ordena el versículo', subtitle: 'Reconstruye las palabras', icon: Layers, color: 'blue'},
  {id: 'truefalse', title: 'Verdadero o falso', subtitle: 'Detecta afirmaciones bíblicas', icon: BadgeCheck, color: 'green'},
  {id: 'whoami', title: '¿Quién soy?', subtitle: 'Descubre el personaje con pistas', icon: UserSearch, color: 'violet'},
];

function getInitials(name: string): string {
  const cleanName = name.trim();
  if (!cleanName || cleanName === 'Perfil sin nombre') return 'JF';
  return cleanName.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function YouthAvatar({profile, large = false}: {profile: PublicProfile; large?: boolean}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className={`youth-avatar youth-avatar-frame-${profile.frame || 'fuego'} ${large ? 'large' : ''}`}>
      {profile.pic && !imageFailed ? (
        <img src={profile.pic} alt={`Fotografía de ${profile.name}`} onError={() => setImageFailed(true)} />
      ) : <span className={profile.avatar ? 'youth-avatar-symbol' : ''}>{profile.avatar ? ({paloma:'🕊️',leon:'🦁',aguila:'🦅',cordero:'🐑',mariposa:'🦋',lobo:'🐺',estrella:'🌟',guerrero:'🛡️',dragon:'🐉',cohete:'🚀',rey:'👑',volcan:'🌋',fenix:'🔥','fenix-real':'🔥',delfin:'🐬',zorro:'🦊',pantera:'🐆',tigre:'🐯'} as Record<string,string>)[profile.avatar] ?? getInitials(profile.name) : getInitials(profile.name)}</span>}
    </div>
  );
}

function isValidLookValue(category: LookShopCategory, value: unknown): value is string {
  // "amatista" era el identificador original del marco ciruela; se conserva
  // para plantillas y perfiles antiguos aunque la tienda actual lo llame "neon".
  if (category === 'frames' && value === 'amatista') return true;
  return typeof value === 'string' && lookShop[category].some((item) => item.key === value);
}

function readLook(profile: PublicProfile): ProfileLook {
  const remoteItems = Array.isArray(profile.ownedItems)
    ? profile.ownedItems.filter((item): item is string => typeof item === 'string' && item.length <= 120).slice(0, 400)
    : [];
  const equippedValue = (prefix: string, fallback: string) =>
    remoteItems.find((item) => item.startsWith(prefix))?.slice(prefix.length) || fallback;
  const rawFlames = Number(profile.flames);
  const remote: ProfileLook = {
    frame: isValidLookValue('frames', profile.frame) ? profile.frame : defaultLook.frame,
    background: isValidLookValue('backgrounds', profile.background) ? profile.background : defaultLook.background,
    avatar: isValidLookValue('avatars', profile.avatar) ? profile.avatar : defaultLook.avatar,
    title: isValidLookValue('titles', profile.title) ? profile.title : defaultLook.title,
    ownedItems: remoteItems,
    flames: Number.isFinite(rawFlames) ? Math.max(0, Math.min(100000, rawFlames)) : 0,
    effects: equippedValue('equipped:fx:', 'ember'),
    badge: equippedValue('equipped:bdg:', 'flame'),
    hair: equippedValue('equipped:hair:', 'natural'),
    outfit: equippedValue('equipped:outfit:', 'basic'),
    accessory: equippedValue('equipped:accessory:', 'none'),
  };

  try {
    const raw = window.localStorage.getItem(`jf-youth-look-${profile.id}`);
    if (!raw) return remote;
    const parsed = JSON.parse(raw) as Partial<ProfileLook>;
    const localItems = Array.isArray(parsed.ownedItems)
      ? parsed.ownedItems.filter((item): item is string => typeof item === 'string' && item.length <= 120).slice(0, 400)
      : remote.ownedItems;
    const localFlames = Number(parsed.flames);
    return {
      frame: isValidLookValue('frames', parsed.frame) ? parsed.frame : remote.frame,
      background: isValidLookValue('backgrounds', parsed.background) ? parsed.background : remote.background,
      avatar: isValidLookValue('avatars', parsed.avatar) ? parsed.avatar : remote.avatar,
      title: isValidLookValue('titles', parsed.title) ? parsed.title : remote.title,
      ownedItems: localItems,
      flames: Number.isFinite(localFlames) ? Math.max(0, Math.min(100000, localFlames)) : remote.flames,
      effects: isValidLookValue('effects', parsed.effects) ? parsed.effects : remote.effects,
      badge: isValidLookValue('badges', parsed.badge) ? parsed.badge : remote.badge,
      hair: isValidLookValue('hair', parsed.hair) ? parsed.hair : remote.hair,
      outfit: isValidLookValue('outfits', parsed.outfit) ? parsed.outfit : remote.outfit,
      accessory: isValidLookValue('accessories', parsed.accessory) ? parsed.accessory : remote.accessory,
    };
  } catch {
    return remote;
  }
}

function readProfileExtras(profileId: string): ProfileExtras {
  try {
    const raw = window.localStorage.getItem(`jf-youth-profile-extra-${profileId}`);
    if (!raw) return defaultProfileExtras;
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return {
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName.slice(0,60) : '',
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname.slice(0,30) : '',
      motto: typeof parsed.motto === 'string' ? parsed.motto.slice(0,100) : '',
      weeklyGoal: typeof parsed.weeklyGoal === 'string' ? parsed.weeklyGoal.slice(0,160) : '',
    };
  } catch {
    return defaultProfileExtras;
  }
}

function formatActivityDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || 'Fecha por confirmar';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function ActivityCard({activity}: {activity: WeeklyActivity}) {
  return (
    <article className="youth-activity-card">
      <div className="youth-activity-date"><CalendarDays size={17} /><span>{formatActivityDate(activity.date)}</span></div>
      <h3>{activity.title}</h3>
      {activity.description && <p>{activity.description}</p>}
      <div className="youth-activity-meta">
        {activity.time && <span><Clock3 size={14} /> {activity.time}</span>}
        {activity.location && <span><MapPin size={14} /> {activity.location}</span>}
      </div>
    </article>
  );
}

function HallOfFame({topPlayers, faithful, attendanceLimited}: {
  topPlayers: HallOfFamePlayer[];
  faithful: FaithfulPlayer[];
  attendanceLimited: boolean;
}) {
  return (
    <section className="youth-hall-grid">
      <article className="youth-hall-card youth-hall-points">
        <header><Crown size={20} /><div><span>HALL OF FAME</span><h2>Top 3 de puntos</h2></div></header>
        {topPlayers.length ? (
          <ol className="youth-podium-list">
            {topPlayers.map((player, index) => (
              <li key={player.id} className={`podium-place place-${index + 1}`}>
                <span className="youth-podium-medal">{index === 0 ? <Crown size={17}/> : <Medal size={17}/>}</span>
                <span className="youth-podium-rank">0{index + 1}</span>
                {player.pic ? <img src={player.pic} alt="" /> : <b>{getInitials(player.name)}</b>}
                <span className="youth-podium-name">{player.name}</span>
                <strong>{player.points} pts</strong>
              </li>
            ))}
          </ol>
        ) : <p className="youth-data-empty">Todavía no hay puntuaciones públicas registradas.</p>}
      </article>

      <article className="youth-hall-card youth-hall-faithful">
        <header><Flame size={20} /><div><span>CONSTANCIA Y COMPROMISO</span><h2>Top 10 más fieles</h2></div></header>
        <p className="youth-hall-caption">Según el total de servicios donde cada joven figura como presente.</p>
        {attendanceLimited && <p className="youth-hall-limited" role="note">El cálculo está limitado a las 1.000 reuniones más recientes. Revisa el informe completo si la comunidad supera ese volumen.</p>}
        {faithful.length ? (
          <ol className="youth-faithful-list">
            {faithful.map((player, index) => (
              <li key={player.id}>
                <span className="youth-faithful-rank">{index + 1}</span>
                <span className="youth-faithful-name">{player.name}</span>
                <strong>{player.attendances} {player.attendances === 1 ? 'servicio asistido' : 'servicios asistidos'}</strong>
              </li>
            ))}
          </ol>
        ) : <p className="youth-data-empty">Aún no hay registros de asistencia disponibles para esta clasificación.</p>}
      </article>
    </section>
  );
}

export default function YouthPortalPage() {
  const { theme, nextThemeLabel, toggleTheme } = useThemePreference();
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [activeYouthSection, setActiveYouthSection] = useState<YouthSection>('home');
  const [openingProfileId, setOpeningProfileId] = useState<string | null>(null);

  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [topPlayers, setTopPlayers] = useState<HallOfFamePlayer[]>([]);
  const [faithful, setFaithful] = useState<FaithfulPlayer[]>([]);
  const [attendanceLimited, setAttendanceLimited] = useState(false);
  const [portalDataError, setPortalDataError] = useState('');

  const [look, setLook] = useState<ProfileLook>(defaultLook);
  const [profileExtras, setProfileExtras] = useState<ProfileExtras>(defaultProfileExtras);
  const [editingLook, setEditingLook] = useState(false);
  const [lookCategory, setLookCategory] = useState<LookShopCategory>('frames');
  const [lookSaving, setLookSaving] = useState(false);
  const [portalExiting, setPortalExiting] = useState(false);
  const [gameExiting, setGameExiting] = useState(false);
  const [activeGame, setActiveGame] = useState<MiniGame | null>(null);
  const [showAllRanking, setShowAllRanking] = useState(false);
  const [expandedRankId, setExpandedRankId] = useState<string | null>(null);
  const [growthDone, setGrowthDone] = useState<string[]>([]);
  const [journalEntry, setJournalEntry] = useState('');
  const [journalStatus, setJournalStatus] = useState('');
  const [savedLookTemplates, setSavedLookTemplates] = useState<SavedLookTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');

  const [prayerName, setPrayerName] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('General');
  const [prayerMessage, setPrayerMessage] = useState('');
  const [prayerBusy, setPrayerBusy] = useState(false);
  const [prayerStatus, setPrayerStatus] = useState('');
  const [lookNotice, setLookNotice] = useState('');

  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState('');
  const audioRef = useRef<AudioContext | null>(null);
  const audioMasterRef = useRef<GainNode | null>(null);

  const profileRequestRef = useRef(0);

  const loadProfiles = useCallback(async () => {
    const requestId = ++profileRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await getPublicProfiles();
      if (requestId === profileRequestRef.current) setProfiles(result);
    } catch (cause) {
      if (requestId === profileRequestRef.current) {
        console.error('Error cargando perfiles públicos:', cause);
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los perfiles.');
      }
    } finally {
      if (requestId === profileRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadProfiles();
    Promise.allSettled([getWeeklyActivities(), getHallOfFame()]).then((results) => {
      if (!active) return;
      if (results[0].status === 'fulfilled') {
        setActivities(results[0].value);
      } else {
        setPortalDataError('No se pudieron consultar las actividades publicadas en el ranking original.');
      }
      if (results[1].status === 'fulfilled') {
        setTopPlayers(results[1].value.topPlayers ?? []);
        setFaithful(results[1].value.faithful ?? []);
        setAttendanceLimited(results[1].value.attendanceLimited === true);
      } else {
        setPortalDataError((previous) => previous || 'Las clasificaciones estarán disponibles cuando se publiquen los datos del ranking original.');
      }
    });
    return () => {
      active = false;
      profileRequestRef.current += 1;
      if (audioRef.current) {
        void audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
        audioMasterRef.current = null;
      }
    };
  }, [loadProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      setActiveYouthSection('home');
      setLook(readLook(selectedProfile));
      setProfileExtras(readProfileExtras(selectedProfile.id));
      setTemplateName('');
      setExpandedRankId(null);
      try {
        const savedPlan = JSON.parse(window.localStorage.getItem(`jf-youth-growth-${selectedProfile.id}`) || '[]') as unknown;
        setGrowthDone(Array.isArray(savedPlan) ? savedPlan.filter((item): item is string => typeof item === 'string' && weeklyGrowthPlan.some((day) => day.id === item)) : []);
        setJournalEntry(window.localStorage.getItem(`jf-youth-journal-${selectedProfile.id}`) || '');
        setJournalStatus('');
        const templateData = JSON.parse(window.localStorage.getItem(`jf-youth-templates-${selectedProfile.id}`) || '[]') as unknown;
        setSavedLookTemplates(Array.isArray(templateData) ? templateData.filter(isSavedLookTemplate).slice(0,12) : []);
      } catch {
        setGrowthDone([]);
        setJournalEntry('');
        setSavedLookTemplates([]);
      }
      // La selección pública no verifica identidad: no prellenar el nombre
      // evita enviar peticiones en nombre de otra persona.
      setPrayerName('');
      setLookNotice('');
    } else {
      setEditingLook(false);
      setActiveGame(null);
      setSavedLookTemplates([]);
      setTemplateName('');
      setJournalEntry('');
      setJournalStatus('');
      if (audioRef.current) {
        void audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
        audioMasterRef.current = null;
      }
      setSoundOn(false);
    }
  }, [selectedProfile]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return profiles;
    return profiles.filter((profile) => `${profile.name} ${profile.nick}`.toLocaleLowerCase('es').includes(query));
  }, [profiles, search]);

  const communityRanking = useMemo(() => {
    const sorted = [...profiles].sort((a, b) =>
      (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name, 'es'),
    );
    let position = 0;
    let previousPoints: number | null = null;
    return sorted.map((profile, index) => {
      const points = profile.points ?? 0;
      if (previousPoints === null || points !== previousPoints) position = index + 1;
      previousPoints = points;
      return {...profile, position};
    });
  }, [profiles]);

  const personalStanding = communityRanking.find((item) => item.id === selectedProfile?.id) ?? null;
  const personalStandingIndex = personalStanding
    ? communityRanking.findIndex((item) => item.id === personalStanding.id)
    : -1;
  const personalPoints = personalStanding?.points ?? 0;
  const nextHigherPlayer = personalStandingIndex > 0
    ? [...communityRanking.slice(0, personalStandingIndex)].reverse().find((item) => (item.points ?? 0) > personalPoints) ?? null
    : null;
  const pointsToNextPlayer = nextHigherPlayer
    ? Math.max(0, (nextHigherPlayer.points ?? 0) - (personalStanding?.points ?? 0))
    : 0;
  const rankingLeaderPoints = communityRanking[0]?.points ?? 0;
  const visibleCommunityRanking = showAllRanking ? communityRanking : communityRanking.slice(0, 5);
  const growthProgress = Math.round((growthDone.length / weeklyGrowthPlan.length) * 100);

  const topPlayersWithPhotos = useMemo(() => topPlayers.map((player) => ({
    ...player,
    pic: player.pic || profiles.find((profile) => profile.id === player.id)?.pic || '',
  })), [topPlayers, profiles]);

  const faithfulWithPhotos = useMemo(() => faithful.map((player) => ({
    ...player,
    pic: player.pic || profiles.find((profile) => profile.id === player.id)?.pic || '',
  })), [faithful, profiles]);


  const publishedActivities = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const weekStart = key(start);
    const weekEnd = key(end);
    return activities.filter((activity) => activity.date >= weekStart && activity.date <= weekEnd);
  }, [activities]);

  async function persistLook(next: ProfileLook, successMessage: string) {
    if (!selectedProfile) return;
    setLook(next);
    setLookSaving(true);
    setLookNotice('');
    try {
      // La selección del perfil es pública y no demuestra quién lo está usando.
      // Por eso la apariencia se guarda localmente y nunca modifica datos de otra persona.
      window.localStorage.setItem(`jf-youth-look-${selectedProfile.id}`, JSON.stringify(next));
      setLookNotice(successMessage + ' Guardado en este dispositivo.');
    } catch {
      setLook(readLook(selectedProfile));
      setLookNotice('El navegador no permitió guardar la personalización en este dispositivo.');
    } finally {
      setLookSaving(false);
    }
  }

  async function equipLookItem(category: LookShopCategory, item: (typeof lookShop)[LookShopCategory][number]) {
    if (!selectedProfile) return;
    const ownedKey = `${lookCategoryStorage[category]}:${item.key}`;
    const alreadyOwned = item.cost === 0 || look.ownedItems.includes(ownedKey);
    if (!alreadyOwned && look.flames < item.cost) {
      setLookNotice(`Te faltan ${item.cost - look.flames} Llamas para desbloquear ${item.label}.`);
      return;
    }
    const equippedPrefixes: Partial<Record<LookShopCategory, string>> = {
      effects:'equipped:fx:',
      badges:'equipped:bdg:',
      hair:'equipped:hair:',
      outfits:'equipped:outfit:',
      accessories:'equipped:accessory:',
    };
    const prefix = equippedPrefixes[category];
    const retainedItems = prefix ? look.ownedItems.filter((value) => !value.startsWith(prefix)) : look.ownedItems;
    const nextOwnedItems = Array.from(new Set([
      ...retainedItems,
      ...(!alreadyOwned && item.cost > 0 ? [ownedKey] : []),
      ...(prefix ? [`${prefix}${item.key}`] : []),
    ]));
    const next: ProfileLook = {
      ...look,
      frame: category === 'frames' ? item.key : look.frame,
      avatar: category === 'avatars' ? item.key : look.avatar,
      title: category === 'titles' ? item.key : look.title,
      background: category === 'backgrounds' ? item.key : look.background,
      effects: category === 'effects' ? item.key : look.effects,
      badge: category === 'badges' ? item.key : look.badge,
      hair: category === 'hair' ? item.key : look.hair,
      outfit: category === 'outfits' ? item.key : look.outfit,
      accessory: category === 'accessories' ? item.key : look.accessory,
      ownedItems: nextOwnedItems,
      flames: alreadyOwned ? look.flames : look.flames - item.cost,
    };
    await persistLook(next, item.label + ' equipado correctamente.');
  }

  async function applyLookTemplate(templateKey: string) {
    if (!selectedProfile) return;
    const template = [...lookTemplates, ...savedLookTemplates].find((item) => item.key === templateKey);
    if (!template) return;
    const mappings: [LookShopCategory, string][] = [
      ['frames',template.preset.frame],['avatars',template.preset.avatar],['titles',template.preset.title],
      ['backgrounds',template.preset.background],['effects',template.preset.effects],['badges',template.preset.badge],
      ['hair',template.preset.hair],['outfits',template.preset.outfit],['accessories',template.preset.accessory],
    ];
    let cost = 0;
    const owned = [...look.ownedItems];
    const replacements: Record<string,string> = {
      effects:'equipped:fx:',badges:'equipped:bdg:',hair:'equipped:hair:',
      outfits:'equipped:outfit:',accessories:'equipped:accessory:',
    };
    for (const [category,key] of mappings) {
      const item = lookShop[category].find((entry) => entry.key === key);
      if (!item) continue;
      const ownedKey = `${lookCategoryStorage[category]}:${item.key}`;
      const alreadyOwned = item.cost === 0 || owned.includes(ownedKey);
      if (!alreadyOwned) {
        cost += item.cost;
        owned.push(ownedKey);
      }
      const prefix = replacements[category];
      if (prefix) {
        for (let index = owned.length - 1; index >= 0; index -= 1) {
          if (owned[index].startsWith(prefix)) owned.splice(index, 1);
        }
        owned.push(`${prefix}${key}`);
      }
    }
    if (look.flames < cost) {
      setLookNotice(`Esta plantilla requiere ${cost} Llamas y tienes ${look.flames}.`);
      return;
    }
    const next: ProfileLook = {...look,...template.preset,ownedItems:Array.from(new Set(owned)),flames:look.flames-cost};
    await persistLook(next,`Plantilla ${template.label} aplicada.`);
  }


  function saveCurrentLookTemplate() {
    if (!selectedProfile) return;
    const label = templateName.trim().slice(0,32);
    if (!label) { setLookNotice('Escribe un nombre para guardar tu plantilla.'); return; }
    if (savedLookTemplates.length >= 12) { setLookNotice('Puedes guardar hasta 12 plantillas propias por perfil.'); return; }
    const nextTemplate: SavedLookTemplate = {
      key: `custom-${Date.now()}`, label, description: 'Tu combinación personal', emoji: '🎨',
      preset: {frame:look.frame,background:look.background,avatar:look.avatar,title:look.title,effects:look.effects,badge:look.badge,hair:look.hair,outfit:look.outfit,accessory:look.accessory},
    };
    const next = [...savedLookTemplates,nextTemplate];
    try {
      window.localStorage.setItem(`jf-youth-templates-${selectedProfile.id}`, JSON.stringify(next));
      setSavedLookTemplates(next);
      setTemplateName('');
      setLookNotice(`Plantilla «${label}» guardada en este dispositivo.`);
    } catch {
      setLookNotice('No se pudo guardar la plantilla en este navegador.');
    }
  }

  function deleteSavedLookTemplate(templateKey: string) {
    if (!selectedProfile) return;
    const next = savedLookTemplates.filter((template) => template.key !== templateKey);
    try {
      window.localStorage.setItem(`jf-youth-templates-${selectedProfile.id}`, JSON.stringify(next));
      setSavedLookTemplates(next);
      setLookNotice('Plantilla eliminada.');
    } catch {
      setLookNotice('No se pudo eliminar la plantilla.');
    }
  }
  function toggleGrowthDay(dayId: string) {
    if (!selectedProfile) return;
    setGrowthDone((previous) => {
      const next = previous.includes(dayId)
        ? previous.filter((item) => item !== dayId)
        : [...previous, dayId];
      try {
        window.localStorage.setItem(`jf-youth-growth-${selectedProfile.id}`, JSON.stringify(next));
      } catch {
        setLookNotice('El navegador no permitió guardar el progreso de este plan.');
      }
      return next;
    });
  }
  function saveJournalEntry() {
    if (!selectedProfile) return;
    try {
      window.localStorage.setItem(`jf-youth-journal-${selectedProfile.id}`, journalEntry.trim().slice(0,3000));
      setJournalStatus('Reflexión guardada en este dispositivo.');
    } catch {
      setJournalStatus('No se pudo guardar. Revisa el espacio disponible del navegador.');
    }
  }

  function saveProfileExtras() {
    if (!selectedProfile) return;
    const safeExtras = {
      displayName: profileExtras.displayName.trim().slice(0,60),
      nickname: profileExtras.nickname.trim().replace(/^@/, '').slice(0,30),
      motto: profileExtras.motto.trim().slice(0,100),
      weeklyGoal: profileExtras.weeklyGoal.trim().slice(0,160),
    };
    try {
      window.localStorage.setItem(`jf-youth-profile-extra-${selectedProfile.id}`, JSON.stringify(safeExtras));
      setProfileExtras(safeExtras);
      setLookNotice('Tu información personal quedó guardada en este dispositivo.');
    } catch {
      setLookNotice('El navegador no permitió guardar los cambios en este dispositivo.');
    }
  }

  function enterProfile(profile: PublicProfile) {
    if (openingProfileId) return;
    setOpeningProfileId(profile.id);
    window.setTimeout(() => {
      setSelectedProfile(profile);
      setOpeningProfileId(null);
    }, 260);
  }

  function leaveProfile() {
    setPortalExiting(true);
    window.setTimeout(() => {
      setSelectedProfile(null);
      setActiveYouthSection('home');
      setPortalExiting(false);
    }, 360);
  }

  async function toggleAmbientSound() {
    setSoundError('');
    if (audioRef.current) {
      const context = audioRef.current;
      const master = audioMasterRef.current;
      audioRef.current = null;
      audioMasterRef.current = null;
      if (master && context.state !== 'closed') {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(master.gain.value, context.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, context.currentTime + 0.55);
        window.setTimeout(() => {
          void context.close().catch(() => undefined);
        }, 650);
      } else {
        await context.close().catch(() => undefined);
      }
      setSoundOn(false);
      return;
    }

    try {
      const context = new AudioContext();
      await context.resume();
      const master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(0.045, context.currentTime + 1.4);
      master.connect(context.destination);
      audioRef.current = context;
      audioMasterRef.current = master;

      // Armonías cálidas y suaves para crear un ambiente discreto.
      [[110, 0.15], [164.81, 0.075], [220, 0.025]].forEach(([frequency, volume]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = volume;
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start();
      });

      // Ruido marrón filtrado: textura semejante a viento y brasas, sin archivos externos.
      const noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < channel.length; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = (previous + 0.025 * white) / 1.025;
        channel[index] = previous * 3.2;
      }

      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 360;
      noiseGain.gain.value = 0.34;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();

      // Movimiento lento del filtro para que el sonido no sea estático.
      const breeze = context.createOscillator();
      const breezeDepth = context.createGain();
      breeze.type = 'sine';
      breeze.frequency.value = 0.075;
      breezeDepth.gain.value = 95;
      breeze.connect(breezeDepth);
      breezeDepth.connect(filter.frequency);
      breeze.start();

      setSoundOn(true);
    } catch {
      setSoundError('Este navegador no permite reproducir el ambiente sonoro.');
      setSoundOn(false);
      if (audioRef.current) {
        void audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
        audioMasterRef.current = null;
      }
    }
  }

  async function handlePrayerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let lastSent = 0;
    try { lastSent = Number(window.localStorage.getItem('jf-youth-prayer-last') ?? 0); } catch { /* almacenamiento opcional */ }
    if (Date.now() - lastSent < 30_000) {
      setPrayerStatus('Espera unos segundos antes de enviar otra petición.');
      return;
    }
    setPrayerStatus('');
    setPrayerBusy(true);
    try {
      await sendPrayerRequest({
        memberId: selectedProfile?.id ?? '',
        requester: prayerName.trim() || 'Anónimo',
        category: prayerCategory,
        message: prayerMessage.trim(),
      });
      try { window.localStorage.setItem('jf-youth-prayer-last', String(Date.now())); } catch { /* almacenamiento opcional */ }
      setPrayerMessage('');
      setPrayerStatus('Tu petición fue enviada al equipo de oración. Gracias por confiar.');
    } catch (cause) {
      setPrayerStatus(cause instanceof Error ? cause.message : 'No se pudo enviar la petición.');
    } finally {
      setPrayerBusy(false);
    }
  }

  if (selectedProfile && activeGame) {
    const exitGame = () => {
      setGameExiting(true);
      window.setTimeout(() => {
        setActiveGame(null);
        setActiveYouthSection('games');
        setGameExiting(false);
      }, 300);
    };
    return (
      <main className={`${styles.scope} youth-portal`}>
        <div className={`youth-container youth-game-shell ${gameExiting ? "youth-game-exit" : ""}`}>
          <div className="youth-game-topbar">
            <button className="youth-back" type="button" onClick={exitGame}><ArrowLeft size={17}/> Volver a mi espacio</button>
            <span><Gamepad2 size={16}/> JUGADOR · {selectedProfile.name}</span>
            <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={`Cambiar a ${nextThemeLabel}`} title={`Cambiar a ${nextThemeLabel}`}>
              <ThemeIcon size={17}/>
              <span>Cambiar a {nextThemeLabel}</span>
            </button>
          </div>
          <Suspense fallback={<div className="jf-page-loading" role="status" aria-live="polite"><span/><strong>Preparando el juego</strong><small>Un momento…</small></div>}>
            {activeGame === 'trivia' && <TriviaGame onExit={exitGame}/>}
            {activeGame === 'verse' && <VerseGame onExit={exitGame}/>}
            {activeGame === 'memory' && <MemoryGame onExit={exitGame}/>}
            {activeGame === 'challenge' && <ChallengeGame onExit={exitGame}/>}
            {activeGame === 'survival' && <SurvivalGame onExit={exitGame}/>}
            {activeGame === 'duel' && <DuelGame onExit={exitGame}/>}
            {activeGame === 'order' && <OrderVerseGame onExit={exitGame}/>}
            {activeGame === 'truefalse' && <TrueFalseGame onExit={exitGame}/>}
            {activeGame === 'whoami' && <WhoAmIGame onExit={exitGame}/>}
          </Suspense>
        </div>
      </main>
    );
  }

  if (selectedProfile) {
    return (
      <motion.main
        className={`${styles.scope} ${dashboardStyles.dashboard} youth-portal ${portalExiting ? "youth-profile-exit" : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="youth-container youth-home-enter">
          <div className="youth-home-toolbar">
            <button type="button" className="youth-back" onClick={leaveProfile}>
              <ArrowLeft size={17}/> Cambiar de perfil
            </button>
            <button type="button" aria-pressed={soundOn} className={`youth-sound-toggle ${soundOn ? 'active' : ''}`} onClick={() => void toggleAmbientSound()}>
              {soundOn ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              {soundOn ? 'Ambiente activado' : 'Activar ambiente'}
            </button>
            <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={`Cambiar a ${nextThemeLabel}`} title={`Cambiar a ${nextThemeLabel}`}>
              <ThemeIcon size={17}/>
              <span>Cambiar a {nextThemeLabel}</span>
            </button>
          </div>

          {activeYouthSection === 'home' && (<div className="youth-tab-page youth-home-tab">
          <section className="youth-welcome youth-home">
            <div className="youth-welcome-decoration"><Sparkles size={24}/></div>
            <button type="button" className="youth-customize-trigger" onClick={() => {setActiveYouthSection('space');setEditingLook(true);}}>
              <Palette size={17}/> Personalizar perfil
            </button>
            <div className="youth-profile-avatar-card" aria-label="Avatar del perfil">
              <YouthAvatar profile={{...selectedProfile, frame: look.frame, avatar: look.avatar}} large/>
            </div>
            <span className={`youth-profile-badge badge-${look.badge}`}>
              {({flame:'🔥 Llama viva',book:'📖 Amante de la Palabra',heart:'💛 Corazón de servicio',shield:'🛡️ Fe firme',star:'⭐ Luz del mundo',crown:'👑 Corona de vida'} as Record<string,string>)[look.badge] ?? '🔥 Llama viva'}
            </span>
            <span className="youth-brand-label">COMUNIDAD JÓVENES DE FUEGO</span>
            <h1 className="jf-title-reveal">¡Hola, <span className="jf-name-reveal">{profileExtras.displayName || selectedProfile.name}</span>!</h1>
            <p>Tu espacio para crecer, servir, aprender y compartir.</p>
            {(profileExtras.nickname || selectedProfile.nick) && <span className="youth-profile-nick">@{profileExtras.nickname || selectedProfile.nick}</span>}
            {profileExtras.motto && <p className="youth-profile-motto">“{profileExtras.motto}”</p>}
            <div className="youth-look-signature">
              <span>Cabello: {look.hair}</span><span>Ropa: {look.outfit}</span><span>Accesorio: {look.accessory}</span>
            </div>
            {look.title && <span className="youth-profile-title">{({chispa:'Chispa Encendida',valiente:'Valiente',guerrero:'Guerrero de Fe',intercesor:'Intercesor',adorador:'Adorador',sabio:'Sabio de la Palabra',leyenda:'Leyenda de Fuego'} as Record<string,string>)[look.title] ?? look.title}</span>}
            <div className="youth-profile-quickstats">
              <span><Star size={15}/> {selectedProfile.points > 0 ? `${selectedProfile.points} puntos públicos` : 'Puntos aún no publicados'}</span>
              <span><Flame size={15}/> {look.flames} Llamas</span>
              <span><ShieldCheck size={15}/> Perfil comunitario</span>
            </div>
          </section>

          {lookNotice && <p className="youth-look-notice" role="status">{lookNotice}</p>}

          {profileExtras.weeklyGoal && <section className="youth-personal-goal"><span>MI META DE LA SEMANA</span><p>{profileExtras.weeklyGoal}</p></section>}
          </div>)}

          {activeYouthSection === 'space' && editingLook && (
            <section className="youth-customizer">
              <header>
                <WandSparkles size={20}/>
                <div><b>Forja tu identidad</b><span>Desbloquea marcos, avatares, títulos y mundos con tus Llamas.</span></div>
                <strong className="youth-store-wallet"><Flame size={16}/> {look.flames}</strong>
                <button type="button" aria-label="Cerrar personalización" onClick={() => setEditingLook(false)}><X size={18}/></button>
              </header>
              <section className="youth-look-templates">
                <div className="youth-look-templates-heading"><b>Plantillas de estilo</b><span>Combinaciones listas para transformar tu perfil.</span></div>
                <div className="youth-look-templates-grid">
                  {lookTemplates.map((template) => (
                    <button type="button" key={template.key} onClick={() => void applyLookTemplate(template.key)} disabled={lookSaving}>
                      <span>{template.emoji}</span><b>{template.label}</b><small>{template.description}</small>
                    </button>
                  ))}
                </div>
              </section>
              <div className="youth-custom-template-create">
                <label htmlFor="youth-template-name">Guarda tu propio diseño</label>
                <div>
                  <input id="youth-template-name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={32} placeholder="Ej. Mi estilo de fuego" />
                  <button type="button" onClick={saveCurrentLookTemplate} disabled={lookSaving || !templateName.trim()}><Save size={15}/> Guardar plantilla</button>
                </div>
                <small>Guarda la combinación de marco, fondo, avatar, título y accesorios cosméticos. El perfil utiliza un avatar sencillo en 2D.</small>
              </div>
              {savedLookTemplates.length > 0 && (
                <div className="youth-saved-templates">
                  <div className="youth-look-templates-heading"><b>Mis plantillas</b><span>{savedLookTemplates.length} de 12 diseños guardados en este dispositivo.</span></div>
                  <div className="youth-saved-templates-grid">
                    {savedLookTemplates.map((template) => (
                      <article key={template.key}>
                        <div><span>{template.emoji}</span><b>{template.label}</b><small>Plantilla personal</small></div>
                        <button type="button" onClick={() => void applyLookTemplate(template.key)} disabled={lookSaving}>Aplicar</button>
                        <button type="button" className="youth-delete-template" onClick={() => deleteSavedLookTemplate(template.key)} aria-label={`Eliminar plantilla ${template.label}`}><Trash2 size={14}/></button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              <nav className="youth-store-tabs" aria-label="Personalización">
                {([
                  ['frames','Marcos'],['avatars','Avatares'],['titles','Títulos'],['backgrounds','Fondos'],
                  ['effects','Efectos'],['badges','Insignias'],
                  ['hair','Cabello'],['outfits','Ropa'],['accessories','Accesorios'],
                ] as [LookShopCategory,string][]).map(([key,label]) => (
                  <button type="button" key={key} className={lookCategory === key ? 'active' : ''} onClick={() => setLookCategory(key)}>{label}</button>
                ))}
              </nav>
              <div className="youth-store-grid">
                {lookShop[lookCategory].map((item) => {
                  const field = lookCategoryField[lookCategory];
                  const selected = look[field] === item.key;
                  const unlocked = item.cost === 0 || look.ownedItems.includes(`${lookCategoryStorage[lookCategory]}:${item.key}`);
                  return (
                    <button
                      type="button"
                      key={item.key || 'default'}
                      className={`youth-store-item ${selected ? 'selected' : ''} ${unlocked ? 'unlocked' : 'locked'}`}
                      disabled={lookSaving}
                      onClick={() => void equipLookItem(lookCategory,item)}
                    >
                      <span className="youth-store-item-art">{item.emoji}</span>
                      <b>{item.label}</b>
                      <small>{selected ? 'Equipado' : unlocked ? 'Desbloqueado · Equipar' : `${item.cost} Llamas`}</small>
                    </button>
                  );
                })}
              </div>
              {lookNotice && <p className="youth-inline-warning" role="status">{lookNotice}</p>}
              <p className="youth-inline-warning">La apariencia se guarda en este dispositivo. Como el selector de perfiles es público y no verifica identidad, estos cambios no modifican el perfil compartido ni el saldo real de Llamas.</p>
              {lookSaving && <p className="youth-inline-warning">Guardando personalización...</p>}

            </section>
          )}

          {soundError && <p className="youth-inline-warning">{soundError}</p>}

          {activeYouthSection === 'activities' && (<div className="youth-tab-page youth-activities-tab">
          <section className="youth-activities">
            <header><div><span>AGENDA DE LA GENERACIÓN</span><h2>Actividades de esta semana</h2></div><CalendarDays size={22}/></header>
            {portalDataError && <p className="youth-inline-warning">{portalDataError}</p>}
            {publishedActivities.length ? (
              <div className="youth-activities-grid">{publishedActivities.map((activity) => <ActivityCard key={activity.id} activity={activity}/>)}</div>
            ) : (
              <div className="youth-empty-activities"><CalendarDays size={25}/><strong>No hay actividades publicadas por ahora</strong><span>Cuando el equipo publique la agenda, aparecerá aquí al entrar.</span></div>
            )}
          </section>

          </div>)}

          {activeYouthSection === 'ranking' && (<div className="youth-tab-page youth-ranking-tab">
          <HallOfFame topPlayers={topPlayersWithPhotos} faithful={faithfulWithPhotos} attendanceLimited={attendanceLimited}/>


          <section className="youth-immersive-ranking">
            <header className="youth-immersive-ranking-header">
              <div><span>RANKING DE LA GENERACIÓN</span><h2>La tabla de fuego</h2><p>Tu lugar en la comunidad, actualizado con los puntos públicos del ranking.</p></div>
              <div className="youth-ranking-live"><i/> CLASIFICACIÓN PÚBLICA</div>
            </header>
            <div className="youth-ranking-summary">
              <article><small>PARTICIPANTES</small><strong>{communityRanking.length}</strong><span>Perfiles publicados</span></article>
              <article><small>PUNTOS EN JUEGO</small><strong>{communityRanking.reduce((sum,item) => sum + (item.points ?? 0),0).toLocaleString('es-CO')}</strong><span>Total de puntos visibles</span></article>
              <article><small>LÍDER ACTUAL</small><strong>{communityRanking[0]?.points ?? 0}</strong><span>{communityRanking[0]?.name || 'Sin líder publicado'}</span></article>
            </div>
            {personalStanding ? (
              <div className="youth-my-standing-card">
                <div className="youth-my-standing-rank"><small>TU PUESTO</small><strong>#{personalStanding.position}</strong></div>
                <div className="youth-my-standing-copy"><b>{profileExtras.displayName || selectedProfile.name}</b><span>{(personalStanding.points ?? 0).toLocaleString('es-CO')} puntos acumulados</span></div>
                <div className="youth-my-standing-next">
                  {personalStanding.position === 1 ? <><b>¡Estás en el primer lugar!</b><span>Continúa participando y creciendo.</span></> : nextHigherPlayer ? <><b>Te faltan {pointsToNextPlayer.toLocaleString('es-CO')} puntos</b><span>Para alcanzar a {nextHigherPlayer.name}</span></> : <><b>Tu próxima meta está cerca</b><span>Participa en los desafíos de la comunidad.</span></>}
                </div>
              </div>
            ) : (
              <div className="youth-ranking-info-note">Este perfil aún no aparece en el listado público de puntuaciones.</div>
            )}
            {communityRanking.length ? (
              <>
                <div className="youth-ranking-podium">
                  {communityRanking.slice(0,3).map((player,index) => (
                    <article key={player.id} className={'youth-ranking-podium-card place-' + (index + 1)}>
                      <span className="youth-ranking-podium-place">{index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'} <small>PUESTO {player.position}</small></span>
                      <div className="youth-ranking-podium-avatar">{player.pic ? <img src={player.pic} alt={'Foto de ' + player.name} loading="lazy"/> : player.name.trim().split(/\s+/).slice(0,2).map((part) => part[0] ?? '').join('').toUpperCase()}</div>
                      <b>{player.name}</b><strong>{(player.points ?? 0).toLocaleString('es-CO')} <small>PTS</small></strong>
                      <div className="youth-ranking-meter"><i style={{width: (rankingLeaderPoints > 0 ? Math.max(4,((player.points ?? 0)/rankingLeaderPoints)*100) : 0) + '%' }}/></div>
                    </article>
                  ))}
                </div>
                <div className="youth-ranking-list-head"><div><b>Clasificación completa</b><span>Ordenada por puntos · Los empates comparten puesto</span></div><button type="button" onClick={() => setShowAllRanking((value) => !value)}>{showAllRanking ? 'Ver top 5' : 'Ver todos'} <ChevronRight size={14}/></button></div>
                <div className="youth-ranking-list">
                  {visibleCommunityRanking.map((player,index) => {
                    const expanded = expandedRankId === player.id;
                    const before = index > 0 ? visibleCommunityRanking[index - 1] : null;
                    const gap = before ? Math.max(0,(before.points ?? 0) - (player.points ?? 0)) : 0;
                    return (
                      <article key={player.id} className={'youth-ranking-row' + (player.id === selectedProfile.id ? ' is-me' : '')}>
                        <button type="button" className="youth-ranking-row-main" aria-expanded={expanded} onClick={() => setExpandedRankId(expanded ? null : player.id)}>
                          <span className="youth-ranking-row-position">#{player.position}</span>
                          <span className="youth-ranking-row-avatar">{player.pic ? <img src={player.pic} alt="" loading="lazy"/> : player.name.trim().split(/\s+/).slice(0,2).map((part) => part[0] ?? '').join('').toUpperCase()}</span>
                          <span className="youth-ranking-row-name"><b>{player.name}</b>{player.id === selectedProfile.id && <small>ESTE ERES TÚ</small>}</span>
                          <span className="youth-ranking-row-points">{(player.points ?? 0).toLocaleString('es-CO')} <small>PTS</small></span>
                          <span className="youth-ranking-row-chevron"><ChevronRight size={15}/></span>
                        </button>
                        {expanded && <div className="youth-ranking-tooltip"><span><b>Puesto:</b> #{player.position}</span><span><b>Puntos:</b> {(player.points ?? 0).toLocaleString('es-CO')}</span><span><b>Diferencia:</b> {index === 0 ? 'Lidera el ranking' : gap + ' puntos respecto al puesto anterior'}</span></div>}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="youth-ranking-empty">Todavía no hay puntos públicos para mostrar. Los resultados aparecerán aquí cuando el equipo publique la clasificación.</div>
            )}
            <p className="youth-ranking-footnote">Esta tabla usa exclusivamente los puntos públicos de Firebase. No muestra estadísticas inventadas ni modifica la puntuación oficial.</p>
          </section>

          </div>)}

          {activeYouthSection === 'activities' && (<div className="youth-tab-page youth-growth-tab">
          <section className="youth-growth-plan">
            <header><div><span>CRECIMIENTO PERSONAL</span><h2>Reto de 7 días</h2><p>Un pequeño paso cada día para crecer en la fe y servir a los demás.</p></div><strong>{growthDone.length}/7</strong></header>
            <div className="youth-growth-progress"><i style={{width:growthProgress + '%'}}/></div>
            <div className="youth-growth-grid">
              {weeklyGrowthPlan.map((day) => {
                const done = growthDone.includes(day.id);
                return <article key={day.id} className={done ? 'is-done' : ''}>
                  <div><span>{day.day}</span><b>{day.title}</b><small>{day.reference}</small><p>{day.challenge}</p></div>
                  <button type="button" aria-pressed={done} onClick={() => toggleGrowthDay(day.id)}>{done ? <CheckCircle2 size={16}/> : <Circle size={16}/>} {done ? 'Completado' : 'Marcar leído'}</button>
                </article>;
              })}
            </div>
            <small className="youth-growth-local-note">Tu progreso se guarda solo en este dispositivo y puedes retomarlo cuando vuelvas a entrar.</small>
          </section>

          </div>)}

          {activeYouthSection === 'space' && (<div className="youth-tab-page youth-space-tab">
          {!editingLook && <section className="youth-profile-editor">
            <div className="youth-profile-editor-heading"><div><b>Mi perfil</b><span>Actualiza tus datos visibles en este dispositivo.</span></div><UserSearch size={20}/></div>
            <div className="youth-profile-editor-grid">
              <label>Nombre visible<input value={profileExtras.displayName} onChange={(event) => setProfileExtras((value) => ({...value,displayName:event.target.value}))} maxLength={60} placeholder={selectedProfile.name}/></label>
              <label>Apodo<input value={profileExtras.nickname} onChange={(event) => setProfileExtras((value) => ({...value,nickname:event.target.value}))} maxLength={30} placeholder={selectedProfile.nick || 'Mi apodo'}/></label>
              <label>Mi frase personal<input value={profileExtras.motto} onChange={(event) => setProfileExtras((value) => ({...value,motto:event.target.value}))} maxLength={100} placeholder="Una frase que me representa"/></label>
              <label>Mi meta de esta semana<textarea value={profileExtras.weeklyGoal} onChange={(event) => setProfileExtras((value) => ({...value,weeklyGoal:event.target.value}))} maxLength={160} rows={2} placeholder="Ej. Leer un capítulo diario y servir en mi grupo"/></label>
            </div>
            <button type="button" onClick={saveProfileExtras}>Guardar mi perfil</button>
            <button type="button" className="youth-open-customizer" onClick={() => setEditingLook(true)}><Palette size={16}/> Personalizar apariencia</button>
          </section>}
          <section className="youth-journal-panel">
            <header><div><span>UN MOMENTO CON DIOS</span><h2>Mi bitácora personal</h2><p>Escribe una reflexión, algo por lo que agradeces o una oración para recordar.</p></div><BookMarked size={23}/></header>
            <label htmlFor="youth-journal-entry">Mi reflexión de hoy</label>
            <textarea id="youth-journal-entry" value={journalEntry} onChange={(event) => {setJournalEntry(event.target.value);setJournalStatus('');}} maxLength={3000} rows={5} placeholder="Hoy aprendí que... / Quiero agradecer por... / Mi oración es..."/>
            <div className="youth-journal-actions"><small>{journalEntry.length}/3000 · Privado en este dispositivo</small><button type="button" onClick={saveJournalEntry}><CheckCircle2 size={16}/> Guardar reflexión</button></div>
            {journalStatus && <p className="youth-journal-status" role="status">{journalStatus}</p>}
            <small className="youth-journal-privacy"><ShieldCheck size={13}/> Esta bitácora no se envía a Firebase ni la puede leer el equipo administrativo.</small>
          </section>

          </div>)}

          {activeYouthSection === 'games' && (<div className="youth-tab-page youth-games-tab">
          <section className="youth-game-hub">
            <header><div><span>ENTRENA Y APRENDE</span><h2>Zona de juegos bíblicos</h2></div><Gamepad2 size={22}/></header>
            <div className="youth-games-grid">
              {games.map((game) => {
                const Icon = game.icon;
                return <button type="button" key={game.id} className="youth-game-tile" onClick={() => setActiveGame(game.id)}>
                  <span><Icon size={23}/></span><b>{game.title}</b><small>{game.subtitle}</small><i>JUGAR <ChevronRight size={14}/></i>
                </button>;
              })}
            </div>
          </section>
          </div>)}

          {activeYouthSection === 'space' && (<div className="youth-tab-page youth-space-tab">
          <section className="youth-prayer-panel">
              <header><HeartHandshake size={22}/><div><span>NO ESTÁS SOLO</span><h2>Comparte tu petición</h2><p>Tu mensaje llegará a la bandeja interna del equipo de oración.</p></div></header>
              <p className="youth-prayer-privacy"><ShieldCheck size={15}/> El formulario está preparado para la bandeja interna. El selector de perfiles es público y no verifica quién está usando la cuenta; evita compartir datos sensibles.</p>
              <form onSubmit={(event) => void handlePrayerSubmit(event)}>
                <label>Nombre (opcional)<input value={prayerName} onChange={(event) => setPrayerName(event.target.value)} maxLength={80} placeholder="Puedes enviarla como anónimo"/></label>
                <label>Tipo de petición<select value={prayerCategory} onChange={(event) => setPrayerCategory(event.target.value)}><option>General</option><option>Familia</option><option>Estudios</option><option>Fortaleza espiritual</option><option>Agradecimiento</option><option>Otra</option></select></label>
                <label className="prayer-message-field">Cuéntanos cómo podemos orar por ti<textarea value={prayerMessage} onChange={(event) => setPrayerMessage(event.target.value)} minLength={8} maxLength={500} rows={4} required placeholder="Escribe tu petición con confianza..."/></label>
                <div className="youth-prayer-submit-row"><small>{prayerMessage.length}/500 caracteres. Evita compartir datos personales sensibles.</small><button type="submit" disabled={prayerBusy || prayerMessage.trim().length < 8}>{prayerBusy ? 'Enviando...' : 'Enviar petición'} <Send size={16}/></button></div>
                {prayerStatus && <p className="youth-prayer-status" role="status">{prayerStatus}</p>}
              </form>
          </section>
          </div>)}
          <div className="youth-security-note"><ShieldCheck size={17}/> Este acceso muestra únicamente información pública. No revela datos privados ni acredita la identidad; los puntos de partidas no se incorporan automáticamente al ranking oficial.</div>
        </div>
        <nav className="youth-bottom-navigation" aria-label="Navegación de mi perfil">
          {youthNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={activeYouthSection === item.id ? 'active' : ''}
                aria-current={activeYouthSection === item.id ? 'page' : undefined}
                onClick={() => {setActiveYouthSection(item.id);if(item.id !== 'space') setEditingLook(false);}}
              >
                <Icon size={20} strokeWidth={2}/>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        </motion.main>
    );
  }

  return (
    <main className={`${styles.scope} youth-portal`}>
      <div className="youth-container">
        <header className="youth-header">
          <div className="youth-brand-icon church-portal-logo">
            <img src="/church-logo.webp" alt="Logo de la Iglesia Cristiana Cuadrangular Alfa y Omega" />
          </div>
          <span className="youth-brand-label">IGLESIA CRISTIANA CUADRANGULAR ALFA Y OMEGA</span>
          <h1 className="jf-title-reveal">JÓVENES DE FUEGO</h1>
          <div className="youth-title-divider"/>
          <h2 className="jf-title-reveal">¿Quién eres?</h2>
          <p>Elige tu perfil y entra a tu espacio de la comunidad.</p>
        </header>

        <section className="youth-selector">
          <div className="youth-selector-heading">
            <div><span>ACCESO JUVENIL</span><h3>Nuestra comunidad</h3></div>
            <div className="youth-selector-actions">
              <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={`Cambiar a ${nextThemeLabel}`} title={`Cambiar a ${nextThemeLabel}`}>
                <ThemeIcon size={17}/>
                <span>Cambiar a {nextThemeLabel}</span>
              </button>
              <div className="youth-total"><Users size={17}/>{profiles.length} perfiles</div>
            </div>
          </div>

          <label className="youth-search">
            <Search size={19}/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o apodo..." aria-label="Buscar perfil"/>
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}
          </label>

          {error && <div className="youth-error"><AlertCircle size={19}/><span>{error}</span><button type="button" onClick={() => void loadProfiles()}>Reintentar</button></div>}
          {loading && <div className="youth-loading"><RefreshCw size={27}/><strong>Cargando perfiles...</strong><span>Estamos preparando la comunidad.</span></div>}
          {!loading && !error && filteredProfiles.length === 0 && (
            <div className="youth-empty"><Users size={38}/><h3>{profiles.length === 0 ? 'Todavía no hay perfiles públicos' : 'No encontramos ese perfil'}</h3><p>{profiles.length === 0 ? 'Los perfiles deben publicarse desde el panel administrativo.' : 'Prueba con otro nombre o apodo.'}</p><button type="button" onClick={() => {setSearch('');void loadProfiles();}}><RefreshCw size={16}/>Actualizar perfiles</button></div>
          )}
          {!loading && !error && filteredProfiles.length > 0 && (
            <>
              <div className={`youth-profiles ${openingProfileId ? "youth-profiles-exit" : ""}`}>
                {filteredProfiles.map((profile,index) => (
                  <button type="button" className={`youth-profile-card float-card-${index % 4} ${openingProfileId === profile.id ? "is-opening" : ""}`} key={profile.id} disabled={Boolean(openingProfileId)} onClick={() => enterProfile(profile)} style={{animationDelay: `${Math.min(index,12) * 55}ms`}}>
                    <span className="youth-card-decoration"><Flame size={15}/></span>
                    <YouthAvatar profile={profile}/>
                    <strong><span className="jf-name-reveal">{profile.name}</span></strong>
                    <span className="youth-card-nick">{profile.nick ? `@${profile.nick}` : 'Miembro de la comunidad'}</span>
                    <span className="youth-card-action">Entrar a mi espacio <ChevronRight size={15}/></span>
                  </button>
                ))}
              </div>
              <div className="youth-results-count">Mostrando {filteredProfiles.length} de {profiles.length} perfiles</div>
            </>
          )}
        </section>
        <footer className="youth-security-note"><ShieldCheck size={17}/> Seleccionar un perfil no verifica la identidad de la persona. No introduzcas información privada en este acceso.</footer>
      </div>
    </main>
  );
}
