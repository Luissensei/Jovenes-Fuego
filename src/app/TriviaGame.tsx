import {playGameTone} from './gameAudio';

import { useEffect, useState } from 'react';
import { shuffleBibleQuestions, type BibleQuestion } from './bibleQuestionBank';
import { expandedBibleQuestionBank } from './extendedBibleQuestionBank';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  Trophy,
  RotateCcw,
  Flame,
  Lightbulb,
  BookOpen,
  Zap,
  Target,
  Sparkles,
} from 'lucide-react';

type Question = BibleQuestion;

type Props = {
  onExit: () => void;
};

export default function TriviaGame({ onExit }: Props) {
  const [started, setStarted] = useState(false);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>(expandedBibleQuestionBank.slice(0, 10));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(20);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastEarned, setLastEarned] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = roundQuestions[current];
  const progress = ((current + 1) / roundQuestions.length) * 100;

  // Temporizador de cada pregunta.
  useEffect(() => {
    if (!started || finished || selected !== null) return;

    if (seconds === 0) {
      setSelected(-1);
      setStreak(0);
      return;
    }

    const timeout = window.setTimeout(() => {
      setSeconds((previous) => previous - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [started, finished, selected, seconds]);

  // Avanza automáticamente después de mostrar la explicación.
  useEffect(() => {
    if (!started || finished || selected === null) return;

    const timeout = window.setTimeout(() => {
      if (current >= roundQuestions.length - 1) {
        setFinished(true);
        return;
      }

      setCurrent((previous) => previous + 1);
      setSelected(null);
      setSeconds(20);
      setShowHint(false);
      setLastEarned(0);
    }, 2800);

    return () => window.clearTimeout(timeout);
  }, [started, finished, selected, current, roundQuestions.length]);

  function startGame() {
    setRoundQuestions(shuffleBibleQuestions(expandedBibleQuestionBank).slice(0, 10));
    setStarted(true);
    setFinished(false);
    setCurrent(0);
    setSelected(null);
    setSeconds(20);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    setLastEarned(0);
    setHintsRemaining(2);
    setShowHint(false);
  }

  function chooseAnswer(index: number) {
    if (selected !== null || finished) return;

    setSelected(index);
    playGameTone(index === question.answer ? 'success' : 'incorrect');

    if (index === question.answer) {
      const newStreak = streak + 1;
      const basePoints =
        question.level === 'Básico'
          ? 10
          : question.level === 'Intermedio'
            ? 15
            : 20;

      const speedBonus = Math.min(5, Math.floor(seconds / 4));
      const streakBonus = newStreak % 3 === 0 ? 5 : 0;
      const earned = basePoints + speedBonus + streakBonus;

      setScore((previous) => previous + earned);
      setCorrectAnswers((previous) => previous + 1);
      setStreak(newStreak);
      setBestStreak((previous) => Math.max(previous, newStreak));
      setLastEarned(earned);
    } else {
      setStreak(0);
      setLastEarned(0);
    }
  }

  function useHint() {
    if (showHint || hintsRemaining <= 0 || selected !== null) return;

    setShowHint(true);
    setHintsRemaining((previous) => previous - 1);
  }

  if (!started) {
    return (
      <section className="trivia-shell trivia-enter">
        <button className="trivia-back" onClick={onExit}>
          <ArrowLeft size={18} /> Volver a los juegos
        </button>

        <div className="trivia-intro">
          <div className="trivia-main-icon">
            <Flame size={38} />
          </div>

          <span className="trivia-eyebrow">DESAFÍO BÍBLICO</span>
          <h2>Trivia bíblica</h2>

          <p>
            Pon a prueba tus conocimientos de la Palabra de Dios.
            Cada respuesta te enseñará algo nuevo.
          </p>

          <div className="trivia-rules">
            <div>
              <Clock3 size={20} />
              <strong>20 segundos</strong>
              <span>por pregunta</span>
            </div>

            <div>
              <Trophy size={20} />
              <strong>10 a 20 puntos</strong>
              <span>según dificultad</span>
            </div>

            <div>
              <BookOpen size={20} />
              <strong>10 preguntas</strong>
              <span>con referencias bíblicas</span>
            </div>
          </div>

          <div className="trivia-extra-info">
            <Zap size={17} />
            <span>Gana bonus por responder rápido y mantener una racha.</span>
          </div>

          <div className="trivia-extra-info">
            <Lightbulb size={17} />
            <span>Tienes 2 pistas para usar durante la partida.</span>
          </div>

          <button className="trivia-primary" onClick={startGame}>
            <Flame size={18} /> Comenzar juego
          </button>
        </div>
      </section>
    );
  }

  if (finished) {
    const percentage = Math.round(
      (correctAnswers / roundQuestions.length) * 100,
    );

    return (
      <section className="trivia-shell trivia-enter">
        <div className="trivia-result">
          <div className="trivia-result-icon">
            <Trophy size={44} />
            <Sparkles className="trivia-result-sparkle" size={20} />
          </div>

          <span className="trivia-eyebrow">PARTIDA TERMINADA</span>
          <h2>
            {percentage >= 80
              ? '¡Excelente trabajo!'
              : percentage >= 50
                ? '¡Vas por buen camino!'
                : '¡Sigue aprendiendo!'}
          </h2>

          <div className="trivia-final-score">
            <strong>{score}</strong>
            <span>puntos obtenidos en esta partida</span>
          </div>

          <div className="trivia-result-stats">
            <div>
              <CheckCircle2 size={20} />
              <strong>{correctAnswers}</strong>
              <span>Correctas</span>
            </div>

            <div>
              <XCircle size={20} />
              <strong>{roundQuestions.length - correctAnswers}</strong>
              <span>Incorrectas o sin responder</span>
            </div>

            <div>
              <Target size={20} />
              <strong>{percentage}%</strong>
              <span>Precisión</span>
            </div>

            <div>
              <Flame size={20} />
              <strong>{bestStreak}</strong>
              <span>Mejor racha</span>
            </div>
          </div>

          <p>
            Sigue creciendo en el conocimiento de la Palabra de Dios.
          </p>

          <button className="trivia-primary" onClick={startGame}>
            <RotateCcw size={18} /> Jugar nuevamente
          </button>

          <button className="trivia-secondary" onClick={onExit}>
            Volver a los juegos
          </button>

          <small className="trivia-notice">
            La puntuación todavía no se ha guardado en el ranking.
          </small>
        </div>
      </section>
    );
  }

  return (
    <section className="trivia-shell trivia-enter">
      <div className="trivia-game-top">
        <button className="trivia-back" onClick={onExit}>
          <ArrowLeft size={18} /> Salir
        </button>

        <span className={`trivia-level ${question.level.toLowerCase()}`}>
          {question.level}
        </span>
      </div>

      <div className="trivia-dashboard">
        <div>
          <span>Pregunta</span>
          <strong>{current + 1}/{roundQuestions.length}</strong>
        </div>

        <div>
          <span>Puntuación</span>
          <strong>{score}</strong>
        </div>

        <div>
          <span>Racha</span>
          <strong><Flame size={15} /> {streak}</strong>
        </div>
      </div>

      <div className="trivia-progress">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className={`trivia-timer ${seconds <= 5 ? 'urgent' : ''}`}>
        <Clock3 size={20} />
        <strong>{seconds}</strong>
        <span>segundos</span>
      </div>

      <div className="trivia-question-card">
        <span className="trivia-eyebrow">
          NIVEL {question.level.toUpperCase()}
        </span>

        <h2>{question.question}</h2>

        <div className="trivia-options">
          {question.options.map((option, index) => {
            const isCorrect = index === question.answer;
            const isSelected = selected === index;

            let className = 'trivia-option';

            if (selected !== null && isCorrect) {
              className += ' correct';
            } else if (isSelected && !isCorrect) {
              className += ' incorrect';
            }

            return (
              <button
                key={option}
                className={className}
                disabled={selected !== null}
                onClick={() => chooseAnswer(index)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option}

                {selected !== null && isCorrect && (
                  <CheckCircle2 size={19} />
                )}

                {isSelected && !isCorrect && (
                  <XCircle size={19} />
                )}
              </button>
            );
          })}
        </div>

        {selected === null && (
          <div className="trivia-hint-area">
            <button
              className="trivia-hint-button"
              onClick={useHint}
              disabled={hintsRemaining === 0 || showHint}
            >
              <Lightbulb size={17} />
              {showHint ? 'Pista utilizada' : `Usar pista (${hintsRemaining})`}
            </button>

            {showHint && (
              <p className="trivia-hint-text">
                {question.hint}
              </p>
            )}
          </div>
        )}

        {selected !== null && (
          <div
            className={`trivia-feedback trivia-reveal ${
              selected === question.answer ? 'success' : 'failure'
            }`}
          >
            <div className="trivia-feedback-heading">
              {selected === question.answer ? (
                <CheckCircle2 size={22} />
              ) : (
                <XCircle size={22} />
              )}

              <strong>
                {selected === question.answer
                  ? `¡Correcto! +${lastEarned} puntos`
                  : selected === -1
                    ? '¡Se acabó el tiempo!'
                    : 'Respuesta incorrecta'}
              </strong>
            </div>

            {selected === question.answer && (
              <small className="trivia-bonus">
                {streak > 0 ? `Racha actual: ${streak}` : ''}
                {streak > 0 && streak % 3 === 0
                  ? ' · ¡Bonus de racha!'
                  : ''}
              </small>
            )}

            <p>{question.explanation}</p>

            <div className="trivia-bible-reference">
              <BookOpen size={20} />

              <div>
                <strong>Lectura bíblica: {question.reference}</strong>
                <span>{question.biblicalNote}</span>
              </div>
            </div>

            <div className="trivia-auto-next">
              <span className="trivia-auto-pulse" />
              {current === roundQuestions.length - 1
                ? 'Mostrando resultados...'
                : 'Preparando la siguiente pregunta...'}
            </div>
          </div>
        )}
      </div>

      <p className="trivia-game-footer">
        Jóvenes de Fuego · Aprende, juega y crece.
      </p>
    </section>
  );
}
