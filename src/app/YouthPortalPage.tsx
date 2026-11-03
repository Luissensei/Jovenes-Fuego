import { useEffect, useMemo, useRef, useState } from 'react';
import type {FormEvent} from 'react';

import {
  Search, Users, AlertCircle, ArrowLeft, Flame, Trophy, BookOpen,
  Gamepad2, RefreshCw, ChevronRight, ShieldCheck, Sparkles,
  CalendarDays, Clock3, MapPin, HeartHandshake, Send, Medal, Crown,
  Palette, Volume2, VolumeX, Star, X, WandSparkles,
  BookMarked, Timer, Swords, Brain, Layers,
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

import './YouthPortalPage.css';

type ProfileLook = {
  frame: 'ember' | 'prism' | 'ice' | 'gold';
  background: 'aurora' | 'fire' | 'ocean' | 'galaxy';
};

type MiniGame = 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order';

const defaultLook: ProfileLook = {frame: 'prism', background: 'aurora'};

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
    <div className={`youth-avatar ${large ? 'large' : ''}`}>
      {profile.pic && !imageFailed ? (
        <img src={profile.pic} alt={`Fotografía de ${profile.name}`} onError={() => setImageFailed(true)} />
      ) : <span>{getInitials(profile.name)}</span>}
    </div>
  );
}

function readLook(profileId: string): ProfileLook {
  try {
    const raw = window.localStorage.getItem(`jf-youth-look-${profileId}`);
    if (!raw) return defaultLook;
    const parsed = JSON.parse(raw) as Partial<ProfileLook>;
    const frame = ['ember', 'prism', 'ice', 'gold'].includes(String(parsed.frame))
      ? parsed.frame as ProfileLook['frame'] : defaultLook.frame;
    const background = ['aurora', 'fire', 'ocean', 'galaxy'].includes(String(parsed.background))
      ? parsed.background as ProfileLook['background'] : defaultLook.background;
    return {frame, background};
  } catch {
    return defaultLook;
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
        <p className="youth-hall-caption">Según asistencias marcadas como presentes en el módulo nuevo de asistencia.</p>
        {attendanceLimited && <p className="youth-hall-limited" role="note">El cálculo está limitado a las 1.000 reuniones más recientes. Revisa el informe completo si la comunidad supera ese volumen.</p>}
        {faithful.length ? (
          <ol className="youth-faithful-list">
            {faithful.map((player, index) => (
              <li key={player.id}>
                <span className="youth-faithful-rank">{index + 1}</span>
                <span className="youth-faithful-name">{player.name}</span>
                <strong>{player.attendances} {player.attendances === 1 ? 'asistencia' : 'asistencias'}</strong>
              </li>
            ))}
          </ol>
        ) : <p className="youth-data-empty">Aún no hay asistencias verificables para elaborar esta clasificación.</p>}
      </article>
    </section>
  );
}

export default function YouthPortalPage() {
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
        setPortalDataError('Las actividades todavía no se pueden consultar en este entorno.');
      }
      if (results[1].status === 'fulfilled') {
        setTopPlayers(results[1].value.topPlayers ?? []);
        setFaithful(results[1].value.faithful ?? []);
        setAttendanceLimited(results[1].value.attendanceLimited === true);
      } else {
        setPortalDataError((previous) => previous || 'Las clasificaciones estarán disponibles cuando se conecten sus funciones de Staging.');
      }
    });
    return () => {
      active = false;
      if (audioRef.current) {
        void audioRef.current.close().catch(() => undefined);
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      setLook(readLook(selectedProfile.id));
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
      }
      setSoundOn(false);
    }
  }, [selectedProfile]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return profiles;
    return profiles.filter((profile) => `${profile.name} ${profile.nick}`.toLocaleLowerCase('es').includes(query));
  }, [profiles, search]);

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

  function saveLook(next: ProfileLook) {
    if (!selectedProfile) return;
    setLook(next);
    try {
      window.localStorage.setItem(`jf-youth-look-${selectedProfile.id}`, JSON.stringify(next));
      setLookNotice('Tu apariencia quedó guardada en este dispositivo.');
    } catch {
      setLookNotice('El navegador no permitió guardar la apariencia en este dispositivo.');
    }
  }

  async function toggleAmbientSound() {
    setSoundError('');
    if (audioRef.current) {
      await audioRef.current.close().catch(() => undefined);
      audioRef.current = null;
      setSoundOn(false);
      return;
    }
    try {
      const context = new AudioContext();
      await context.resume();
      audioRef.current = context;
      const master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(0.035, context.currentTime + 1.2);
      master.connect(context.destination);

      const low = context.createOscillator();
      const lowGain = context.createGain();
      low.type = 'sine';
      low.frequency.value = 110;
      lowGain.gain.value = 0.20;
      low.connect(lowGain);
      lowGain.connect(master);
      low.start();

      const high = context.createOscillator();
      const highGain = context.createGain();
      high.type = 'sine';
      high.frequency.value = 164.81;
      highGain.gain.value = 0.11;
      high.connect(highGain);
      highGain.connect(master);
      high.start();

      const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * 0.16;
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      noiseGain.gain.value = 0.10;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();

      setSoundOn(true);
    } catch {
      setSoundError('Este navegador no permite reproducir el ambiente sonoro.');
      setSoundOn(false);
    }
  }

  async function handlePrayerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrayerStatus('');
    setPrayerBusy(true);
    try {
      await sendPrayerRequest({
        requester: prayerName.trim() || 'Anónimo',
        category: prayerCategory,
        message: prayerMessage.trim(),
      });
      setPrayerMessage('');
      setPrayerStatus('Tu petición fue recibida. El equipo de oración podrá acompañarte.');
    } catch (cause) {
      setPrayerStatus(cause instanceof Error ? cause.message : 'No se pudo enviar la petición.');
    } finally {
      setPrayerBusy(false);
    }
  }

  if (selectedProfile && activeGame) {
    const exitGame = () => setActiveGame(null);
    return (
      <main className="youth-portal">
        <div className="youth-container youth-game-shell">
          <div className="youth-game-topbar">
            <button className="youth-back" type="button" onClick={exitGame}><ArrowLeft size={17}/> Volver a mi espacio</button>
            <span><Gamepad2 size={16}/> JUGADOR · {selectedProfile.name}</span>
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
      <main className={`youth-portal youth-look-${look.background}`}>
        <div className="youth-container youth-home-enter">
          <div className="youth-home-toolbar">
            <button type="button" className="youth-back" onClick={() => setSelectedProfile(null)}>
              <ArrowLeft size={17}/> Cambiar de perfil
            </button>
            <button type="button" aria-pressed={soundOn} className={`youth-sound-toggle ${soundOn ? 'active' : ''}`} onClick={() => void toggleAmbientSound()}>
              {soundOn ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              {soundOn ? 'Ambiente activado' : 'Activar ambiente'}
            </button>
          </div>

          <section className={`youth-welcome youth-home youth-frame-${look.frame}`}>
            <div className="youth-welcome-decoration"><Sparkles size={24}/></div>
            <button type="button" className="youth-customize-trigger" onClick={() => setEditingLook((value) => !value)}>
              <Palette size={17}/> Personalizar perfil
            </button>
            <YouthAvatar profile={selectedProfile} large/>
            <span className="youth-brand-label">COMUNIDAD JÓVENES DE FUEGO</span>
            <h1>¡Hola, {selectedProfile.name}!</h1>
            <p>Tu espacio para crecer, servir, aprender y compartir.</p>
            {selectedProfile.nick && <span className="youth-profile-nick">@{selectedProfile.nick}</span>}
            <div className="youth-profile-quickstats">
              <span><Star size={15}/> {selectedProfile.points > 0 ? `${selectedProfile.points} puntos públicos` : 'Puntos aún no publicados'}</span>
              <span><ShieldCheck size={15}/> Perfil comunitario</span>
            </div>
          </section>

          {lookNotice && <p className="youth-look-notice" role="status">{lookNotice}</p>}

          {editingLook && (
            <section className="youth-customizer">
              <header><WandSparkles size={19}/><div><b>Tu identidad visual</b><span>Los cambios se guardan solo en este dispositivo.</span></div><button type="button" aria-label="Cerrar personalización" onClick={() => setEditingLook(false)}><X size={18}/></button></header>
              <div className="youth-look-group"><strong>Marcos</strong><div className="youth-look-choices">
                {(['ember','prism','ice','gold'] as const).map((frame) => <button type="button" key={frame} className={`look-choice frame-choice ${frame} ${look.frame === frame ? 'selected' : ''}`} onClick={() => saveLook({...look,frame})}><span/>{({ember:'Llama',prism:'Prisma',ice:'Cristal',gold:'Dorado'})[frame]}</button>)}
              </div></div>
              <div className="youth-look-group"><strong>Fondos</strong><div className="youth-look-choices">
                {(['aurora','fire','ocean','galaxy'] as const).map((background) => <button type="button" key={background} className={`look-choice background-choice ${background} ${look.background === background ? 'selected' : ''}`} onClick={() => saveLook({...look,background})}>{({aurora:'Aurora',fire:'Fuego',ocean:'Océano',galaxy:'Galaxia'})[background]}</button>)}
              </div></div>
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

          <HallOfFame topPlayers={topPlayers} faithful={faithful} attendanceLimited={attendanceLimited}/>

          {!firebaseReadOnlyMode && (
            <section className="youth-prayer-panel">
              <header><HeartHandshake size={22}/><div><span>NO ESTÁS SOLO</span><h2>Comparte tu petición</h2><p>Tu petición será recibida por el equipo autorizado de oración.</p></div></header>
              <form onSubmit={(event) => void handlePrayerSubmit(event)}>
                <label>Nombre (opcional)<input value={prayerName} onChange={(event) => setPrayerName(event.target.value)} maxLength={80} placeholder="Puedes enviarla como anónimo"/></label>
                <label>Tipo de petición<select value={prayerCategory} onChange={(event) => setPrayerCategory(event.target.value)}><option>General</option><option>Familia</option><option>Estudios</option><option>Fortaleza espiritual</option><option>Agradecimiento</option><option>Otra</option></select></label>
                <label className="prayer-message-field">Cuéntanos cómo podemos orar por ti<textarea value={prayerMessage} onChange={(event) => setPrayerMessage(event.target.value)} minLength={8} maxLength={1200} rows={4} required placeholder="Escribe tu petición con confianza..."/></label>
                <div className="youth-prayer-submit-row"><small>{prayerMessage.length}/1200 caracteres. Evita compartir datos personales sensibles.</small><button type="submit" disabled={prayerBusy || prayerMessage.trim().length < 8}>{prayerBusy ? 'Enviando...' : 'Enviar petición'} <Send size={16}/></button></div>
                {prayerStatus && <p className="youth-prayer-status" role="status">{prayerStatus}</p>}
              </form>
            </section>
          )}
          {firebaseReadOnlyMode && (
            <div className="youth-security-note">
              <ShieldCheck size={17}/> Las peticiones se habilitarán cuando
              esté listo el sistema de envíos protegido para producción.
            </div>
          )}

          <div className="youth-security-note"><ShieldCheck size={17}/> La selección de perfil es pública. No permite consultar información privada ni acreditar la identidad del joven. Los juegos y puntuaciones visibles aquí no se guardan todavía en el ranking oficial.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="youth-portal">
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
            <div className="youth-total"><Users size={17}/>{profiles.length} perfiles</div>
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
