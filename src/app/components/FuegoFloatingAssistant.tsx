import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Flame, Sparkles, X} from 'lucide-react';
import FuegoAssistant from './FuegoAssistant';
import type {AssistantAudience} from '../../services/fuegoAI';
import styles from '../styles/FuegoFloatingAssistant.module.css';

type PendingItem = {title: string; reference?: string};

type Props = {
  audience: AssistantAudience;
  displayName?: string;
  context?: string;
  pendingItems?: PendingItem[];
  quickPrompts?: string[];
};

export default function FuegoFloatingAssistant({
  audience,
  displayName,
  context = '',
  pendingItems = [],
  quickPrompts,
}: Props) {
  const [open, setOpen] = useState(false);

  const prompts = quickPrompts ?? (audience === 'youth'
    ? [
        'Explícame un versículo de la Biblia.',
        'Ayúdame con mi devocional de hoy.',
        'Dame una idea para crecer en mi fe.',
      ]
    : [
        'Prepara un cronograma para una actividad juvenil.',
        'Redacta una invitación para el servicio.',
        'Organiza una lista de tareas para una vigilia.',
      ]);

  return createPortal(
    <div className={styles.dock}>
      {open && (
        <section className={styles.window} role="dialog" aria-label="Chat flotante Fuego AI" aria-modal="false">
          <FuegoAssistant
            audience={audience}
            displayName={displayName}
            context={context}
            pendingItems={pendingItems}
            quickPrompts={prompts}
            compact
            onClose={() => setOpen(false)}
          />
        </section>
      )}
      <button
        type="button"
        className={styles.launcher}
        aria-label={open ? 'Minimizar Fuego AI' : 'Abrir Fuego AI'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.launcherAura} aria-hidden="true"/>
        <span className={styles.launcherIcon}>{open ? <X size={23}/> : <Flame size={25}/>}</span>
        <span className={styles.launcherText}>{open ? 'Cerrar' : 'Fuego AI'}</span>
        {!open && <Sparkles className={styles.launcherSparkle} size={14} aria-hidden="true"/>}
      </button>
    </div>,
    document.body,
  );
}
