import React from 'react';
import { toast, Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { MESSAGES } from '../i18n/id';

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'rounded-xl border border-border bg-card text-foreground shadow-lg',
      }}
    />
  );
};

export const showToast = {
  success: (message: string = MESSAGES.successSave, description?: string) => {
    toast.success(message, {
      description,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    });
  },

  error: (message: string = MESSAGES.errorGeneric, description?: string) => {
    toast.error(message, {
      description,
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    });
  },
};

export default showToast;
