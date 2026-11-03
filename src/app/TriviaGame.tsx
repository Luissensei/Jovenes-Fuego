import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react';

type Question = {
  reference: string;
  prompt: string;
  options: string[];
  answer: string;
};

const questions: Question[] = [
  {
    reference: 'Génesis 6:14',
    prompt: '¿Quién construyó el arca?',
    options: ['Moisés', 'Noé', 'Abraham', 'David'],
    answer: 'Noé',
  },
  {
    reference: '1 Samuel 17:50',
    prompt: '¿Quién venció al gigante Goliat?',
    options: ['David', 'Salomón', 'Josué', 'Samuel'],
    answer: 'David',
  },
  {
    reference: 'Mateo 2:1',
    prompt: '¿En qué ciudad nació Jesús?',
    options: ['Jerusalén', 'Nazaret', 'Belén', 'Jericó'],
    answer: 'Belén',
  },
  {
    reference: 'Génesis 1:1',
    prompt: '¿Cuál es el primer libro de la Biblia?',
    options: ['Éxodo', 'Salmos', 'Mateo', 'Génesis'],
    answer: 'Génesis',
  },
  {
    reference: 'Jonás 1:17',
    prompt: '¿Quién fue tragado por un gran pez?',
    options: ['Pedro', 'Jonás', 'Pablo', 'Elías'],
    answer: 'Jonás',
  },
  {
    reference: 'Lucas 6:13',
    prompt: '¿Cuántos apóstoles escogió Jesús?',
    options: ['7', '10', '12', '40'],
    answer: '12',
  },
  {
    reference: 'Éxodo 31:18',
    prompt: '¿Quién recibió las tablas de los Diez Mandamientos?',
    options: ['Moisés', 'Josué', 'Aarón', 'Isaías'],
    answer: 'Moisés',
  },
  {
    reference: 'Juan 2:9',
    prompt: '¿Qué convirtió Jesús en vino en las bodas de Caná?',
    options: ['Aceite', 'Agua', 'Leche', 'Jugo'],
    answer: 'Agua',
  },
  {
    reference: 'Lucas 22:61',
    prompt: '¿Qué discípulo negó a Jesús tres veces?',
    options: ['Juan', 'Tomás', 'Pedro', 'Andrés'],
    answer: 'Pedro',
  },
  {
    reference: 'Mateo 3:13',
    prompt: '¿En qué río fue bautizado Jesús?',
    options: ['Nilo', 'Éufrates', 'Jordán', 'Tigris'],
    answer: 'Jordán',
  },
];

export default function TriviaGame({
  onExit,
  playerName,
}: {
  onExit: () => void;
  playerName?: string;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const correct = answer === question.answer;
  const progress = ((index + (answer !== null ? 1 : 0)) / questions.length) * 100;

  function choose(option: string) {
    if (answer !== null) return;
    setAnswer(option);
    if (option === question.answer) setScore((previous) => previous + 10);
  }

  function next() {
    if (answer === null) return;

    if (index === questions.length - 1) {
      setFinished(true);
      return;
    }

    setIndex((previous) => previous + 1);
    setAnswer(null);
  }

  function restart() {
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  return (
    <section className="verse-game">
      <header className="verse-game-header">
        <button
          type="button"
          className="verse-back-button"
          onClick={onExit}
        >
          <ChevronLeft size={18} />
          Volver a los juegos
        </button>

        <span className="verse-game-label">
          <BookOpen size={16} />
          DESAFÍO BÍBLICO
        </span>

        <h2>Trivia bíblica</h2>
        <p>Responde las preguntas y pon a prueba tus conocimientos.</p>
        {playerName && <small>Jugando como {playerName}</small>}
      </header>

      {!finished ? (
        <>
          <div className="verse-game-stats">
            <div>
              <span>Pregunta</span>
              <strong>{index + 1} / {questions.length}</strong>
            </div>
            <div>
              <span>Tu puntuación</span>
              <strong><Star size={16} /> {score}</strong>
            </div>
          </div>

          <div className="verse-progress">
            <div className="verse-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <article className="verse-question-card">
            <span className="verse-question-number">PREGUNTA {index + 1}</span>
            <span className="verse-reference">
              <BookOpen size={16} />
              {question.reference}
            </span>

            <h3>{question.prompt}</h3>
            <p className="verse-instruction">Selecciona la respuesta correcta.</p>

            <div className="verse-options">
              {question.options.map((option, optionIndex) => {
                const isSelected = answer === option;
                const isCorrect = option === question.answer;
                const className = answer === null
                  ? 'verse-option'
                  : isCorrect
                    ? 'verse-option correct'
                    : isSelected
                      ? 'verse-option incorrect'
                      : 'verse-option';

                return (
                  <button
                    type="button"
                    key={option}
                    className={className}
                    disabled={answer !== null}
                    onClick={() => choose(option)}
                  >
                    <span className="verse-option-letter">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>{option}</span>
                    {answer !== null && isCorrect && <CheckCircle2 size={19} />}
                    {isSelected && !isCorrect && <XCircle size={19} />}
                  </button>
                );
              })}
            </div>

            {answer !== null && (
              <div className={`verse-feedback ${correct ? 'success' : 'error'}`}>
                {correct ? (
                  <>
                    <CheckCircle2 size={21} />
                    <div>
                      <strong>¡Respuesta correcta!</strong>
                      <span>Has ganado 10 puntos en esta práctica.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={21} />
                    <div>
                      <strong>Sigue aprendiendo.</strong>
                      <span>La respuesta correcta era: {question.answer}.</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              className="verse-next-button"
              onClick={next}
              disabled={answer === null}
            >
              {index === questions.length - 1 ? 'Ver resultados' : 'Siguiente pregunta'}
              <ChevronRight size={18} />
            </button>
          </article>
        </>
      ) : (
        <article className="verse-results">
          <div className="verse-results-icon"><Trophy size={43} /></div>
          <span className="verse-game-label">DESAFÍO COMPLETADO</span>
          <h3>¡Buen trabajo{playerName ? `, ${playerName}` : ''}!</h3>
          <p>Terminaste la Trivia bíblica.</p>

          <div className="verse-final-score">
            <span>Tu puntuación final</span>
            <strong>{score}</strong>
            <small>de 100 puntos</small>
          </div>

          <p className="verse-instruction">
            Puntuación de práctica: todavía no se guarda en el ranking.
          </p>

          <div className="verse-result-actions">
            <button
              type="button"
              className="verse-next-button"
              onClick={restart}
            >
              <RotateCcw size={17} />
              Volver a jugar
            </button>
            <button
              type="button"
              className="verse-exit-button"
              onClick={onExit}
            >
              Volver a juegos
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
