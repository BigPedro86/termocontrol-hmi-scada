import React from 'react';
import { MeasurementQuality } from '../../types';

interface AnalogBarProps {
  value: number | null | undefined;
  min: number;
  max: number;
  ll?: number;
  l?: number;
  h?: number;
  hh?: number;
  sp?: number;
  quality?: MeasurementQuality;
  unit?: string;
  decimals?: number;
}

export const AnalogBar: React.FC<AnalogBarProps & { label?: string; spLabel?: string; }> = ({
  value, min, max, ll, l, h, hh, sp, quality = 'OK', unit, decimals = 0, label, spLabel
}) => {
  const range = max - min;
  const toPercent = (val: number) => Math.max(0, Math.min(100, ((val - min) / range) * 100));
  
  const valPercent = value !== null && value !== undefined ? toPercent(value) : 0;
  
  // Renders the background colored zones for alarms (LL, L, H, HH)
  const renderZones = () => {
    return (
      <>
        {ll !== undefined && (
          <div className="absolute left-0 top-0 h-6 bg-[rgba(240,97,106,0.45)]" style={{ width: `${toPercent(ll)}%` }} />
        )}
        {ll !== undefined && l !== undefined && (
          <div className="absolute top-0 h-6 bg-[rgba(245,165,36,0.45)]" style={{ left: `${toPercent(ll)}%`, width: `${toPercent(l) - toPercent(ll)}%` }} />
        )}
        {h !== undefined && hh !== undefined && (
          <div className="absolute top-0 h-6 bg-[rgba(245,165,36,0.45)]" style={{ left: `${toPercent(h)}%`, width: `${toPercent(hh) - toPercent(h)}%` }} />
        )}
        {hh !== undefined && (
          <div className="absolute top-0 h-6 bg-[rgba(240,97,106,0.45)]" style={{ left: `${toPercent(hh)}%`, right: 0 }} />
        )}
      </>
    );
  };

  const hasData = quality === 'OK' && value !== null && value !== undefined;
  
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  
  // Labels
  const renderLabels = () => {
    return (
      <div className="relative h-4 text-xs leading-4 text-tc-text-muted tabular-nums mt-1 mb-[2px]">
        {ll !== undefined && <span className="absolute" style={{ left: `${toPercent(ll)}%`, transform: 'translateX(-100%)', marginLeft: '-4px' }}>LL {fmt(ll)}</span>}
        {l !== undefined && <span className="absolute" style={{ left: `${toPercent(l)}%`, marginLeft: '4px' }}>L {fmt(l)}</span>}
        
        {h !== undefined && <span className="absolute" style={{ left: `${toPercent(h)}%`, transform: 'translateX(-100%)', marginLeft: '-4px' }}>H {fmt(h)}</span>}
        {hh !== undefined && <span className="absolute" style={{ left: `${toPercent(hh)}%`, marginLeft: '4px' }}>HH {fmt(hh)}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Header com os valores */}
      {(label || value !== undefined || spLabel) && (
        <div className="flex items-baseline mb-1">
          {label && <span className="label text-tc-text-muted">{label}</span>}
          {spLabel && <span className="ml-3 text-xs text-tc-text-muted tabular-nums">{spLabel}</span>}
          {hasData && value !== null && value !== undefined && (
            <span className="ml-auto flex items-baseline gap-1">
              <span className="value-sm">{fmt(value)}</span>
              {unit && <span className="text-tc-text-muted">{unit}</span>}
            </span>
          )}
        </div>
      )}

      {sp !== undefined && (
        <div className="relative h-[10px]">
          <span 
            className="absolute top-0 ml-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-tc-action"
            style={{ left: `${toPercent(sp)}%` }}
          />
        </div>
      )}
      {sp === undefined && <div className="h-[10px]" />}
      
      {renderLabels()}

      <div className="relative h-[24px] rounded bg-tc-surface-2 overflow-hidden flex items-center shrink-0">
        {quality === 'FAULT' ? (
          <div className="w-full h-full flex items-center justify-center bg-tc-alarm-crit-fill text-white label">FALHA</div>
        ) : !hasData ? (
          <div className="w-full h-full flex items-center justify-center pattern-no-data text-tc-text-muted label border border-tc-border box-border">SEM DADOS</div>
        ) : (
          <>
            {renderZones()}
            {/* Value Bar */}
            <div 
              className="absolute top-[8px] h-2 rounded-[2px] bg-[#C9CED6]"
              style={{ left: 0, width: `${valPercent}%` }} 
            />
          </>
        )}
      </div>
      
      <div className="relative h-4 text-xs leading-4 text-tc-text-muted tabular-nums mt-1">
        <span className="absolute left-0">{fmt(min)}</span>
        <span className="absolute right-0">{fmt(max)} {unit}</span>
      </div>
    </div>
  );
};
