import { BadgeCheck, BookMarked, BookOpen, Brain, Flame, Gamepad2, Layers, Timer, Trophy, UserSearch, Swords, History, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getYouthGameHistory, getYouthFlameHistory, type YouthGameHistoryEntry, type YouthFlameMovement } from '../../services/youthPortal';

export type MiniGame = 'trivia' | 'verse' | 'memory' | 'challenge' | 'survival' | 'duel' | 'order' | 'truefalse' | 'whoami';

const games: {id: MiniGame; title: string; subtitle: string; icon: typeof Trophy}[] = [
  {id:'trivia',title:'Trivia bíblica',subtitle:'Preguntas y conocimiento',icon:BookOpen},
  {id:'verse',title:'Completa el versículo',subtitle:'Memoria de las Escrituras',icon:BookMarked},
  {id:'memory',title:'Memoria bíblica',subtitle:'Encuentra las parejas',icon:Brain},
  {id:'challenge',title:'Reto de 60 segundos',subtitle:'Rapidez y precisión',icon:Timer},
  {id:'survival',title:'Supervivencia',subtitle:'No pierdas tus tres vidas',icon:Flame},
  {id:'duel',title:'Duelo 1 contra 1',subtitle:'Juega por turnos en el mismo móvil',icon:Swords},
  {id:'order',title:'Ordena el versículo',subtitle:'Reconstruye las palabras',icon:Layers},
  {id:'truefalse',title:'Verdadero o falso',subtitle:'Detecta afirmaciones bíblicas',icon:BadgeCheck},
  {id:'whoami',title:'¿Quién soy?',subtitle:'Descubre el personaje con pistas',icon:UserSearch},
];

export default function GamesTab({onStartGame, communitySession}:{onStartGame:(game:MiniGame)=>void;communitySession:string}) {
  const [history, setHistory] = useState<YouthGameHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [flameMovements, setFlameMovements] = useState<YouthFlameMovement[]>([]);
  const [flameError, setFlameError] = useState('');
  useEffect(() => {
    let active = true;
    if (!communitySession) return;
    setLoadingHistory(true);
    Promise.all([
      getYouthGameHistory(communitySession),
      getYouthFlameHistory(communitySession),
    ]).then(([items, movements]) => {
      if (active) {
        setHistory(items);
        setFlameMovements(movements);
      }
    }).catch((cause: unknown) => {
      if (active) {
        const message = cause instanceof Error ? cause.message : 'No se pudo cargar la actividad.';
        setHistoryError(message);
        setFlameError(message);
      }
    }).finally(() => {
      if (active) setLoadingHistory(false);
    });
    return () => { active = false; };
  }, [communitySession]);
  const gameNames: Record<string, string> = {
    trivia: 'Trivia bíblica', verse: 'Completa el versículo', memory: 'Memoria bíblica',
    challenge: 'Reto de 60 segundos', survival: 'Supervivencia', duel: 'Duelo 1 contra 1',
    order: 'Ordena el versículo', truefalse: 'Verdadero o falso', whoami: '¿Quién soy?',
  };
  return (
    <div className="youth-tab-page youth-games-tab">
      <section className="youth-game-hub">
        <header><div><span>ENTRENA Y APRENDE</span><h2>Zona de juegos bíblicos</h2></div><Gamepad2 size={22}/></header>
        <div className="youth-games-grid">
          {games.map((game) => {
            const Icon = game.icon;
            return <button type="button" key={game.id} className="youth-game-tile" onClick={() => onStartGame(game.id)}>
              <span><Icon size={23}/></span><b>{game.title}</b><small>{game.subtitle}</small><i>JUGAR</i>
            </button>;
          })}
        </div>
      </section>
      <section className="youth-game-history">
        <header><div><span>TU SALDO Y MOVIMIENTOS</span><h2><Flame size={19}/> Historial de Llamas</h2></div></header>
        {flameError && <p role="alert">{flameError}</p>}
        {!flameError && flameMovements.length === 0 && <p>Todavía no tienes movimientos de Llamas registrados.</p>}
        {flameMovements.length > 0 && <ul>
          {flameMovements.map((movement) => <li key={movement.id}>
            <div><b>{movement.description || 'Movimiento de Llamas'}</b><small>{movement.createdAt ? new Date(movement.createdAt).toLocaleString('es-CO') : 'Fecha no disponible'}</small></div>
            <strong>{movement.amount > 0 ? '+' : ''}{movement.amount} Llamas</strong>
            <span>Saldo: {movement.balanceAfter}</span>
          </li>)}
        </ul>}
      </section>
      <section className="youth-game-history">
        <header><div><span>TU ACTIVIDAD</span><h2><History size={19}/> Historial de partidas</h2></div>
          {loadingHistory && <RefreshCw size={17} aria-label="Cargando"/>}
        </header>
        {historyError && <p role="alert">{historyError}</p>}
        {!loadingHistory && !historyError && history.length === 0 && <p>Aún no tienes partidas registradas. ¡Juega tu primer desafío!</p>}
        {history.length > 0 && <ul>
          {history.map((item) => <li key={item.id}>
            <div><b>{gameNames[item.gameId] ?? 'Juego bíblico'}</b><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Fecha no disponible'}</small></div>
            <strong>{item.score} pts</strong>
            <span>{item.verificationStatus === 'verified' ? 'Validado' : item.verificationStatus === 'rejected' ? 'No validado' : 'Pendiente de validación'}</span>
          </li>)}
        </ul>}
      </section>
    </div>
  );
}
