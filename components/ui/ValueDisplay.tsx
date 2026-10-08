import React from 'react';
import { MeasurementQuality } from '../../types';

interface ValueDisplayProps {
  label?: string;
  value: number | string | null | undefined;
  unit?: string;
  quality?: MeasurementQuality;
  decimals?: number;
  small?: boolean;
}

export const ValueDisplay: React.FC<ValueDisplayProps> = ({ 
  label, 
  value, 
  unit, 
  quality = 'OK', 
  decimals,
  small = false 
}) => {
  const valueClass = small ? 'value-sm' : 'value';

  const renderValue = () => {
    if (quality === 'COMM_LOST' || (quality === 'OK' && (value === null || value === undefined))) {
      return (
        <span className="h-8 box-border flex items-center px-2 rounded border border-tc-border pattern-no-data text-tc-text-muted text-xs font-semibold tracking-wider">
          SEM DADOS
        </span>
      );
    }
    if (quality === 'FAULT') {
      return (
        <span className="h-8 self-start flex items-center px-2.5 rounded bg-tc-alarm-crit-fill text-white font-bold tracking-wider">
          FALHA
        </span>
      );
    }
    if (quality === 'NOT_MEASURED') {
      return (
        <span className="h-8 flex items-center text-base font-semibold text-tc-text-muted">
          N/M
        </span>
      );
    }

    // OK Quality
    let displayStr = value;
    if (typeof value === 'number') {
      displayStr = decimals !== undefined 
        ? value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : value.toLocaleString('pt-BR');
    }

    return (
      <span className="flex items-baseline gap-1">
        <span className={valueClass}>{displayStr}</span>
        {unit && <span className="text-tc-text-muted">{unit}</span>}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="label text-tc-text-muted">{label}</span>}
      {renderValue()}
    </div>
  );
};
