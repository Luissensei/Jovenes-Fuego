import styles from './styles/YouthPortalPage.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {FormEvent} from 'react';

import {
  Search, Users, AlertCircle, ArrowLeft, Flame, Trophy, BookOpen,
  Gamepad2, RefreshCw, ChevronRight, ShieldCheck, Sparkles,
  CalendarDays, Clock3, MapPin, HeartHandshake, Send, Medal, Crown,
  Palette, Volume2, VolumeX, Star, X, WandSparkles,
  BookMarked, Timer, Swords, Brain, Layers, Moon, Sun,
} from 'lucide-react';

import {getPublicProfiles, type PublicProfile} from '../services/publicProfiles';
import {firebaseReadOnlyMode} from '../services/firebase/client';
import {
  getWeeklyActivities,
  getHallOfFame,
  sendPrayerRequest,
  type WeeklyActivity,
  type HallOfFamePlayer,
  type FaithfulPlayer,
  saveYouthProfileAppearance,
} from '../services/youthPortal';

import TriviaGame from './TriviaGame';
import VerseGame from './VerseGame';
import {
  MemoryGame,
  ChallengeGame,
  SurvivalGame,
  DuelGame,
  OrderVerseGame,
} from './MoreBibleGames';

import { useThemePreference } from './useThemePreference';
import './YouthPortalPage.css';

type ProfileLook = {
  frame: string;
  background: string;
  avatar: string;
  title: string;
  ownedItems: string[];
  flames: number;
};

type LookShopCategory = 'frames' | 'avatars' | 'titles' | 'backgrounds';

const lookShop: Record<LookShopCategory, {key: string; label: string; emoji: string; cost: number}[]> = {
  frames: [
    {key:'fuego',label:'Fuego',emoji:'🔥',cost:0},
    {key:'neon',label:'Neón',emoji:'💜',cost:40},
    {key:'cielo',label:'Cielo',emoji:'🕊️',cost:40},
    {key:'hielo',label:'Hielo',emoji:'❄️',cost:50},
    {key:'arco',label:'Arcoíris',emoji:'🌈',cost:60},
    {key:'esmeralda',label:'Esmeralda',emoji:'💚',cost:70},
    {key:'rayo',label:'Rayo',emoji:'⚡',cost:80},
    {key:'oro',label:'Oro',emoji:'👑',cost:120},
    {key:'galaxia',label:'Galaxia',emoji:'🌌',cost:150},
    {key:'corona',label:'Campeón',emoji:'🏆',cost:200},
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
  ],
};

const lookCategoryField: Record<LookShopCategory, keyof ProfileLook> = {
  frames: 'frame',
  avatars: 'avatar',
  titles: 'title',
  backgrounds: 'background',
};

const lookCategoryStorage: Record<LookShopCategory, string> = {
  frames: 'frames',
  avatars: 'avs',
  titles: 'tits',
  backgrounds: 'bans',
};

type MiniGame = 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order';

const defaultLook: ProfileLook = {frame: 'fuego', background: 'brasa', avatar: '', title: 'chispa', ownedItems: [], flames: 0};

const games: {id: MiniGame; title: string; subtitle: string; icon: typeof Trophy; color: string}[] = [
  {id: 'trivia', title: 'Trivia bíblica', subtitle: 'Preguntas y conocimiento', icon: BookOpen, color: 'orange'},
  {id: 'verse', title: 'Completa el versículo', subtitle: 'Memoria de las Escrituras', icon: BookMarked, color: 'violet'},
  {id: 'memory', title: 'Memoria bíblica', subtitle: 'Encuentra las parejas', icon: Brain, color: 'cyan'},
  {id: 'challenge', title: 'Reto de 60 segundos', subtitle: 'Rapidez y precisión', icon: Timer, color: 'green'},
  {id: 'survival', title: 'Supervivencia', subtitle: 'No pierdas tus tres vidas', icon: Flame, color: 'rose'},
  {id: 'duel', title: 'Duelo 1 contra 1', subtitle: 'Juega por turnos en el mismo móvil', icon: Swords, color: 'gold'},
  {id: 'order', title: 'Ordena el versículo', subtitle: 'Reconstruye las palabras', icon: Layers, color: 'blue'},
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
      ) : <span className={profile.avatar ? 'youth-avatar-symbol' : ''}>{profile.avatar ? ({paloma:'🕊️',leon:'🦁',aguila:'🦅',cordero:'🐑',mariposa:'🦋',lobo:'🐺',estrella:'🌟',guerrero:'🛡️',dragon:'🐉',cohete:'🚀',rey:'👑',volcan:'🌋'} as Record<string,string>)[profile.avatar] ?? getInitials(profile.name) : getInitials(profile.name)}</span>}
    </div>
  );
}

function readLook(profile: PublicProfile): ProfileLook {
  const remote: ProfileLook = {
    frame: profile.frame || defaultLook.frame,
    background: profile.background || defaultLook.background,
    avatar: profile.avatar || '',
    title: profile.title || defaultLook.title,
    ownedItems: profile.ownedItems ?? [],
    flames: profile.flames ?? 0,
  };
  try {
    const raw = window.localStorage.getItem(`jf-youth-look-${profile.id}`);
    if (!raw) return remote;
    const parsed = JSON.parse(raw) as Partial<ProfileLook>;
    // En producción solo lectura, la personalización queda en este dispositivo.
    // En Staging prevalecen siempre los valores sincronizados con Firebase.
    const local = firebaseReadOnlyMode ? parsed : {};
    return {
      ...remote,
      frame: local.frame || remote.frame,
      background: local.background || remote.background,
      avatar: typeof local.avatar === 'string' ? local.avatar : remote.avatar,
      title: local.title || remote.title,
      ownedItems: local.ownedItems ?? remote.ownedItems,
      flames: local.flames ?? remote.flames,
    };
  } catch {
    return remote;
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
        <p className="youth-hall-caption">Según los servicios seguidos sin faltar que publica el ranking original.</p>
        {attendanceLimited && <p className="youth-hall-limited" role="note">El cálculo está limitado a las 1.000 reuniones más recientes. Revisa el informe completo si la comunidad supera ese volumen.</p>}
        {faithful.length ? (
          <ol className="youth-faithful-list">
            {faithful.map((player, index) => (
              <li key={player.id}>
                <span className="youth-faithful-rank">{index + 1}</span>
                <span className="youth-faithful-name">{player.name}</span>
                <strong>{player.attendances} {player.attendances === 1 ? 'servicio seguido' : 'servicios seguidos'}</strong>
              </li>
            ))}
          </ol>
        ) : <p className="youth-data-empty">Aún no hay asistencias verificables para elaborar esta clasificación.</p>}
      </article>
    </section>
  );
}

export default function YouthPortalPage() {
  const { isDark, toggleTheme } = useThemePreference();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);

  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [topPlayers, setTopPlayers] = useState<HallOfFamePlayer[]>([]);
  const [faithful, setFaithful] = useState<FaithfulPlayer[]>([]);
  const [attendanceLimited, setAttendanceLimited] = useState(false);
  const [portalDataError, setPortalDataError] = useState('');

  const [look, setLook] = useState<ProfileLook>(defaultLook);
  const [editingLook, setEditingLook] = useState(false);
  const [lookCategory, setLookCategory] = useState<LookShopCategory>('frames');
  const [lookSaving, setLookSaving] = useState(false);
  const [portalExiting, setPortalExiting] = useState(false);
  const [gameExiting, setGameExiting] = useState(false);
  const [activeGame, setActiveGame] = useState<MiniGame | null>(null);

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

  async function loadProfiles() {
    setLoading(true);
    setError('');
    try {
      const result = await getPublicProfiles();
      setProfiles(result);
    } catch (cause) {
      console.error('Error cargando perfiles públicos:', cause);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los perfiles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
    let active = true;
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
      if (audioRef.current) {
        void audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
        audioMasterRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      setLook(readLook(selectedProfile));
      // La selección pública no verifica identidad: no prellenar el nombre
      // evita enviar peticiones en nombre de otra persona.
      setPrayerName('');
      setLookNotice('');
    } else {
      setEditingLook(false);
      setActiveGame(null);
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

  const topPlayersWithPhotos = useMemo(() => topPlayers.map((player) => ({
    ...player,
    pic: player.pic || profiles.find((profile) =>
      profile.name === player.name || (profile.nick && profile.nick === player.name),
    )?.pic || '',
  })), [topPlayers, profiles]);

  const faithfulWithPhotos = useMemo(() => faithful.map((player) => ({
    ...player,
    pic: player.pic || profiles.find((profile) =>
      profile.name === player.name || (profile.nick && profile.nick === player.name),
    )?.pic || '',
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

  async function equipLookItem(category: LookShopCategory, item: (typeof lookShop)[LookShopCategory][number]) {
    if (!selectedProfile) return;
    const ownedKey = `${lookCategoryStorage[category]}:${item.key}`;
    const alreadyOwned = item.cost === 0 || look.ownedItems.includes(ownedKey);
    if (!alreadyOwned && look.flames < item.cost) {
      setLookNotice(`Te faltan ${item.cost - look.flames} Llamas para desbloquear ${item.label}.`);
      return;
    }

    const next: ProfileLook = {
      ...look,
      frame: category === 'frames' ? item.key : look.frame,
      avatar: category === 'avatars' ? item.key : look.avatar,
      title: category === 'titles' ? item.key : look.title,
      background: category === 'backgrounds' ? item.key : look.background,
      ownedItems: alreadyOwned ? look.ownedItems : [...look.ownedItems, ownedKey],
      flames: alreadyOwned ? look.flames : look.flames - item.cost,
    };
    setLook(next);
    setLookSaving(true);
    setLookNotice('');
    try {
      if (firebaseReadOnlyMode) {
        // Permite probar marcos y fondos localmente sin escribir en producción.
        window.localStorage.setItem(`jf-youth-look-${selectedProfile.id}`, JSON.stringify(next));
        setLookNotice(`${item.label} equipado en este dispositivo. La sincronización de la comunidad se habilita en Staging.`);
        return;
      }
      await saveYouthProfileAppearance(selectedProfile.id, next);
      window.localStorage.setItem(`jf-youth-look-${selectedProfile.id}`, JSON.stringify(next));
      setLookNotice(`${item.label} equipado correctamente.`);
    } catch (cause) {
      setLookNotice(cause instanceof Error
        ? cause.message
        : 'No se pudo guardar el cambio. Comprueba tu conexión.');
      setLook(readLook(selectedProfile));
    } finally {
      setLookSaving(false);
    }
  }

  function leaveProfile() {
    setPortalExiting(true);
    window.setTimeout(() => {
      setSelectedProfile(null);
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
        setGameExiting(false);
      }, 300);
    };
    return (
      <main className={`${styles.scope} youth-portal`}>
        <div className={`youth-container youth-game-shell ${gameExiting ? "youth-game-exit" : ""}`}>
          <div className="youth-game-topbar">
            <button className="youth-back" type="button" onClick={exitGame}><ArrowLeft size={17}/> Volver a mi espacio</button>
            <span><Gamepad2 size={16}/> JUGADOR · {selectedProfile.name}</span>
            <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={isDark}>
              {isDark ? <Sun size={17}/> : <Moon size={17}/>}
              <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
          </div>
          {activeGame === 'trivia' && <TriviaGame onExit={exitGame}/>}
          {activeGame === 'verse' && <VerseGame onExit={exitGame}/>}
          {activeGame === 'memory' && <MemoryGame onExit={exitGame}/>}
          {activeGame === 'challenge' && <ChallengeGame onExit={exitGame}/>}
          {activeGame === 'survival' && <SurvivalGame onExit={exitGame}/>}
          {activeGame === 'duel' && <DuelGame onExit={exitGame}/>}
          {activeGame === 'order' && <OrderVerseGame onExit={exitGame}/>}
        </div>
      </main>
    );
  }

  if (selectedProfile) {
    return (
      <main className={`${styles.scope} youth-portal youth-look-${look.background} ${portalExiting ? "youth-profile-exit" : ""}`}>
        <div className="youth-container youth-home-enter">
          <div className="youth-home-toolbar">
            <button type="button" className="youth-back" onClick={leaveProfile}>
              <ArrowLeft size={17}/> Cambiar de perfil
            </button>
            <button type="button" aria-pressed={soundOn} className={`youth-sound-toggle ${soundOn ? 'active' : ''}`} onClick={() => void toggleAmbientSound()}>
              {soundOn ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              {soundOn ? 'Ambiente activado' : 'Activar ambiente'}
            </button>
            <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={isDark}>
              {isDark ? <Sun size={17}/> : <Moon size={17}/>}
              <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
          </div>

          <section className={`youth-welcome youth-home youth-frame-${look.frame} youth-background-${look.background}`}>
            <div className="youth-welcome-decoration"><Sparkles size={24}/></div>
            <button type="button" className="youth-customize-trigger" onClick={() => setEditingLook((value) => !value)}>
              <Palette size={17}/> Personalizar perfil
            </button>
            <YouthAvatar profile={{...selectedProfile, frame: look.frame, avatar: look.avatar}} large/>
            <span className="youth-brand-label">COMUNIDAD JÓVENES DE FUEGO</span>
            <h1>¡Hola, {selectedProfile.name}!</h1>
            <p>Tu espacio para crecer, servir, aprender y compartir.</p>
            {selectedProfile.nick && <span className="youth-profile-nick">@{selectedProfile.nick}</span>}
            {look.title && <span className="youth-profile-title">{({chispa:'Chispa Encendida',valiente:'Valiente',guerrero:'Guerrero de Fe',intercesor:'Intercesor',adorador:'Adorador',sabio:'Sabio de la Palabra',leyenda:'Leyenda de Fuego'} as Record<string,string>)[look.title] ?? look.title}</span>}
            <div className="youth-profile-quickstats">
              <span><Star size={15}/> {selectedProfile.points > 0 ? `${selectedProfile.points} puntos públicos` : 'Puntos aún no publicados'}</span>
              <span><Flame size={15}/> {look.flames} Llamas</span>
              <span><ShieldCheck size={15}/> Perfil comunitario</span>
            </div>
          </section>

          {lookNotice && <p className="youth-look-notice" role="status">{lookNotice}</p>}

          {editingLook && (
            <section className="youth-customizer">
              <header>
                <WandSparkles size={20}/>
                <div><b>Forja tu identidad</b><span>Desbloquea marcos, avatares, títulos y mundos con tus Llamas.</span></div>
                <strong className="youth-store-wallet"><Flame size={16}/> {look.flames}</strong>
                <button type="button" aria-label="Cerrar personalización" onClick={() => setEditingLook(false)}><X size={18}/></button>
              </header>
              <nav className="youth-store-tabs" aria-label="Personalización">
                {([
                  ['frames','Marcos'],['avatars','Avatares'],['titles','Títulos'],['backgrounds','Fondos'],
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
              {firebaseReadOnlyMode && <p className="youth-inline-warning">En solo lectura, los cambios cosméticos se guardan solo en este dispositivo. Para sincronizarlos con todos los móviles usa Staging.</p>}
              {lookSaving && <p className="youth-inline-warning">Guardando personalización...</p>}
            </section>
          )}

          {soundError && <p className="youth-inline-warning">{soundError}</p>}

          <section className="youth-activities">
            <header><div><span>AGENDA DE LA GENERACIÓN</span><h2>Actividades de esta semana</h2></div><CalendarDays size={22}/></header>
            {portalDataError && <p className="youth-inline-warning">{portalDataError}</p>}
            {publishedActivities.length ? (
              <div className="youth-activities-grid">{publishedActivities.map((activity) => <ActivityCard key={activity.id} activity={activity}/>)}</div>
            ) : (
              <div className="youth-empty-activities"><CalendarDays size={25}/><strong>No hay actividades publicadas por ahora</strong><span>Cuando el equipo publique la agenda, aparecerá aquí al entrar.</span></div>
            )}
 
          <HallOfFame topPlayers={topPlayersWithPhotos} faithful={faithfulWithPhotos} attendanceLimited={attendanceLimited}/>
         </section>

          <section className="youth-game-hub">
            <header><div><span>ENTRENA Y APRENDE</span><h2>Zona de juegos bíblicos</h2></div><Gamepad2 size={22}/></header>
            <div className="youth-games-grid">
              {games.map((game) => {
                const Icon = game.icon;
                return <button type="button" key={game.id} className={`youth-game-tile ${game.color}`} onClick={() => setActiveGame(game.id)}>
                  <span><Icon size={23}/></span><b>{game.title}</b><small>{game.subtitle}</small><i>JUGAR <ChevronRight size={14}/></i>
                </button>;
              })}
            </div>
          </section>

          {(
            <section className="youth-prayer-panel">
              <header><HeartHandshake size={22}/><div><span>NO ESTÁS SOLO</span><h2>Comparte tu petición</h2><p>{firebaseReadOnlyMode ? 'El envío se habilita al conectar el entorno seguro de pruebas.' : 'Tu mensaje llegará a la bandeja interna del equipo de oración.'}</p></div></header>
              <p className="youth-prayer-privacy"><ShieldCheck size={15}/> El formulario está preparado para la bandeja interna. El selector de perfiles es público y no verifica quién está usando la cuenta; evita compartir datos sensibles.</p>
              <form onSubmit={(event) => void handlePrayerSubmit(event)}>
                <label>Nombre (opcional)<input value={prayerName} onChange={(event) => setPrayerName(event.target.value)} maxLength={80} placeholder="Puedes enviarla como anónimo"/></label>
                <label>Tipo de petición<select value={prayerCategory} onChange={(event) => setPrayerCategory(event.target.value)}><option>General</option><option>Familia</option><option>Estudios</option><option>Fortaleza espiritual</option><option>Agradecimiento</option><option>Otra</option></select></label>
                <label className="prayer-message-field">Cuéntanos cómo podemos orar por ti<textarea value={prayerMessage} onChange={(event) => setPrayerMessage(event.target.value)} minLength={8} maxLength={500} rows={4} required placeholder="Escribe tu petición con confianza..."/></label>
                <div className="youth-prayer-submit-row"><small>{prayerMessage.length}/500 caracteres. Evita compartir datos personales sensibles.</small><button type="submit" disabled={firebaseReadOnlyMode || prayerBusy || prayerMessage.trim().length < 8}>{firebaseReadOnlyMode ? 'Disponible en Staging' : prayerBusy ? 'Enviando...' : 'Enviar petición'} <Send size={16}/></button></div>
                {prayerStatus && <p className="youth-prayer-status" role="status">{prayerStatus}</p>}
              </form>
            </section>
          )}
          <div className="youth-security-note"><ShieldCheck size={17}/> Este acceso muestra únicamente información pública. No revela datos privados ni acredita la identidad; los puntos de partidas no se incorporan automáticamente al ranking oficial.</div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${styles.scope} youth-portal`}>
      <div className="youth-container">
        <header className="youth-header">
          <div className="youth-brand-icon"><Flame size={34}/></div>
          <span className="youth-brand-label">COMUNIDAD CRISTIANA</span>
          <h1>JÓVENES DE FUEGO</h1>
          <div className="youth-title-divider"/>
          <h2>¿Quién eres?</h2>
          <p>Elige tu perfil y entra a tu espacio de la comunidad.</p>
        </header>

        <section className="youth-selector">
          <div className="youth-selector-heading">
            <div><span>ACCESO JUVENIL</span><h3>Nuestra comunidad</h3></div>
            <div className="youth-selector-actions">
              <button type="button" className="youth-theme-toggle" onClick={toggleTheme} aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={isDark}>
                {isDark ? <Sun size={17}/> : <Moon size={17}/>}
                <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
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
              <div className="youth-profiles">
                {filteredProfiles.map((profile,index) => (
                  <button type="button" className={`youth-profile-card float-card-${index % 4}`} key={profile.id} onClick={() => setSelectedProfile(profile)} style={{animationDelay: `${Math.min(index,12) * 55}ms`}}>
                    <span className="youth-card-decoration"><Flame size={15}/></span>
                    <YouthAvatar profile={profile}/>
                    <strong>{profile.name}</strong>
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
