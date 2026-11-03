import { useState } from 'react';
import { bibleVerseChallenges, type VerseChallenge } from './bibleQuestionBank';
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

type Question = VerseChallenge;

const questions: Question[] = bibleVerseChallenges;

export default function VerseGame({
  onExit,
}: {
  onExit: () => void;
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
  const percentage = Math.round((score / (questions.length * 10)) * 100);

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
                <div className="verse-feedback-main">
                  {isCorrect ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <XCircle size={21} />
                  )}

                  <div>
                    <strong>
                      {isCorrect
                        ? '¡Muy bien! Respuesta correcta.'
                        : 'Respuesta incorrecta. Aprende la respuesta bíblica.'}
                    </strong>

                    <span>
                      Respuesta correcta: {currentQuestion.answer}
                    </span>
                  </div>
                </div>

                <div className="verse-bible-detail">
                  <span className="verse-bible-reference">
                    <BookOpen size={15} />
                    Referencia: {currentQuestion.reference}
                  </span>

                  <p>
                    {currentQuestion.explanation}
                  </p>
                </div>
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
            <small>de {questions.length * 10} puntos · {percentage}%</small>
          </div>

          <div className="verse-result-message">
            {percentage === 100
              ? '¡Excelente! Conoces muy bien las Escrituras.'
              : percentage >= 70
                ? '¡Muy bien! Sigue fortaleciendo tu conocimiento bíblico.'
                : percentage >= 40
                  ? 'Vas por buen camino. Sigue estudiando la Palabra.'
                  : '¡No te rindas! Practica y vuelve a intentarlo.'}
          </div>

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
