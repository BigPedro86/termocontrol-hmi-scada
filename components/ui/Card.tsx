import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, className = '', compact = false }) => {
  return (
    <div className={`bg-tc-surface border border-tc-border rounded-lg flex flex-col ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-4">
          {title && <h2 className="title-card m-0">{title}</h2>}
          {icon && <span className="flex items-center">{icon}</span>}
        </div>
      )}
      {children}
    </div>
  );
};
