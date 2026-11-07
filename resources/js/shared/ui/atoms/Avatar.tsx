import React, { useState } from 'react';

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses: Record<'sm' | 'md' | 'lg', { container: string; text: string; dot: string }> = {
    sm: { container: 'w-7 h-7', text: 'text-xs', dot: 'w-2 h-2' },
    md: { container: 'w-9 h-9', text: 'text-sm', dot: 'w-2.5 h-2.5' },
    lg: { container: 'w-12 h-12', text: 'text-base font-semibold', dot: 'w-3 h-3' },
  };

  const statusColors: Record<'online' | 'offline' | 'busy' | 'away', string> = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-400',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
  };

  // Get initials (up to 2 characters)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className={`relative inline-flex shrink-0 ${sizeClasses[size].container} ${className}`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full border border-border"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-medium select-none ${sizeClasses[size].text}`}
        >
          {initials || '?'}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-card ${sizeClasses[size].dot} ${statusColors[status]}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

