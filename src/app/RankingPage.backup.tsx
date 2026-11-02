
import { useState } from 'react';
import {
  Trophy,
  Gamepad2,
  UserRound,
  Flame,
  Star,
  BookOpen,
  Brain,
  Timer,
  Swords,
  Puzzle,
  ChevronRight,
  Medal,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  LockKeyhole,
  Crown,
} from 'lucide-react';

type Profile = {
  id: string;
  name: string;
  nick: string;
  pic: string;
  points: number;
};

type Question = {
  question: string;
  answers: string[];
  correct: number;
  reference: string;
};

const initialProfiles: Profile[] = [
  { id: 'test_joven_001', name: 'Joven de prueba 1', nick: 'Fuego1', pic: '', points: 0 },
  { id: 'test_joven_002', name: 'Joven de prueba 2', nick: 'Fuego2', pic: '', points: 0 },
  { id: 'test_joven_003', name: 'Joven de prueba 3', nick: 'Fuego3', pic: '', points: 0 },
];

const questions: Question[] = [
  {
    question: '¿Quién construyó el arca?',
    answers: ['Moisés', 'Noé', 'Abraham', 'David'],
    correct: 1,
    reference: 'Génesis 6:13-14',
  },
  {
    question: '¿Cuántos discípulos escogió Jesús?',
    answers: ['7', '10', '12', '40'],
    correct: 2,
    reference: 'Lucas 6:13',
  },
  {
    question: '¿Quién venció al gigante Goliat?',
    answers: ['David', 'Salomón', 'Josué', 'Samuel'],
    correct: 0,
    reference: '1 Samuel 17:50',
  },
  {
    question: '¿Cuál fue el primer libro de la Biblia?',
    answers: ['Éxodo', 'Salmos', 'Mateo', 'Génesis'],
    correct: 3,
    reference: 'Génesis 1:1',
  },
  {
    question: '¿Quién fue tragado por un gran pez?',
    answers: ['Pedro', 'Jonás', 'Pablo', 'Elías'],
    correct: 1,
    reference: 'Jonás 1:17',
  },
  {
    question: '¿En qué ciudad nació Jesús?',
    answers: ['Jerusalén', 'Nazaret', 'Belén', 'Jericó'],
    correct: 2,
    reference: 'Mateo 2:1',
  },
  {
    question: '¿Quién recibió los diez mandamientos?',
    answers: ['Moisés', 'Josué', 'Aarón', 'Isaías'],
    correct: 0,
    reference: 'Éxodo 31:18',
  },
];

const games = [
  { id: 'trivia', title: 'Trivia bíblica', description: 'Demuestra cuánto sabes de la Biblia.', icon: BookOpen, color: 'orange', available: true },
  { id: 'verse', title: 'Completa el versículo', description: 'Recuerda y completa las Escrituras.', icon: Star, color: 'purple', available: false },
  { id: 'memory', title: 'Memoria bíblica', description: 'Encuentra las parejas correctas.', icon: Brain, color: 'blue', available: false },
  { id: 'challenge', title: 'Reto de 60 segundos', description: 'Responde antes de que termine el tiempo.', icon: Timer, color: 'green', available: false },
  { id: 'survival', title: 'Supervivencia', description: '¿Cuántas preguntas puedes superar?', icon: Flame, color: 'red', available: false },
  { id: 'duel', title: 'Duelo 1 contra 1', description: 'Compite con otro joven.', icon: Swords, color: 'purple', available: false },
  { id: 'order', title: 'Ordena el versículo', description: 'Organiza las palabras correctamente.', icon: Puzzle, color: 'blue', available: false },
];

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState('ranking');
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  const currentQuestion = questions[questionIndex];
  const sortedProfiles = [...profiles].sort((a, b) => b.points - a.points);

  function startTrivia() {
    setActiveGame('trivia');
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setCorrectAnswers(0);
    setGameFinished(false);
  }

  function answerQuestion(index: number) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(index);
    if (index === currentQuestion.correct) {
      setCorrectAnswers((value) => value + 1);
    }
  }

  function nextQuestion() {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((value) => value + 1);
      setSelectedAnswer(null);
    } else {
      const earned = correctAnswers * 10;
      if (selectedProfile) {
        setProfiles((previous) =>
          previous.map((profile) =>
            profile.id === selectedProfile.id
              ? { ...profile, points: profile.points + earned }
              : profile
          )
        );
        setSelectedProfile((previous) =>
          previous ? { ...previous, points: previous.points + earned } : null
        );
      }
      setGameFinished(true);
    }
  }

  function closeGame() {
    setActiveGame(null);
    setGameFinished(false);
    setSelectedAnswer(null);
  }

  return (
    <section className="ranking-hub">
      <div className="ranking-hero">
        <div>
          <span className="ranking-eyebrow">
            <Flame size={15} /> COMUNIDAD JÓVENES DE FUEGO
          </span>
          <h1>¡Que comience el desafío!</h1>
          <p>Aprende, juega, crece y demuestra lo que sabes de la Palabra de Dios.</p>
        </div>
        <div className="ranking-hero-icon">
          <Trophy size={48} />
          <Sparkles size={20} />
        </div>
      </div>

      {!activeGame && (
        <div className="ranking-tabs">
          <button className={activeTab === 'ranking' ? 'active' : ''} onClick={() => setActiveTab('ranking')}>
            <Trophy size={17} /> Ranking
          </button>
          <button className={activeTab === 'games' ? 'active' : ''} onClick={() => setActiveTab('games')}>
            <Gamepad2 size={17} /> Juegos
          </button>
          <button className={activeTab === 'profiles' ? 'active' : ''} onClick={() => setActiveTab('profiles')}>
            <UserRound size={17} /> Perfiles
          </button>
        </div>
      )}

      {activeGame === 'trivia' && (
        <div className="ranking-content">
          <button className="demo-toggle" onClick={closeGame}>
            <ArrowLeft size={16} /> Volver a juegos
          </button>

          {!gameFinished ? (
            <div className="trivia-panel">
              <div className="trivia-top">
                <span>TRIVIA BÍBLICA</span>
                <strong>{questionIndex + 1} / {questions.length}</strong>
              </div>
              <div className="trivia-progress">
                <span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
              </div>
              <h2>{currentQuestion.question}</h2>
              <div className="trivia-answers">
                {currentQuestion.answers.map((answer, index) => {
                  const isCorrect = index === currentQuestion.correct;
                  const isSelected = selectedAnswer === index;
                  let className = 'trivia-answer';
                  if (selectedAnswer !== null && isCorrect) className += ' correct';
                  else if (isSelected) className += ' incorrect';

                  return (
                    <button
                      key={answer}
                      className={className}
                      disabled={selectedAnswer !== null}
                      onClick={() => answerQuestion(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {answer}
                      {selectedAnswer !== null && isCorrect && <CheckCircle2 size={19} />}
                      {isSelected && !isCorrect && <XCircle size={19} />}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <div className="trivia-feedback">
                  <p>
                    {selectedAnswer === currentQuestion.correct
                      ? '¡Excelente! Respuesta correcta.'
                      : `Respuesta correcta: ${currentQuestion.answers[currentQuestion.correct]}`}
                  </p>
                  <small>{currentQuestion.reference}</small>
                  <button onClick={nextQuestion}>
                    {questionIndex + 1 === questions.length ? 'Ver resultados' : 'Siguiente pregunta'}
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="trivia-result">
              <div className="trivia-result-icon"><Trophy size={42} /></div>
              <span className="ranking-kicker">DESAFÍO COMPLETADO</span>
              <h2>¡Buen trabajo{selectedProfile ? `, ${selectedProfile.nick}` : ''}!</h2>
              <div className="trivia-result-score">
                <strong>{correctAnswers} / {questions.length}</strong>
                <span>Respuestas correctas</span>
              </div>
              <h3>+{correctAnswers * 10} puntos</h3>
              <p>Has terminado la trivia bíblica.</p>
              <button onClick={startTrivia}><RotateCcw size={17} /> Jugar otra vez</button>
              <button className="demo-toggle" onClick={closeGame}>Volver a juegos</button>
            </div>
          )}
        </div>
      )}

      {!activeGame && activeTab === 'ranking' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">CLASIFICACIÓN</span>
              <h2>Los mejores participantes</h2>
              <p>Acumula puntos participando en los desafíos.</p>
            </div>
            <Trophy size={25} />
          </div>

          {sortedProfiles.some((profile) => profile.points > 0) ? (
            <div className="ranking-list">
              {sortedProfiles.map((profile, index) => (
                <article className="ranking-player" key={profile.id}>
                  <span className="ranking-position">{index + 1}</span>
                  <span className="profile-avatar">
                    <UserRound size={25} />
                  </span>
                  <div className="ranking-player-info">
                    <strong>{profile.name}</strong>
                    <small>@{profile.nick}</small>
                  </div>
                  <strong className="ranking-player-points">{profile.points} pts</strong>
                  {index === 0 && <Crown size={20} />}
                </article>
              ))}
            </div>
          ) : (
            <div className="ranking-empty">
              <div className="ranking-empty-icon"><Medal size={34} /></div>
              <h3>Tu historia comienza aquí</h3>
              <p>Juega, completa desafíos y acumula puntos para aparecer en el ranking de Jóvenes de Fuego.</p>
              <button onClick={() => setActiveTab('games')}>Explorar juegos <ChevronRight size={17} /></button>
            </div>
          )}

          <div className="ranking-info-grid">
            <article><Flame size={22} /><strong>Incendio</strong><span>Rango por alcanzar</span></article>
            <article><Star size={22} /><strong>Llama</strong><span>Rango por alcanzar</span></article>
            <article><Trophy size={22} /><strong>{selectedProfile?.points ?? 0} puntos</strong><span>Tu puntuación</span></article>
          </div>
        </div>
      )}

      {!activeGame && activeTab === 'games' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">ZONA DE DESAFÍOS</span>
              <h2>Juegos bíblicos</h2>
              <p>Escoge un desafío y prepárate para jugar.</p>
            </div>
            <Gamepad2 size={28} />
          </div>

          <div className="games-grid">
            {games.map((game) => {
              const Icon = game.icon;
              return (
                <article className={`game-card ${game.color}`} key={game.id}>
                  <div className="game-card-top">
                    <span className="game-icon"><Icon size={25} /></span>
                    <span className="game-status">
                      {game.available ? <CheckCircle2 size={13} /> : <LockKeyhole size={12} />}
                      {game.available ? 'Disponible' : 'En preparación'}
                    </span>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <button
                    className="game-card-footer"
                    disabled={!game.available || !selectedProfile}
                    onClick={startTrivia}
                  >
                    {!selectedProfile ? 'Selecciona un perfil primero' : game.available ? 'Jugar ahora' : 'Próximamente'}
                    <ChevronRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
          {!selectedProfile && (
            <div className="profile-notice">
              <UserRound size={19} />
              <span>Primero selecciona tu perfil en la pestaña Perfiles para comenzar a jugar.</span>
              <button onClick={() => setActiveTab('profiles')}>Elegir perfil</button>
            </div>
          )}
        </div>
      )}

      {!activeGame && activeTab === 'profiles' && (
        <div className="ranking-content">
          <div className="ranking-section-heading">
            <div>
              <span className="ranking-kicker">IDENTIDAD JUVENIL</span>
              <h2>Selecciona tu perfil</h2>
              <p>Escoge tu perfil para participar en los desafíos.</p>
            </div>
            <UserRound size={28} />
          </div>

          <div className="profile-notice">
            <LockKeyhole size={19} />
            <span>La selección es de prueba. El acceso seguro con PIN se conectará más adelante.</span>
          </div>

          <div className="profiles-grid">
            {profiles.map((profile) => (
              <button
                className={`profile-card ${selectedProfile?.id === profile.id ? 'selected' : ''}`}
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
              >
                <span className="profile-avatar">
                  {profile.pic ? <img src={profile.pic} alt="" /> : <UserRound size={29} />}
                </span>
                <strong>{profile.name}</strong>
                <small>@{profile.nick}</small>
                <span className="profile-select">
                  {selectedProfile?.id === profile.id ? 'Perfil seleccionado' : 'Seleccionar'}
                  <ChevronRight size={15} />
                </span>
                <small>{profile.points} puntos</small>
              </button>
            ))}
          </div>

          {selectedProfile && (
            <div className="pin-panel">
              <h3>¡Hola, {selectedProfile.name}!</h3>
              <p>Tu perfil está seleccionado. Ya puedes participar en los juegos disponibles.</p>
              <button onClick={() => setActiveTab('games')}>
                Ir a los juegos <Gamepad2 size={17} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ranking-footer-note">
        <LockKeyhole size={15} />
        Entorno de pruebas · Puntuaciones temporales, no guardadas en Firebase.
      </div>
    </section>
  );
}
