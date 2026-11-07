import React from 'react';

export interface BrandLogoProps {
  variant?: 'admin' | 'field' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'admin',
  size = 'md',
  className = '',
}) => {
  const sizeConfig = {
    sm: { icon: 'w-6 h-6', text: 'text-base', badge: 'text-[9px] px-1.5 py-0.2' },
    md: { icon: 'w-8 h-8', text: 'text-lg', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-10 h-10', text: 'text-2xl', badge: 'text-xs px-2 py-0.5' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Original Optical Fiber Core & Light Pulse Node Symbol */}
      <div
        className={`relative ${sizeConfig.icon} rounded-xl bg-gradient-to-br from-cyan-900 to-slate-950 border border-cyan-400/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.35)] shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Fiber core strand curves */}
          <path
            d="M 6 26 C 14 26 14 6 26 6"
            stroke="#22d3ee"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 6 18 C 12 18 18 12 26 12"
            stroke="#0891b2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4,2"
          />
          {/* Light emission core pulse dot */}
          <circle cx="26" cy="6" r="3" fill="#67e8f9" />
          <circle cx="26" cy="6" r="5" stroke="#22d3ee" strokeWidth="1" opacity="0.6" />
          <circle cx="6" cy="26" r="2.5" fill="#0891b2" />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`font-sans font-extrabold tracking-tight text-foreground ${sizeConfig.text}`}
        >
          Fiber<span className="text-primary font-bold">media</span>
        </span>

        {variant !== 'plain' && (
          <span
            className={`font-mono font-bold uppercase rounded-md tracking-wider ${
              sizeConfig.badge
            } ${
              variant === 'field'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {variant === 'field' ? 'Field' : 'Ops'}
          </span>
        )}
      </div>
    </div>
  );
};

