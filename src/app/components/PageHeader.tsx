import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="shared-page-header">
      <div className="shared-page-header-copy">
        {eyebrow && <span className="shared-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {action && (
        <div className="shared-page-header-action">
          {action}
        </div>
      )}
    </header>
  );
}
