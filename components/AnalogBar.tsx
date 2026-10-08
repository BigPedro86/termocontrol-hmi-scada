import React from 'react';
import { SafeValue } from './SafeValue';

interface AnalogBarProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  sp?: number;
  quality?: string;
  limits?: { ll?: number; l?: number; h?: number; hh?: number };
}

const AnalogBar: React.FC<AnalogBarProps> = ({ label, value, unit, min, max, sp, quality, limits }) => {
  const isStale = quality !== 'OK';
  const displayValue = isStale ? 0 : value;
  const range = max - min;
  
  const getPercent = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));

  let barColor = 'bg-tc-text-muted';
  if (!isStale && limits) {
    if ((limits.hh && displayValue >= limits.hh) || (limits.ll && displayValue <= limits.ll)) barColor = 'bg-tc-alarm-crit';
    else if ((limits.h && displayValue >= limits.h) || (limits.l && displayValue <= limits.l)) barColor = 'bg-tc-alarm-warn';
    else barColor = 'bg-tc-action';
  } else if (!isStale) {
    barColor = 'bg-tc-action';
  }

  const renderLimit = (v: number | undefined, color: string, name: string) => {
    if (v === undefined) return null;
    const p = getPercent(v);
    return (
      <div 
        className="absolute top-0 bottom-0 w-0.5 z-10"
        style={{ left: `${p}%`, backgroundColor: color }}
        title={`${name}: ${v}`}
      >
        <span className="absolute -top-4 -translate-x-1/2 text-[8px] font-bold" style={{ color }}>{name}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 py-2 w-full">
      <div className="flex justify-between items-end">
        <span className="label text-tc-text-muted">{label}</span>
        <div className="text-right">
          <SafeValue className="text-lg font-bold text-tc-text" value={value} unit={unit} quality={quality} type="number" />
        </div>
      </div>
      
      <div className="relative h-6 bg-tc-surface-2 rounded overflow-hidden border border-tc-border">
        {/* PV Bar */}
        <div className={`h-full transition-all duration-500 ${isStale ? 'bg-tc-text-muted opacity-50' : barColor}`} style={{ width: `${getPercent(displayValue)}%` }}></div>
        
        {/* SP Marker */}
        {sp !== undefined && !isStale && (
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white border-x border-black/20 shadow z-20 flex flex-col items-center"
            style={{ left: `${getPercent(sp)}%` }}
            title={`Setpoint: ${sp}`}
          >
             <span className="absolute -bottom-5 text-[9px] font-bold text-tc-text-muted">SP</span>
          </div>
        )}

        {/* Limits */}
        {limits && (
          <>
            {renderLimit(limits.ll, '#F0616A', 'LL')}
            {renderLimit(limits.l, '#F39C12', 'L')}
            {renderLimit(limits.h, '#F39C12', 'H')}
            {renderLimit(limits.hh, '#F0616A', 'HH')}
          </>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-tc-text-muted font-bold font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default AnalogBar;
