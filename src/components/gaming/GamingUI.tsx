import { useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle, Sparkles, X } from 'lucide-react';

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

export function AnimatedCard({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <GlassCard {...props} className={['jf-animated-card', className].filter(Boolean).join(' ')}>{children}</GlassCard>;
}

export function PlayerProfileCard({
  name,
  playerId,
  avatarUrl,
  level,
  xp,
  xpToNext,
  rank,
  points,
  badges,
}: {
  name: string;
  playerId?: string;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  xpToNext?: number;
  rank?: string;
  points?: number;
  badges?: ReactNode;
}) {
  return (
    <GlassCard className="jf-player-profile-card">
      <div className="jf-player-profile-card__top">
        <PlayerAvatar name={name} src={avatarUrl} size="xl" />
        <div className="jf-player-profile-card__identity">
          <span className="jf-eyebrow">PERFIL DE JUGADOR</span>
          <h3>{name}</h3>
          {playerId && <small>ID · {playerId}</small>}
          {rank && <RankBadge rank={rank} />}
        </div>
        {typeof level === 'number' && (
          <span className="jf-player-profile-card__level">NVL. {Math.max(1, level)}</span>
        )}
      </div>
      {points !== undefined && (
        <div className="jf-player-profile-card__points">
          <span>PUNTOS ACUMULADOS</span>
          <strong>{Math.max(0, points).toLocaleString('es-CO')}</strong>
        </div>
      )}
      {typeof xp === 'number' && typeof xpToNext === 'number' && xpToNext > 0 && (
        <ExperienceBar value={xp} max={xpToNext} />
      )}
      {badges && <div className="jf-player-profile-card__badges">{badges}</div>}
    </GlassCard>
  );
}

export function BackgroundEffects() {
  return (
    <div className="jf-background-effects" aria-hidden="true">
      <span className="jf-background-effects__orb jf-background-effects__orb--violet" />
      <span className="jf-background-effects__orb jf-background-effects__orb--fire" />
      <span className="jf-background-effects__orb jf-background-effects__orb--cyan" />
      <span className="jf-background-effects__grid" />
    </div>
  );
}

export function GamingNavbar({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <header {...props} className={['jf-navbar', className].filter(Boolean).join(' ')}>{children}</header>;
}

export function GamingSidebar({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <aside {...props} className={['jf-sidebar', className].filter(Boolean).join(' ')}>{children}</aside>;
}

