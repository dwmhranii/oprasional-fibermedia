import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'surface' | 'ghost' | 'primary';
  badgeCount?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'surface',
  badgeCount,
  className = '',
  ...rest
}) => {
  const variantClasses = {
    surface: 'bg-surface-elevated text-content-primary border border-edge-subtle hover:bg-surface-muted',
    ghost: 'bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content-primary',
    primary: 'bg-brand-primary text-brand-on-primary border border-edge-focus',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative inline-flex items-center justify-center min-h-touch min-w-touch rounded-token-md transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus disabled:opacity-50 cursor-pointer shrink-0 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-token-sm bg-status-warning-bg text-status-warning-fg border border-status-warning-border text-xs font-mono font-bold">
          {badgeCount}
        </span>
      )}
    </button>
  );
};
