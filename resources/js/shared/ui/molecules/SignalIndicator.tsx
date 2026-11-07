import React from 'react';

export interface SignalIndicatorProps {
  dbm: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  dbm,
  showText = true,
  size = 'md',
  className = '',
}) => {
  // FTTH optical power quality classification
  // -15 dBm to -23.9 dBm: Optimal (4 bars, green)
  // -24 dBm to -26.9 dBm: Acceptable / Warning (2-3 bars, amber)
  // < -27 dBm: Critical (1 bar, red)
  let level = 4;
  let colorClass = 'bg-emerald-500';
  let textColorClass = 'text-emerald-700 dark:text-emerald-400';
  let qualityText = 'Optimal';

  if (dbm > -12) {
    // Optical overload
    level = 1;
    colorClass = 'bg-rose-500';
    textColorClass = 'text-rose-700 dark:text-rose-400';
    qualityText = 'Overload';
  } else if (dbm >= -23.5) {
    level = 4;
    colorClass = 'bg-emerald-500';
    textColorClass = 'text-emerald-700 dark:text-emerald-400';
    qualityText = 'Sangat Baik';
  } else if (dbm >= -26.5) {
    level = 2;
    colorClass = 'bg-amber-500';
    textColorClass = 'text-amber-700 dark:text-amber-400';
    qualityText = 'Waspada';
  } else {
    level = 1;
    colorClass = 'bg-rose-500';
    textColorClass = 'text-rose-700 dark:text-rose-400';
    qualityText = 'Kritis / Redam';
  }

  const barHeights = ['h-1.5', 'h-2.5', 'h-3.5', 'h-4.5'];
  const barWidth = size === 'sm' ? 'w-1' : 'w-1.5';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-end gap-0.5 h-5 px-1 py-0.5" title={`Kekuatan Redaman: ${dbm.toFixed(2)} dBm (${qualityText})`}>
        {[1, 2, 3, 4].map((barIndex) => (
          <div
            key={barIndex}
            className={`${barWidth} ${barHeights[barIndex - 1]} rounded-xs transition-colors duration-200 ${
              barIndex <= level ? colorClass : 'bg-muted'
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className={`font-mono text-xs font-semibold ${textColorClass}`}>
          {dbm.toFixed(2)} dBm
        </span>
      )}
    </div>
  );
};

