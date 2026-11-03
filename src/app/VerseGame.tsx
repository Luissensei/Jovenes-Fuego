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

import './VerseGame.css';

type Question = {
  reference: string;
  prompt: string;
  options: string[];
  answer: string;
};

const questions: Question[] = [
  {
    reference: 'Salmo 23:1',
    prompt: 'David presenta al Señor como el buen...',
    options: ['Pastor', 'Rey', 'Juez', 'Soldado'],
    answer: 'Pastor',
  },
  {
    reference: 'Filipenses 4:13',
    prompt: 'Pablo enseña que puede enfrentar cualquier situación gracias a...',
    options: ['Sus riquezas', 'Cristo', 'Sus amigos', 'Su inteligencia'],
    answer: 'Cristo',
  },
  {
    reference: 'Proverbios 3:5',
    prompt: 'El proverbio invita a confiar en el Señor con todo el...',
    options: ['Dinero', 'Tiempo', 'Corazón', 'Talento'],
    answer: 'Corazón',
  },
  {
    reference: 'Josué 1:9',
    prompt: 'Dios anima a Josué a ser fuerte y...',
    options: ['Famoso', 'Valiente', 'Rico', 'Veloz'],
    answer: 'Valiente',
  },
  {
    reference: 'Mateo 5:14',
    prompt: 'Jesús compara a sus seguidores con la luz del...',
    options: ['Templo', 'Desierto', 'Mundo', 'Cielo'],
    answer: 'Mundo',
  },
  {
    reference: '1 Corintios 13:4',
    prompt: 'Entre las cualidades del amor se menciona la...',
    options: ['Envidia', 'Paciencia', 'Vanidad', 'Prisa'],
    answer: 'Paciencia',
  },
  {
    reference: 'Romanos 12:2',
    prompt: 'Pablo aconseja no adoptar los criterios de este...',
    options: ['Templo', 'Pueblo', 'Mundo', 'Desierto'],
    answer: 'Mundo',
  },
  {
    reference: 'Efesios 6:11',
    prompt: 'Pablo enseña a ponerse toda la armadura de...',
    options: ['Hierro', 'Dios', 'Un soldado', 'Un rey'],
    answer: 'Dios',
  },
  {
    reference: 'Génesis 1:1',
    prompt: 'En el principio, Dios creó los cielos y la...',
    options: ['Luna', 'Luz', 'Tierra', 'Mar'],
    answer: 'Tierra',
  },
  {
    reference: 'Juan 11:35',
    prompt: 'Cuando llegó a la tumba de Lázaro, Jesús...',
    options: ['Cantó', 'Lloró', 'Corrió', 'Durmió'],
    answer: 'Lloró',
  },
];

export default function VerseGame({
  onExit,
  playerName,
}: {
  onExit: () => void;
  playerName?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  const progress =
    ((currentIndex + (selectedAnswer !== null ? 1 : 0)) /
      questions.length) *
    100;

  const isCorrect = selectedAnswer === currentQuestion.answer;

  function selectAnswer(option: string) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(option);

    if (option === currentQuestion.answer) {
      setScore((previous) => previous + 10);
    }
  }

  function nextQuestion() {
    if (selectedAnswer === null) return;

    if (currentIndex === questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentIndex((previous) => previous + 1);
    setSelectedAnswer(null);
  }

  function restartGame() {
    setCurrentIndex(0);
    setSelectedAnswer(null);
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

        <h2>Completa el versículo</h2>
        <p>Demuestra cuánto recuerdas de las Escrituras.</p>
        {playerName && <small>Jugando como {playerName}</small>}
      </header>

      {!finished ? (
        <>
          <div className="verse-game-stats">
            <div>
              <span>Pregunta</span>
              <strong>{currentIndex + 1} / {questions.length}</strong>
            </div>

            <div>
              <span>Tu puntuación</span>
              <strong><Star size={16} /> {score}</strong>
            </div>
          </div>

          <div className="verse-progress">
            <div
              className="verse-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <article className="verse-question-card">
            <span className="verse-question-number">
              PREGUNTA {currentIndex + 1}
            </span>

            <span className="verse-reference">
              <BookOpen size={16} />
              {currentQuestion.reference}
            </span>

            <h3>{currentQuestion.prompt}</h3>

            <p className="verse-instruction">
              Selecciona la respuesta correcta.
            </p>

            <div className="verse-options">
              {currentQuestion.options.map((option, index) => {
                const selected = selectedAnswer === option;
                const correct = option === currentQuestion.answer;

                let className = 'verse-option';

                if (selectedAnswer !== null && correct) {
                  className += ' correct';
                } else if (selected && !correct) {
                  className += ' incorrect';
                }

                return (
                  <button
                    type="button"
                    key={option}
                    className={className}
                    onClick={() => selectAnswer(option)}
                    disabled={selectedAnswer !== null}
                  >
                    <span className="verse-option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>

                    <span>{option}</span>

                    {selectedAnswer !== null && correct && (
                      <CheckCircle2 size={19} />
                    )}

                    {selected && !correct && (
                      <XCircle size={19} />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedAnswer !== null && (
              <div className={`verse-feedback ${isCorrect ? 'success' : 'error'}`}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 size={21} />
                    <div>
                      <strong>¡Muy bien! Respuesta correcta.</strong>
                      <span>Has ganado 10 puntos.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={21} />
                    <div>
                      <strong>¡Sigue intentando!</strong>
                      <span>
                        La respuesta correcta era: {currentQuestion.answer}.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              className="verse-next-button"
              onClick={nextQuestion}
              disabled={selectedAnswer === null}
            >
              {currentIndex === questions.length - 1
                ? 'Ver resultados'
                : 'Siguiente pregunta'}
              <ChevronRight size={18} />
            </button>
          </article>
        </>
      ) : (
        <article className="verse-results">
          <div className="verse-results-icon">
            <Trophy size={43} />
          </div>

          <span className="verse-game-label">
            DESAFÍO COMPLETADO
          </span>

          <h3>¡Buen trabajo!</h3>
          <p>Has terminado el desafío Completa el versículo.</p>

          <div className="verse-final-score">
            <span>Tu puntuación final</span>
            <strong>{score}</strong>
            <small>de 100 puntos</small>
          </div>

          <div className="verse-result-message">
            {score === 100
              ? '¡Excelente! Conoces muy bien las Escrituras.'
              : score >= 70
                ? '¡Muy bien! Sigue fortaleciendo tu conocimiento bíblico.'
                : score >= 40
                  ? 'Vas por buen camino. Sigue estudiando la Palabra.'
                  : '¡No te rindas! Practica y vuelve a intentarlo.'}
          </div>
          <p className="verse-instruction">
            Puntuación de práctica: todavía no se guarda en el ranking.
          </p>

          <div className="verse-result-actions">
            <button
              type="button"
              className="verse-next-button"
              onClick={restartGame}
            >
              <RotateCcw size={17} />
              Volver a jugar
            </button>

            <button
              type="button"
              className="verse-exit-button"
              onClick={onExit}
            >
              Volver a los juegos
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
