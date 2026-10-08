import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { qualityLabel, MeasurementQuality } from '../types';

interface SafeValueProps {
  value: any;
  unit?: string;
  quality?: string;
  className?: string;
  type?: 'text' | 'boolean' | 'number';
  boolTrueText?: string;
  boolFalseText?: string;
}

export const SafeValue: React.FC<SafeValueProps> = ({
  value,
  unit = '',
  quality,
  className = '',
  type = 'number',
  boolTrueText = 'ON',
  boolFalseText = 'OFF',
}) => {
  const { isOnline, lastUpdateTs } = useApp();
  const [ageMs, setAgeMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgeMs(Date.now() - lastUpdateTs);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTs]);

  const isStale = ageMs > 10000 || !isOnline;

  // Se perdeu comunicação ou passou de 10s sem atualização
  if (isStale) {
    return <span className={`label text-tc-text-muted bg-tc-surface-2 px-2 py-0.5 rounded ${className}`}>SEM DADOS</span>;
  }

  // Se a qualidade explícita da variável for ruim
  if (quality && quality !== 'OK') {
    const lbl = qualityLabel(quality as MeasurementQuality);
    return <span className={`label text-tc-text-muted bg-tc-surface-2 px-2 py-0.5 rounded ${className}`}>{lbl}</span>;
  }

  // Render normal
  if (type === 'boolean') {
    return <span className={className}>{value ? boolTrueText : boolFalseText}</span>;
  }

  if (type === 'number') {
    return (
      <span className={className}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span className="text-sm ml-1 opacity-70">{unit}</span>}
      </span>
    );
  }

  return <span className={className}>{value}{unit}</span>;
};
