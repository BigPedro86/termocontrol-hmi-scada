import React from 'react';
import { t } from '../../i18n/pt';

interface CommandButtonProps {
  label: string;
  variant: 'start' | 'stop';
  disabled?: boolean;
  blockReasonCode?: string;
  onClick: () => void;
}

export const CommandButton: React.FC<CommandButtonProps> = ({ label, variant, disabled, blockReasonCode, onClick }) => {
  const isStop = variant === 'stop';

  if (isStop) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <button 
          type="button" 
          onClick={onClick}
          className="h-12 rounded-lg border-0 bg-tc-stop text-white text-sm font-bold tracking-wider cursor-pointer active:opacity-80"
        >
          {label}
        </button>
      </div>
    );
  }

  // Start variant
  if (disabled) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <button 
          type="button" 
          disabled
          className="h-12 rounded-lg border border-tc-border bg-tc-surface-2 text-tc-text-dim text-sm font-bold tracking-wider cursor-not-allowed"
        >
          {label}
        </button>
        {blockReasonCode && (
          <span className="text-xs text-tc-text-muted">{t(blockReasonCode)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <button 
        type="button" 
        onClick={onClick}
        className="h-12 rounded-lg border-0 bg-tc-action-fill text-white text-sm font-bold tracking-wider cursor-pointer active:opacity-80"
      >
        {label}
      </button>
    </div>
  );
};
