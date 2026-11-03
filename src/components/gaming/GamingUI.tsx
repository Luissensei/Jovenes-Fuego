import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  Sparkles,
  X,
} from 'lucide-react';

type ButtonVariant = 'primary' | 'glass' | 'outline' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface GamingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function GamingButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: GamingButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={['jf-button', `jf-button--${variant}`, `jf-button--${size}`, fullWidth ? 'jf-button--full' : '', className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className="jf-button__glow" aria-hidden="true" />
      <span className="jf-button__content">
        {loading ? <LoaderCircle className="jf-spin" size={18} aria-hidden="true" /> : leadingIcon}
        <span>{children}</span>
        {!loading && trailingIcon}
      </span>
    </button>
  );
}

export function GlassCard({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={['jf-glass-card', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function NeonBadge({
  children,
  tone = 'violet',
}: {
  children: ReactNode;
  tone?: 'violet' | 'fire' | 'cyan' | 'success' | 'muted';
}) {
  return <span className={`jf-neon-badge jf-neon-badge--${tone}`}>{children}</span>;
}

export function PlayerAvatar({
  name,
  src,
  size = 'md',
  frame = 'fire',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  frame?: 'fire' | 'violet' | 'cyan' | 'plain';
}) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'JF';

  useEffect(() => setFailed(false), [src]);

  return (
    <span className={`jf-player-avatar jf-player-avatar--${size} jf-player-avatar--${frame}`}>
      {src && !failed ? (
        <img src={src} alt={`Avatar de ${name}`} onError={() => setFailed(true)} loading="lazy" />
      ) : (
        <span aria-label={`Iniciales de ${name}`} role="img">{initials}</span>
      )}
    </span>
  );
}

const rankTones: Record<string, string> = {
  bronce: 'bronze',
  plata: 'silver',
  oro: 'gold',
  platino: 'platinum',
  diamante: 'diamond',
  maestro: 'master',
  leyenda: 'legend',
};

export function RankBadge({ rank = 'Inicio' }: { rank?: string | null }) {
  const key = String(rank || 'Inicio').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return <span className={`jf-rank-badge jf-rank-badge--${rankTones[key] ?? 'default'}`}><Sparkles size={13} />{rank || 'Inicio'}</span>;
}

export function ExperienceBar({
  value,
  max,
  label = 'EXPERIENCIA',
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0;
  const percent = Math.round((safeValue / safeMax) * 100);
  return (
    <div className="jf-xp">
      <div className="jf-xp__meta"><span>{label}</span><strong>{safeValue.toLocaleString('es-CO')} / {safeMax.toLocaleString('es-CO')} XP</strong></div>
      <div className="jf-xp__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'violet',
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  tone?: 'violet' | 'fire' | 'cyan' | 'green';
}) {
  return (
    <GlassCard className={`jf-stat-card jf-stat-card--${tone}`}>
      {icon && <span className="jf-stat-card__icon">{icon}</span>}
      <span className="jf-stat-card__label">{label}</span>
      <strong className="jf-stat-card__value">{value}</strong>
      {detail && <span className="jf-stat-card__detail">{detail}</span>}
    </GlassCard>
  );
}

export function GamingModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="jf-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="jf-modal" role="dialog" aria-modal="true" aria-labelledby="jf-modal-title">
        <header className="jf-modal__header">
          <div><span className="jf-eyebrow">JÓVENES DE FUEGO</span><h2 id="jf-modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <button className="jf-icon-button" type="button" onClick={onClose} aria-label="Cerrar ventana"><X size={19} /></button>
        </header>
        <div className="jf-modal__body">{children}</div>
      </section>
    </div>
  );
}

export function LoadingScreen({ label = 'Preparando la experiencia…' }: { label?: string }) {
  return <div className="jf-loading-screen" role="status"><span className="jf-loading-mark"><Sparkles size={27} /></span><span className="jf-loading-orbit" /><strong>{label}</strong></div>;
}

type ToastTone = 'success' | 'error' | 'info';
type ToastInput = { title: string; message?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-3), { ...toast, id }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4400));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="jf-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((item) => {
          const Icon = item.tone === 'error' ? CircleAlert : item.tone === 'success' ? Check : Info;
          return (
            <div className={`jf-toast jf-toast--${item.tone ?? 'info'}`} key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={19} /><div><strong>{item.title}</strong>{item.message && <p>{item.message}</p>}</div>
              <button type="button" className="jf-toast__close" onClick={() => dismiss(item.id)} aria-label="Cerrar notificación"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast debe utilizarse dentro de ToastProvider.');
  return notify;
}
