import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={content}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-content-muted hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus rounded-token-sm cursor-pointer"
      >
        {children || <HelpCircle className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-52 p-2 rounded-token-sm bg-surface-header text-content-inverse text-xs shadow-token-elevated border border-edge-strong pointer-events-none"
        >
          {content}
        </span>
      )}
    </span>
  );
};
