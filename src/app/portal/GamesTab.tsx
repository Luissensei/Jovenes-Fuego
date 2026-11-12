import { BadgeCheck, BookMarked, BookOpen, Brain, Flame, Gamepad2, Layers, Timer, Trophy, UserSearch, Swords } from 'lucide-react';

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

export default function GamesTab({onStartGame}:{onStartGame:(game:MiniGame)=>void}) {
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
    </div>
  );
}
