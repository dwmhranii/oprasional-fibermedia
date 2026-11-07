import React from 'react';
import { Check, Clock, ArrowRightCircle, Wrench, CheckCircle2 } from 'lucide-react';

export type TicketStepKey = 'assigned' | 'on_the_way' | 'in_progress' | 'completed';

export interface StepItem {
  key: TicketStepKey;
  label: string;
  time?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface TicketStepperProps {
  currentStep: TicketStepKey;
  timestamps?: Partial<Record<TicketStepKey, string>>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const TicketStepper: React.FC<TicketStepperProps> = ({
  currentStep,
  timestamps = {},
  orientation = 'horizontal',
  className = '',
}) => {
  const stepsDef: { key: TicketStepKey; label: string; icon: React.ReactNode }[] = [
    { key: 'assigned', label: 'Diterima', icon: <Clock className="w-4 h-4" /> },
    { key: 'on_the_way', label: 'Dalam perjalanan', icon: <ArrowRightCircle className="w-4 h-4" /> },
    { key: 'in_progress', label: 'Dikerjakan', icon: <Wrench className="w-4 h-4" /> },
    { key: 'completed', label: 'Selesai', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const stepOrder: TicketStepKey[] = ['assigned', 'on_the_way', 'in_progress', 'completed'];
  const currentIndex = stepOrder.indexOf(currentStep);

  const steps: StepItem[] = stepsDef.map((def, idx) => ({
    key: def.key,
    label: def.label,
    time: timestamps[def.key],
    isCompleted: idx < currentIndex || currentStep === 'completed',
    isCurrent: idx === currentIndex && currentStep !== 'completed',
  }));

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 py-2 ${className}`}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-10 -ml-[1px] transition-colors ${
                    step.isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 font-mono text-xs font-bold transition-all ${
                  step.isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : step.isCurrent
                    ? 'bg-card text-primary border-2 border-primary shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {step.isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      step.isCurrent
                        ? 'text-primary'
                        : step.isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="font-mono text-xs text-muted-foreground">{step.time}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full py-3 ${className}`}>
      <div className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center text-center gap-1.5 shrink-0">
                <div
                  className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    step.isCompleted
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : step.isCurrent
                      ? 'bg-card text-primary border-2 border-primary shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {step.isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium max-w-[80px] sm:max-w-none ${
                    step.isCurrent
                      ? 'text-primary font-semibold'
                      : step.isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
                {step.time && (
                  <span className="font-mono text-[10px] text-muted-foreground">{step.time}</span>
                )}
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                    step.isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

