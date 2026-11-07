import React from 'react';

export interface DividerProps {
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({ label }) => {
  if (!label) {
    return <hr role="separator" className="border-t border-edge-subtle my-3" />;
  }

  return (
    <div role="separator" className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 bg-edge-subtle" />
      <span className="text-xs font-semibold text-content-muted whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-edge-subtle" />
    </div>
  );
};
