import React, { useEffect } from 'react';
import { MESSAGES, ACTIONS } from '../i18n/id';
import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmLeaveProps {
  when: boolean;
  onConfirmNavigation?: () => void;
  message?: string;
}

export const ConfirmLeave: React.FC<ConfirmLeaveProps> = ({
  when,
  message = MESSAGES.confirmLeaveDesc,
}) => {
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);

  return null;
};

export default ConfirmLeave;
