import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, PauseCircle, CheckCircle, XCircle } from 'lucide-react';

interface SlaCountdownProps {
  dueAt?: string | null;
  isPaused?: boolean;
  isBreached?: boolean;
  isResolved?: boolean;
  isCancelled?: boolean;
  className?: string;
  showProgress?: boolean;
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({
  dueAt,
  isPaused = false,
  isBreached = false,
  isResolved = false,
  isCancelled = false,
  className = '',
  showProgress = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isOverdue: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isOverdue: false,
  });

  useEffect(() => {
    if (!dueAt || isResolved || isCancelled) return;

    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(dueAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        const overdueSec = Math.abs(Math.floor(diff / 1000));
        const hours = Math.floor(overdueSec / 3600);
        const minutes = Math.floor((overdueSec % 3600) / 60);
        const seconds = overdueSec % 60;
        setTimeLeft({
          hours,
          minutes,
          seconds,
          totalSeconds: -overdueSec,
          isOverdue: true,
        });
      } else {
        const remainingSec = Math.floor(diff / 1000);
        const hours = Math.floor(remainingSec / 3600);
        const minutes = Math.floor((remainingSec % 3600) / 60);
        const seconds = remainingSec % 60;
        setTimeLeft({
          hours,
          minutes,
          seconds,
          totalSeconds: remainingSec,
          isOverdue: false,
        });
      }
    };

    calculate();

    if (isPaused) {
      return; // Do not tick if paused
    }

    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [dueAt, isPaused, isResolved, isCancelled]);

  if (isCancelled) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>SLA Dibatalkan</span>
      </div>
    );
  }

  if (!dueAt) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>SLA belum ditentukan</span>
      </div>
    );
  }

  if (isResolved) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>SLA Terpenuhi</span>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}>
        <PauseCircle className="w-3.5 h-3.5" />
        <span>SLA Dijeda (Menunggu Pelanggan)</span>
      </div>
    );
  }

  const effectiveBreach = isBreached || timeLeft.isOverdue;

  // Format string
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeString = `${timeLeft.hours}j ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}d`;

  if (effectiveBreach) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>Breach! Terlewat +{timeString}</span>
      </div>
    );
  }

  const isWarning = timeLeft.totalSeconds < 7200; // less than 2 hours

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
        isWarning
          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      } ${className}`}
    >
      <Clock className={`w-3.5 h-3.5 ${isWarning ? 'text-amber-600 dark:text-amber-400 animate-spin' : 'text-blue-500 dark:text-blue-400'}`} />
      <span>
        {isWarning ? 'Segera Berakhir: ' : 'Sisa SLA: '}
        <strong>{timeString}</strong>
      </span>
    </div>
  );
};
