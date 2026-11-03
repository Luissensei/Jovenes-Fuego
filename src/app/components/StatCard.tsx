import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: 'orange' | 'purple' | 'blue' | 'green';
};

export default function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'orange',
}: StatCardProps) {
  return (
    <article className={`shared-stat-card tone-${tone}`}>
      <div className="shared-stat-top">
        <span>{label}</span>
        {icon && <div className="shared-stat-icon">{icon}</div>}
      </div>

      <strong className="shared-stat-value">{value}</strong>

      {detail && (
        <small className="shared-stat-detail">{detail}</small>
      )}
    </article>
  );
}
