import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <section className="shared-empty-state" role="status">
      {icon && (
        <div className="shared-empty-icon">
          {icon}
        </div>
      )}

      <h3>{title}</h3>

      {description && <p>{description}</p>}

      {action && (
        <div className="shared-empty-action">
          {action}
        </div>
      )}
    </section>
  );
}
