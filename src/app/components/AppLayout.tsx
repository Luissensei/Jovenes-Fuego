import type { ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
  className?: string;
};

export default function AppLayout({
  children,
  className = '',
}: AppLayoutProps) {
  return (
    <div className={`app-page ${className}`.trim()}>
      {children}
    </div>
  );
}
