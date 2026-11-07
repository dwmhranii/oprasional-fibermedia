import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-[1px] h-full bg-border self-stretch shrink-0 ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={`relative flex items-center justify-center my-4 w-full ${className}`}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative px-3 bg-card text-xs uppercase tracking-wider text-muted-foreground font-medium select-none">
          {label}
        </div>
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={`border-0 border-t border-border my-4 w-full ${className}`}
    />
  );
};

