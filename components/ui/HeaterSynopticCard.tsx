import React, { CSSProperties } from 'react';
import { HeaterState, BURNER_PHASE_LABEL } from '../../types';
import { ValueDisplay } from './ValueDisplay';
import { StatusBadge } from './StatusBadge';

interface HeaterSynopticCardProps {
  id: 'AQ01' | 'AQ02';
  title: string;
  heater: HeaterState | undefined;
  isOnline: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export const HeaterSynopticCard: React.FC<HeaterSynopticCardProps> = ({
  id,
  title,
  heater,
  isOnline,
  onClick,
  style,
  className = '',
}) => {
  const isLockout = isOnline && heater?.burner.phase === 'LOCKOUT';
  const isRunning = isOnline && heater?.burner.phase === 'RUNNING';

  const renderBadge = () => {
    if (!isOnline) {
      return <StatusBadge state="NO_DATA" />;
    }
    if (isLockout) {
      return <StatusBadge state="LOCKOUT" text="BLOQUEIO" />;
    }
    if (isRunning) {
      return (
        <span className="h-6 flex items-center gap-1.5 px-2 rounded bg-tc-equip-on text-tc-bg label font-bold">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#FF8A3D"
            stroke="#C2410C"
            strokeWidth="1.5"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          QUEIMANDO
        </span>
      );
    }
    const phase = heater?.burner.phase || 'OFF';
    if (phase === 'PURGE') return <StatusBadge state="PURGE" />;
    if (phase === 'WAIT_PUMP') return <StatusBadge state="WAIT_PUMP" />;
    if (phase === 'POST_PURGE') return <StatusBadge state="POST_PURGE" />;
    return <StatusBadge state="OFF" text={BURNER_PHASE_LABEL[phase]?.toUpperCase() || 'PARADO'} />;
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${!isOnline ? 'sem dados' : heater?.burner.phase || 'desligado'}. Abrir detalhe`}
      style={style}
      className={`box-border p-3.5 rounded-lg cursor-pointer bg-tc-surface border transition-colors hover:border-tc-action/50 flex flex-col justify-between select-none ${
        isLockout ? 'border-2 border-tc-alarm-crit' : 'border-tc-border'
      } ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="label text-tc-text-muted">{id}</span>
          <span className="title-card text-tc-text">{title}</span>
        </div>
        {renderBadge()}
      </div>

      {/* Linha divisória sutil */}
      <div className="w-full h-px bg-tc-border my-2" />

      {/* 3 Valores de processo internos ao card (PADRAO_VISUAL e modelo) */}
      <div className="grid grid-cols-3 gap-2">
        <ValueDisplay
          label="TEMPERATURA"
          value={heater?.temp.value}
          quality={isOnline ? heater?.temp.quality : 'COMM_LOST'}
          decimals={1}
          unit="°C"
        />
        <ValueDisplay
          label="PRESSÃO"
          value={heater?.press.value}
          quality={isOnline ? heater?.press.quality : 'COMM_LOST'}
          decimals={2}
          unit="bar"
        />
        <ValueDisplay
          label="MODULAÇÃO"
          value={heater?.novus.mv}
          quality={isOnline && heater?.novus.commOk ? heater?.novus.quality : 'COMM_LOST'}
          decimals={0}
          unit="%"
        />
      </div>
    </div>
  );
};
