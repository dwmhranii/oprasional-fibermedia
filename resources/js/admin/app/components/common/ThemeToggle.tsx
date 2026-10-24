import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Geser Mode Terang / Gelap"
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-inner ${
        isDark
          ? 'bg-slate-900 border border-slate-700/80 ring-1 ring-indigo-500/30'
          : 'bg-amber-100 border border-amber-300/80 ring-1 ring-amber-400/30'
      } ${className}`}
      title={isDark ? 'Beralih ke Mode Terang (Siang)' : 'Beralih ke Mode Gelap (Malam)'}
    >
      {/* Sun icon on Left */}
      <span
        className={`absolute left-1.5 flex items-center justify-center transition-all duration-300 ${
          isDark ? 'opacity-30 scale-75 text-slate-500' : 'opacity-100 scale-100 text-amber-500'
        }`}
      >
        <Sun className="w-3.5 h-3.5 fill-amber-400/30 stroke-[2.2]" />
      </span>

      {/* Moon icon on Right */}
      <span
        className={`absolute right-1.5 flex items-center justify-center transition-all duration-300 ${
          isDark ? 'opacity-100 scale-100 text-indigo-300' : 'opacity-30 scale-75 text-amber-300'
        }`}
      >
        <Moon className="w-3.5 h-3.5 fill-indigo-400/40 stroke-[2.2]" />
      </span>

      {/* Sliding Knob (Geser Terang / Gelap) */}
      <span
        className={`pointer-events-none flex items-center justify-center h-6 w-6 rounded-full shadow-md transform transition-transform duration-300 ease-out ${
          isDark
            ? 'translate-x-7 bg-indigo-600 text-white shadow-indigo-900/50'
            : 'translate-x-0 bg-white text-amber-500 border border-amber-200/80 shadow-slate-300/60'
        }`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 fill-current" />
        ) : (
          <Sun className="w-3 h-3 fill-current" />
        )}
      </span>
    </button>
  );
};
