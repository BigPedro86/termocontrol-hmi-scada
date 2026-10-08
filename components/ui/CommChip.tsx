import React from 'react';

type CommState = 'OK' | 'FALHA' | 'SEM COMUNICAÇÃO' | 'SEM DADOS';

interface CommChipProps {
  label: string;
  state: CommState;
}

export const CommChip: React.FC<CommChipProps> = ({ label, state }) => {
  let colorClass = 'text-tc-text-muted';
  let dotColor = 'bg-tc-text-muted';

  if (state === 'OK') {
    colorClass = 'text-tc-text';
    dotColor = 'bg-tc-text-muted';
  } else if (state === 'FALHA') {
    colorClass = 'text-tc-alarm-warn';
    dotColor = 'bg-tc-alarm-warn';
  } else if (state === 'SEM COMUNICAÇÃO') {
    colorClass = 'text-tc-alarm-crit';
    dotColor = 'bg-tc-alarm-crit';
  } else if (state === 'SEM DADOS') {
    colorClass = 'text-tc-text-muted opacity-50';
    dotColor = 'bg-tc-surface-2';
  }

  return (
    <span 
      className={`h-7 flex items-center gap-1.5 px-2 rounded border border-tc-border label ${colorClass}`}
      title={state}
    >
      {label}
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
    </span>
  );
};
