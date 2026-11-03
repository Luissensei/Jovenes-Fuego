import {playGameTone} from './gameAudio';
import { useEffect, useState } from 'react';
import { bibleQuestionBank, shuffleBibleQuestions } from './bibleQuestionBank';
import {
  Heart, Swords, Trophy,
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle2,
  XCircle, Star, Users, Timer, Shuffle
} from 'lucide-react';

import './MoreBibleGames.css';

type Question = {
  prompt: string;
  options: string[];
  answer: string;
  reference: string;
  explanation: string;
};

function shuffle<T,>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeQuestionBank(): Question[] {
  return shuffleBibleQuestions(bibleQuestionBank).map((question) => ({
    prompt: question.question,
    options: question.options,
    answer: question.options[question.answer],
    reference: question.reference,
    explanation: question.explanation,
  }));
}

function Header({ title, subtitle, onExit }: {
  title: string;
  subtitle: string;
  onExit: () => void;
}) {
  return (
    <header className="mbg-header">
      <button className="mbg-back" onClick={onExit} type="button">
        <ChevronLeft size={18} /> Volver a los juegos
      </button>
      <span className="mbg-eyebrow">ZONA DE DESAFÍOS</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}

function Result({ score, onRestart, onExit }: {
  score: number;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <section className="mbg-result">
      <Trophy size={48} />
      <h3>¡Desafío completado!</h3>
      <p>Tu puntuación final</p>
      <strong>{score} puntos</strong>
      <div className="mbg-actions">
        <button onClick={onRestart}><RotateCcw size={17} /> Volver a jugar</button>
        <button className="secondary" onClick={onExit}>Volver a los juegos</button>
      </div>
    </section>
  );
}

/* MEMORIA BÍBLICA */
const memoryPairs = [
  ['David', 'Goliat', '🪨'],
  ['Noé', 'Arca', '🚢'],
  ['Moisés', 'Mar Rojo', '🌊'],
  ['Daniel', 'Leones', '🦁'],
  ['Jonás', 'Gran pez', '🐋'],
  ['Jesús', 'Panes y peces', '🐟'],
  ['Abraham', 'Isaac', '⛰️'],
  ['José', 'Túnica de colores', '👘'],
  ['Ester', 'Reina', '👑'],
  ['Sansón', 'Fuerza', '💪'],
  ['Rut', 'Noemí', '🌾'],
  ['Elías', 'Fuego del cielo', '🔥'],
  ['Jonatán', 'Amistad con David', '🤝'],
  ['Pablo', 'Damasco', '🛤️'],
];

type MemoryCard = { id: number; pair: number; text: string; symbol: string };

function makeMemoryCards(): MemoryCard[] {
  return shuffle(shuffle(memoryPairs).slice(0, 8).flatMap((pair, index) => [
    { id: index * 2, pair: index, text: pair[0], symbol: pair[2] },
    { id: index * 2 + 1, pair: index, text: pair[1], symbol: pair[2] },
  ]));
}

export function MemoryGame({ onExit }: { onExit: () => void }) {
  const [cards, setCards] = useState(makeMemoryCards);
  const [opened, setOpened] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);

  function flip(card: MemoryCard) {
    if (busy || opened.includes(card.id) || matched.includes(card.pair)) return;

    if (opened.length === 0) {
      setOpened([card.id]);
      return;
    }

    const first = cards.find((item) => item.id === opened[0]);
    if (!first) return;

    setOpened([opened[0], card.id]);
    setMoves((value) => value + 1);
    setBusy(true);

    if (first.pair === card.pair) {
      const nextMatched = [...matched, card.pair];
      setMatched(nextMatched);
      playGameTone('success');
      if (nextMatched.length === cards.length / 2) setFinished(true);
    } else {
      playGameTone('incorrect');
    }

    window.setTimeout(() => {
      setOpened([]);
      setBusy(false);
    }, 850);
  }

  function restart() {
    setCards(makeMemoryCards());
    setOpened([]);
    setMatched([]);
    setMoves(0);
    setFinished(false);
    setBusy(false);
  }

  return (
    <section className="mbg-game">
      <Header title="Memoria bíblica" subtitle="Encuentra ocho parejas bíblicas diferentes en cada partida." onExit={onExit} />
      {finished ? (
        <Result score={Math.max(0, 160 - moves * 5)} onRestart={restart} onExit={onExit} />
      ) : (
        <>
          <div className="mbg-stats">
            <span>Parejas: <b>{matched.length}/{cards.length / 2}</b></span>
            <span>Intentos: <b>{moves}</b></span>
          </div>
          <div className="mbg-memory-grid">
            {cards.map((card) => {
              const visible = opened.includes(card.id) || matched.includes(card.pair);
              return (
                <button
                  type="button"
                  key={card.id}
                  className={`mbg-memory-card ${visible ? 'revealed' : ''} ${matched.includes(card.pair) ? 'matched' : ''}`}
                  onClick={() => flip(card)}
                  disabled={visible || busy}
                >
                  {visible ? (
                    <>
                      <span>{card.symbol}</span>
                      <b>{card.text}</b>
                    </>
                  ) : <span className="mbg-card-question">?</span>}
                </button>
              );
            })}
          </div>
          <button className="mbg-secondary-button" onClick={restart}><Shuffle size={16} /> Mezclar y reiniciar</button>
        </>
      )}
    </section>
  );
}

/* RETO DE 60 SEGUNDOS */
export function ChallengeGame({ onExit }: { onExit: () => void }) {
  const [seconds, setSeconds] = useState(60);
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(makeQuestionBank);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (seconds === 0) setFinished(true);
  }, [seconds]);

  const question = questions[index % questions.length];

  function answer(option: string) {
    if (answered !== null || finished) return;
    setAnswered(option);
    playGameTone(option === question.answer ? 'success' : 'incorrect');
    if (option === question.answer) setScore((value) => value + 10);
  }

  function next() {
    if (answered === null) return;
    setIndex((value) => value + 1);
    setAnswered(null);
  }

  function restart() {
    setSeconds(60);
    setIndex(0);
    setQuestions(makeQuestionBank());
    setScore(0);
    setAnswered(null);
    setFinished(false);
  }

  return (
    <section className="mbg-game">
      <Header title="Reto de 60 segundos" subtitle="Responde correctamente antes de que se acabe el tiempo." onExit={onExit} />
      {finished ? <Result score={score} onRestart={restart} onExit={onExit} /> : (
        <>
          <div className="mbg-stats">
            <span><Timer size={17} /> Tiempo: <b>{seconds}s</b></span>
            <span><Star size={17} /> Puntos: <b>{score}</b></span>
          </div>
          <QuizQuestion question={question} answered={answered} onAnswer={answer} />
          <button className="mbg-primary-button" disabled={answered === null} onClick={next}>
            Siguiente pregunta <ChevronRight size={17} />
          </button>
        </>
      )}
    </section>
  );
}

/* SUPERVIVENCIA */
export function SurvivalGame({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(makeQuestionBank);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[index % questions.length];
  const correct = answered === question.answer;

  function answer(option: string) {
    if (answered !== null || finished) return;
    setAnswered(option);
    playGameTone(option === question.answer ? 'success' : 'incorrect');
    if (option === question.answer) {
      setScore((value) => value + 10);
    } else {
      setLives((value) => value - 1);
    }
  }

  function next() {
    if (answered === null) return;
    if (!correct && lives <= 1) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setAnswered(null);
  }

  function restart() {
    setIndex(0);
    setQuestions(makeQuestionBank());
    setLives(3);
    setScore(0);
    setAnswered(null);
    setFinished(false);
  }

  return (
    <section className="mbg-game">
      <Header title="Supervivencia" subtitle="Tienes tres vidas. ¿Cuántas preguntas puedes superar?" onExit={onExit} />
      {finished ? <Result score={score} onRestart={restart} onExit={onExit} /> : (
        <>
          <div className="mbg-stats">
            <span><Heart size={17} /> Vidas: <b>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</b></span>
            <span><Star size={17} /> Puntos: <b>{score}</b></span>
            <span>Nivel: <b>{index + 1}</b></span>
          </div>
          <QuizQuestion question={question} answered={answered} onAnswer={answer} />
          {answered !== null && (
            <div className={`mbg-feedback ${correct ? 'good' : 'bad'}`}>
              {correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {correct ? '¡Correcto! Conservas tus vidas.' : `Respuesta correcta: ${question.answer}`}
            </div>
          )}
          <button className="mbg-primary-button" disabled={answered === null} onClick={next}>
            Continuar <ChevronRight size={17} />
          </button>
        </>
      )}
    </section>
  );
}

/* DUELO 1 CONTRA 1: LOCAL EN UN MISMO DISPOSITIVO */
export function DuelGame({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState(['Jugador 1', 'Jugador 2']);
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState(0);
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(makeQuestionBank);
  const [scores, setScores] = useState([0, 0]);
  const [answered, setAnswered] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[round % questions.length];

  function answer(option: string) {
    if (answered !== null) return;
    setAnswered(option);
    playGameTone(option === question.answer ? 'success' : 'incorrect');
    if (option === question.answer) {
      setScores((old) => old.map((score, i) => i === turn ? score + 10 : score));
    }
  }

  function next() {
    if (answered === null) return;
    if (round === 9) {
      setFinished(true);
      return;
    }
    setRound((value) => value + 1);
    setTurn((value) => value === 0 ? 1 : 0);
    setAnswered(null);
  }

  function restart() {
    setTurn(0);
    setRound(0);
    setQuestions(makeQuestionBank());
    setScores([0, 0]);
    setAnswered(null);
    setFinished(false);
    setStarted(false);
  }

  if (!started) {
    return (
      <section className="mbg-game">
        <Header title="Duelo 1 contra 1" subtitle="Dos jóvenes, diez turnos y un ganador." onExit={onExit} />
        <div className="mbg-duel-setup">
          <label>Nombre del jugador 1<input value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} /></label>
          <label>Nombre del jugador 2<input value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} /></label>
          <p><Users size={17} /> El duelo se juega por turnos en este mismo dispositivo.</p>
          <button className="mbg-primary-button" onClick={() => setStarted(true)} disabled={!names[0].trim() || !names[1].trim()}>
            Comenzar duelo <Swords size={17} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mbg-game">
      <Header title="Duelo 1 contra 1" subtitle="Responde por turnos y consigue más puntos." onExit={onExit} />
      {finished ? (
        <section className="mbg-result">
          <Trophy size={48} />
          <h3>{scores[0] === scores[1] ? '¡Empate!' : `¡Ganó ${scores[0] > scores[1] ? names[0] : names[1]}!`}</h3>
          <p>{names[0]}: {scores[0]} puntos · {names[1]}: {scores[1]} puntos</p>
          <div className="mbg-actions">
            <button onClick={restart}><RotateCcw size={17} /> Nuevo duelo</button>
            <button className="secondary" onClick={onExit}>Volver a los juegos</button>
          </div>
        </section>
      ) : (
        <>
          <div className="mbg-duel-scores">
            <div className={turn === 0 ? 'turn-active' : ''}><b>{names[0]}</b><strong>{scores[0]}</strong></div>
            <span>VS</span>
            <div className={turn === 1 ? 'turn-active' : ''}><b>{names[1]}</b><strong>{scores[1]}</strong></div>
          </div>
          <div className="mbg-stats">
            <span>Turno <b>{round + 1} de 10</b></span>
            <span>Juega <b>{names[turn]}</b></span>
          </div>
          <QuizQuestion question={question} answered={answered} onAnswer={answer} />
          {answered !== null && (
            <div className={`mbg-feedback ${answered === question.answer ? 'good' : 'bad'}`}>
              {answered === question.answer ? '¡Punto para este jugador!' : `La respuesta era ${question.answer}.`}
            </div>
          )}
          <button className="mbg-primary-button" disabled={answered === null} onClick={next}>
            {round === 9 ? 'Ver ganador' : 'Pasar al siguiente jugador'} <ChevronRight size={17} />
          </button>
        </>
      )}
    </section>
  );
}

/* ORDENAR VERSÍCULOS */
const verseLevels = [
  { ref: 'Salmo 23:1', text: 'Jehová es mi pastor nada me faltará' },
  { ref: 'Filipenses 4:13', text: 'Todo lo puedo en Cristo que me fortalece' },
  { ref: 'Juan 11:35', text: 'Jesús lloró' },
  { ref: 'Génesis 1:1', text: 'En el principio creó Dios los cielos y la tierra' },
  { ref: 'Salmo 119:105', text: 'Lámpara es a mis pies tu palabra y lumbrera a mi camino' },
  { ref: 'Juan 3:16', text: 'Porque de tal manera amó Dios al mundo que ha dado a su Hijo unigénito' },
  { ref: 'Proverbios 3:5', text: 'Fíate de Jehová de todo tu corazón y no te apoyes en tu propia prudencia' },
  { ref: 'Josué 1:9', text: 'Mira que te mando que te esfuerces y seas valiente no temas ni desmayes' },
  { ref: 'Mateo 6:33', text: 'Mas buscad primeramente el reino de Dios y su justicia y todas estas cosas os serán añadidas' },
  { ref: 'Salmo 46:1', text: 'Dios es nuestro amparo y fortaleza nuestro pronto auxilio en las tribulaciones' },
  { ref: '1 Corintios 13:4', text: 'El amor es sufrido es benigno el amor no tiene envidia' },
  { ref: 'Romanos 8:28', text: 'Y sabemos que a los que aman a Dios todas las cosas les ayudan a bien' },
  { ref: 'Mateo 11:28', text: 'Venid a mí todos los que estáis trabajados y cargados y yo os haré descansar' },
  { ref: 'Gálatas 5:22', text: 'Mas el fruto del Espíritu es amor gozo paz paciencia benignidad bondad fe' },
  { ref: '1 Juan 4:19', text: 'Nosotros le amamos a él porque él nos amó primero' },
  { ref: 'Mateo 5:16', text: 'Así alumbre vuestra luz delante de los hombres para que vean vuestras buenas obras' },
  { ref: '1 Corintios 16:14', text: 'Todas vuestras cosas sean hechas con amor' },
  { ref: 'Salmo 150:6', text: 'Todo lo que respira alabe a JAH Aleluya' },
  { ref: '2 Timoteo 1:7', text: 'Porque no nos ha dado Dios espíritu de cobardía sino de poder de amor y de dominio propio' },
  { ref: 'Juan 10:10', text: 'Yo he venido para que tengan vida y para que la tengan en abundancia' },
  { ref: 'Salmo 34:8', text: 'Gustad y ved que es bueno Jehová dichoso el hombre que confía en él' },
];

type Word = { id: number; text: string };

function makeWords(level: number, source: typeof verseLevels = verseLevels): Word[] {
  return shuffle(source[level].text.split(' ').map((text, id) => ({ id, text })));
}

export function OrderVerseGame({ onExit }: { onExit: () => void }) {
  const [roundVerses, setRoundVerses] = useState(() => shuffle(verseLevels));
  const [level, setLevel] = useState(0);
  const [words, setWords] = useState(() => makeWords(0, roundVerses));
  const [selected, setSelected] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = roundVerses[level];
  const arranged = selected.map((id) => words.find((word) => word.id === id)?.text ?? '');
  const correct = arranged.join(' ') === current.text;

  function choose(id: number) {
    if (selected.includes(id) || feedback === 'correcto') return;
    playGameTone('tap');
    setSelected((old) => [...old, id]);
    setFeedback('');
  }

  function removeWord(id: number) {
    if (feedback === 'correcto') return;
    setSelected((old) => old.filter((item) => item !== id));
    setFeedback('');
  }

  function check() {
    if (selected.length !== words.length) {
      setFeedback('Te faltan palabras por ordenar.');
      return;
    }
    if (correct) {
      playGameTone('success');
      setFeedback('correcto');
      setScore((value) => value + 20);
    } else {
      playGameTone('incorrect');
      setFeedback('Inténtalo otra vez. El orden todavía no es correcto.');
    }
  }

  function next() {
    if (level === verseLevels.length - 1) {
      setFinished(true);
      return;
    }
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setWords(makeWords(nextLevel, roundVerses));
    setSelected([]);
    setFeedback('');
  }

  function restart() {
    const nextVerses = shuffle(verseLevels);
    setRoundVerses(nextVerses);
    setLevel(0);
    setWords(makeWords(0, nextVerses));
    setSelected([]);
    setFeedback('');
    setScore(0);
    setFinished(false);
  }

  return (
    <section className="mbg-game">
      <Header title="Ordena el versículo" subtitle="Toca las palabras en el orden correcto para reconstruir cada versículo." onExit={onExit} />
      {finished ? <Result score={score} onRestart={restart} onExit={onExit} /> : (
        <>
          <div className="mbg-stats">
            <span>Nivel: <b>{level + 1}/{verseLevels.length}</b></span>
            <span><Star size={17} /> Puntos: <b>{score}</b></span>
          </div>
          <div className="mbg-word-board">
            <span className="mbg-eyebrow">{current.ref}</span>
            <p className="mbg-word-instruction">Tu versículo ordenado:</p>
            <div className="mbg-arranged">
              {selected.length === 0 && <span className="mbg-placeholder">Selecciona las palabras de abajo</span>}
              {selected.map((id) => {
                const word = words.find((item) => item.id === id);
                return word ? <button key={id} onClick={() => removeWord(id)}>{word.text} ×</button> : null;
              })}
            </div>
            <div className="mbg-word-options">
              {words.filter((word) => !selected.includes(word.id)).map((word) => (
                <button key={word.id} onClick={() => choose(word.id)}>{word.text}</button>
              ))}
            </div>
            {feedback && (
              <div className={`mbg-feedback ${feedback === 'correcto' ? 'good' : 'bad'}`}>
                {feedback === 'correcto' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {feedback === 'correcto' ? '¡Excelente! El versículo está correcto. +20 puntos.' : feedback}
              </div>
            )}
            <div className="mbg-actions">
              {feedback === 'correcto' ? (
                <button onClick={next}>{level === verseLevels.length - 1 ? 'Ver resultados' : 'Siguiente versículo'} <ChevronRight size={17} /></button>
              ) : (
                <>
                  <button onClick={check} disabled={selected.length !== words.length}>Comprobar</button>
                  <button className="secondary" onClick={() => { setSelected([]); setFeedback(''); }}>Reiniciar palabras</button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function QuizQuestion({ question, answered, onAnswer }: {
  question: Question;
  answered: string | null;
  onAnswer: (option: string) => void;
}) {
  return (
    <article className="mbg-question">
      <span className="mbg-eyebrow">{question.reference}</span>
      <h3>{question.prompt}</h3>
      <div className="mbg-options">
        {question.options.map((option) => {
          const isAnswer = option === question.answer;
          const isSelected = answered === option;
          const cls = answered !== null && isAnswer
            ? 'correct'
            : isSelected && !isAnswer
              ? 'incorrect'
              : '';
          return (
            <button
              type="button"
              key={option}
              className={cls}
              disabled={answered !== null}
              onClick={() => onAnswer(option)}
            >
              {option}
              {answered !== null && isAnswer && <CheckCircle2 size={18} />}
              {isSelected && !isAnswer && <XCircle size={18} />}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <div className={`mbg-answer-detail ${answered === question.answer ? 'good' : 'bad'}`}>
          <div className="mbg-answer-heading">
            {answered === question.answer
              ? <CheckCircle2 size={20} />
              : <XCircle size={20} />}
            <strong>
              {answered === question.answer
                ? '¡Respuesta correcta!'
                : 'Respuesta bíblica correcta'}
            </strong>
          </div>
          <p>
            <b>Respuesta:</b> {question.answer}
          </p>
          <span className="mbg-bible-reference">
            <BookOpenIcon /> Referencia: {question.reference}
          </span>
          <p className="mbg-bible-explanation">
            {question.explanation}
          </p>
        </div>
      )}
    </article>
  );
}


function BookOpenIcon() {
  return <Star size={15} />;
}
