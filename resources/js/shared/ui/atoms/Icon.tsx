import React from 'react';
import { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  ariaLabel?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  icon: LucideComp,
  size = 'md',
  className = '',
  ariaLabel,
  strokeWidth = 1.75, // Uniform thin clean line style
}) => {
  const sizeMap: Record<IconSize, number> = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const pixelSize = sizeMap[size];

  return (
    <LucideComp
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    />
  );
};

