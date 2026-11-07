import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="rounded-token-lg bg-surface-card border border-edge-subtle p-6 text-center space-y-2.5">
      <div className="w-11 h-11 rounded-token-md bg-surface-muted border border-edge-subtle flex items-center justify-center mx-auto text-brand-accent">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <div className="space-y-1 max-w-xs mx-auto">
        <h3 className="text-sm font-bold text-content-primary">{title}</h3>
        <p className="text-xs text-content-muted leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
