import {useState} from 'react';
import type {FormEvent} from 'react';
import {Bot, Send, Sparkles, UserRound, RotateCcw, LockKeyhole, BookOpen, LoaderCircle} from 'lucide-react';
import styles from '../styles/FuegoAssistant.module.css';
import {askFuegoAI, type AssistantAudience, type AssistantMessage} from '../../services/fuegoAI';
import {firebaseAiAvailable} from '../../services/firebase/client';

type PendingItem = {title: string; reference?: string};
type Props = {
  audience: AssistantAudience;
  displayName?: string;
  context?: string;
  pendingItems?: PendingItem[];
  quickPrompts?: string[];
};

export default function FuegoAssistant({
  audience,
  displayName = '',
  context = '',
  pendingItems = [],
  quickPrompts = [],
}: Props) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const youth = audience === 'youth';

  async function sendMessage(value: string) {
    const question = value.trim();
    if (!question || sending) return;
    const next = [...messages, {role: 'user' as const, content: question}];
    setMessages(next);
    setInput('');
    setError('');
    setSending(true);
    const fullContext = [
      context,
      youth ? `Nombre visible del perfil seleccionado: ${displayName || 'no indicado'}. La selección pública no valida identidad.` : '',
      youth ? `Devocionales del plan local pendientes: ${pendingItems.length}. ${pendingItems.map((item) => item.title + (item.reference ? ' (' + item.reference + ')' : '')).join('; ')}. Este progreso se guarda solo en el dispositivo y no es un registro oficial.` : '',
    ].filter(Boolean).join('\n');
    try {
      const answer = await askFuegoAI(audience, question, messages, fullContext);
      setMessages([...next, {role: 'assistant', content: answer}]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar Fuego AI.');
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section className={styles.scope} aria-label={youth ? 'Fuego AI para jóvenes' : 'Fuego AI para administración'}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.emblem}><Sparkles size={20}/></span>
          <div className={styles.heading}>
            <span>{youth ? 'ACOMPAÑAMIENTO ESPIRITUAL' : 'ASISTENTE DE GESTIÓN'}</span>
            <h2>Fuego AI</h2>
            <p>{youth ? 'Tu compañero para aprender, reflexionar y crecer en la Palabra.' : 'Ideas, planificación y apoyo para organizar la comunidad.'}</p>
          </div>
          <span className={styles.status}>{firebaseAiAvailable ? 'Disponible en Staging' : 'Pendiente de activar'}</span>
        </header>

        {youth && (
          <div className={styles.devotionalCard}>
            <div className={styles.devotionalIcon}><BookOpen size={19}/></div>
            <div>
              <strong>{pendingItems.length ? `Tienes ${pendingItems.length} devocional(es) pendiente(s)` : 'Tu plan devocional va al día'}</strong>
              <span>{pendingItems.length ? 'Puedes pedirle a Fuego AI que te acompañe con el siguiente.' : 'Puedes profundizar en un versículo o iniciar una nueva reflexión.'}</span>
            </div>
            <button type="button" onClick={() => void sendMessage(pendingItems.length ? 'Ayúdame a comenzar el siguiente devocional pendiente. Guíame paso a paso con una lectura, una explicación sencilla, preguntas y una oración.' : 'Propón un devocional breve para hoy con una referencia bíblica y preguntas para reflexionar.')}>Empezar</button>
          </div>
        )}

        <div className={styles.chat}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <span><Bot size={25}/></span>
              <strong>{youth ? `¡Hola${displayName ? ', ' + displayName : ''}! ¿Qué quieres aprender hoy?` : '¿Qué vamos a organizar hoy?'}</strong>
              <p>{youth ? 'Puedo ayudarte a entender un pasaje, preparar tu devocional o pensar cómo aplicar una enseñanza bíblica.' : 'Puedo ayudarte a redactar anuncios, preparar reuniones, crear cronogramas y estructurar informes.'}</p>
              {quickPrompts.length > 0 && <div className={styles.prompts}>{quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => void sendMessage(prompt)} disabled={sending}>{prompt}</button>)}</div>}
            </div>
          ) : (
            <div className={styles.messages} aria-live="polite" aria-relevant="additions">
              {messages.map((message, index) => (
                <article key={index} className={message.role === 'user' ? styles.userMessage : styles.aiMessage}>
                  <span className={styles.messageAvatar}>{message.role === 'user' ? <UserRound size={15}/> : <Sparkles size={15}/>}</span>
                  <div className={styles.messageContent}>{message.content}</div>
                </article>
              ))}
              {sending && <div className={styles.typing}><LoaderCircle size={16}/> Fuego AI está preparando una respuesta...</div>}
            </div>
          )}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {!firebaseAiAvailable && (
          <div className={styles.setupNotice}>
            <LockKeyhole size={16}/>
            <span>La interfaz está preparada, pero el servicio aún no está habilitado. Se requiere Firebase AI Logic y App Check configurados en el proyecto de Staging.</span>
          </div>
        )}

        <form className={styles.composer} onSubmit={submit}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} maxLength={3000} placeholder={youth ? 'Escribe un versículo o pregunta...' : 'Escribe qué necesitas organizar...'} aria-label="Mensaje para Fuego AI"/>
          <button type="submit" disabled={sending || input.trim().length < 2 || !firebaseAiAvailable} aria-label="Enviar mensaje">
            {sending ? <LoaderCircle size={17}/> : <Send size={17}/>}
          </button>
        </form>
        <footer className={styles.footer}>
          {youth
            ? 'No compartas contraseñas ni datos personales. Tu conversación no se guarda en Firebase.'
            : 'La IA propone y redacta; no modifica usuarios, permisos ni registros.'}
          {messages.length > 0 && <button type="button" onClick={() => {setMessages([]);setError('');}}><RotateCcw size={13}/> Nueva conversación</button>}
        </footer>
      </div>
    </section>
  );
}
