import React from 'react';
import { Alarm } from '../../types';
import { t } from '../../i18n/pt';

import { useApp } from '../../context/AppContext';

interface AlarmStripProps {
  alarms: Alarm[];
  onSilence?: () => void;
  onAck?: (id: string) => void;
  canAck?: boolean;
}

export const AlarmStrip: React.FC<AlarmStripProps> = ({ alarms, onSilence, onAck, canAck = false }) => {
  const { isOnline, lastUpdateTs } = useApp();
  
  const secondsAgo = lastUpdateTs ? Math.floor((Date.now() - lastUpdateTs) / 1000) : null;
  const isStale = secondsAgo !== null && secondsAgo > 5;
  const isOffline = !isOnline || isStale;

  if (isOffline) {
    return (
      <div role="status" className="h-10 flex-shrink-0 px-6 box-border flex items-center gap-4 bg-tc-surface-2 border-b border-tc-border text-tc-text-muted pattern-no-data">
        <span className="font-semibold text-sm uppercase tracking-wide">Sem dados: estado dos alarmes desconhecido</span>
      </div>
    );
  }

  const activeAlarms = alarms.filter(a => !a.cleared);
  
  if (activeAlarms.length === 0) {
    return (
      <div role="status" className="h-10 flex-shrink-0 px-6 box-border flex items-center gap-4 bg-tc-surface-2 border-b border-tc-border text-tc-text-muted">
        <span className="font-semibold text-sm uppercase tracking-wide">Sem alarmes ativos</span>
      </div>
    );
  }

  const crit = activeAlarms.some(a => a.severity === 'Danger');
  const unacked = activeAlarms.filter(a => !a.acked).length;
  
  // O alarme mais recente para mostrar na faixa
  const latest = [...activeAlarms].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  const bg = crit ? 'bg-tc-alarm-crit-fill text-white' : 'bg-tc-alarm-warn text-tc-bg';
  const labelBg = crit ? 'bg-[#7E1F1D] text-white' : 'bg-[#16191D] text-tc-alarm-warn';
  const badgeLabel = crit ? 'CRÍTICO' : 'AVISO';
  const buttonBorder = crit ? 'border-[#FFB4AE]' : 'border-[#16191D]';

  const timeStr = new Date(latest.timestamp).toLocaleTimeString('pt-BR');

  return (
    <div role="alert" className={`h-10 flex-shrink-0 px-6 box-border flex items-center gap-4 ${bg} overflow-hidden`}>
      <span className={`h-6 flex items-center px-2 rounded shrink-0 label ${labelBg}`}>
        {badgeLabel}
      </span>
      <span className="font-semibold tabular-nums shrink-0">{timeStr}</span>
      <span className="font-semibold truncate min-w-0" title={`${latest.equipment} — ${t(latest.type)}`}>
        {latest.equipment} — {t(latest.type)}
      </span>
      
      {activeAlarms.length > 1 && (
        <span className="opacity-80 shrink-0 whitespace-nowrap">
          {activeAlarms.length} ativos · {unacked} não reconhecido{unacked !== 1 ? 's' : ''}
        </span>
      )}
      
      {canAck && (
        <div className="ml-auto flex gap-2 shrink-0 pl-4">
          <button 
            type="button" 
            onClick={() => onAck && onAck(latest.id)}
            className={`h-8 px-3 rounded border ${buttonBorder} ${labelBg} label cursor-pointer active:opacity-80 shrink-0 whitespace-nowrap`}
          >
            RECONHECER
          </button>
        </div>
      )}
    </div>
  );
};
