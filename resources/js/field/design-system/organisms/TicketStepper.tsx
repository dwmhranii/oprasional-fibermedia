import React from 'react';
import { CheckCircle2, Lock as LockIcon } from 'lucide-react';

export interface StepItem {
  id: string;
  label: string;
  completed: boolean;
  locked: boolean;
}

export interface TicketStepperProps {
  activeStepId: string;
  steps: StepItem[];
  onSelectStep: (id: string) => void;
}

export const TicketStepper: React.FC<TicketStepperProps> = ({
  activeStepId,
  steps,
  onSelectStep,
}) => {
  return (
    <nav aria-label="Tahapan Pengerjaan Tiket" className="grid grid-cols-4 gap-1 p-1.5 rounded-token-lg bg-surface-muted border border-edge-subtle">
      {steps.map((step) => {
        const isActive = activeStepId === step.id;
        return (
          <button
            key={step.id}
            type="button"
            disabled={step.locked}
            aria-current={isActive ? 'step' : undefined}
            aria-disabled={step.locked}
            onClick={() => onSelectStep(step.id)}
            className={`min-h-touch px-1.5 py-2 rounded-token-md text-xs font-bold transition flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus ${
              step.locked
                ? 'opacity-45 cursor-not-allowed text-content-muted'
                : isActive
                ? 'bg-brand-primary text-brand-on-primary shadow-token-card cursor-pointer'
                : step.completed
                ? 'bg-status-safe-bg text-status-safe-fg border border-status-safe-border cursor-pointer'
                : 'text-content-secondary hover:bg-surface-card cursor-pointer'
            }`}
          >
            {step.locked ? (
              <LockIcon className="w-3 h-3 shrink-0" />
            ) : step.completed ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" />
            ) : null}
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
