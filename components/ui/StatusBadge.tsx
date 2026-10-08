import React, { ReactNode } from 'react';

type BadgeState = 'ON' | 'OFF' | 'RUNNING' | 'PURGE' | 'WAIT_PUMP' | 'POST_PURGE' | 'LOCKOUT' | 'FAULT' | 'NO_DATA';

interface StatusBadgeProps {
  state: BadgeState;
  text?: string;
  icon?: ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, text, icon }) => {
  let bg = 'bg-tc-surface-2';
  let textCol = 'text-tc-text';
  let border = '';
  let defaultText: string = state;

  switch (state) {
    case 'RUNNING':
      bg = 'bg-tc-equip-on';
      textCol = 'text-tc-bg';
      defaultText = 'QUEIMANDO';
      break;
    case 'ON':
      bg = 'bg-tc-equip-on';
      textCol = 'text-tc-bg';
      defaultText = 'LIGADO';
      break;
    case 'OFF':
      bg = 'bg-tc-equip-off';
      textCol = 'text-tc-equip-on';
      defaultText = 'PARADO';
      break;
    case 'LOCKOUT':
      bg = 'bg-tc-alarm-crit-fill';
      textCol = 'text-white';
      defaultText = 'BLOQUEIO — REARME LOCAL';
      break;
    case 'FAULT':
      bg = 'bg-tc-alarm-crit-fill';
      textCol = 'text-white';
      defaultText = 'FALHA';
      break;
    case 'NO_DATA':
      bg = 'pattern-no-data';
      textCol = 'text-tc-text-muted';
      border = 'border border-tc-border';
      defaultText = 'SEM DADOS';
      break;
    case 'PURGE':
      bg = 'bg-[#C9CED6]'; // From model HTML
      textCol = 'text-[#16191D]';
      defaultText = 'PURGA';
      break;
    case 'WAIT_PUMP':
      bg = 'bg-[#C9CED6]';
      textCol = 'text-[#16191D]';
      defaultText = 'AGUARDANDO BOMBA';
      break;
    case 'POST_PURGE':
      bg = 'bg-[#C9CED6]';
      textCol = 'text-[#16191D]';
      defaultText = 'PÓS-PURGA';
      break;
  }

  return (
    <span className={`h-6 flex items-center gap-1 px-2 rounded box-border label ${bg} ${textCol} ${border}`}>
      {icon && <span className="flex items-center">{icon}</span>}
      {text || defaultText}
    </span>
  );
};
