import React, { CSSProperties } from 'react';

interface PumpIndicatorProps {
  running: boolean;
  online?: boolean;
  direction?: 'right' | 'down';
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export const PumpIndicator: React.FC<PumpIndicatorProps> = ({
  running,
  online = true,
  direction = 'right',
  ariaLabel,
  className = '',
  style,
}) => {
  // Padrão Visual (seções 3 e 5): ícone de 20 px, estilo consistente entre todas as bombas
  const isRunning = online && running;
  
  const iconColor = !online
    ? '#6B7480' // text-dim
    : isRunning
    ? '#E7EAEE' // equip-on
    : '#4A515A'; // equip-off

  const borderColor = !online
    ? 'border-tc-border'
    : isRunning
    ? 'border-tc-equip-on'
    : 'border-tc-equip-off';

  return (
    <div
      style={style}
      aria-label={ariaLabel || (isRunning ? 'Bomba ligada' : 'Bomba desligada')}
      className={`w-9 h-9 box-border rounded-full border-2 ${borderColor} bg-tc-surface-2 flex items-center justify-center transition-colors ${className}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill={iconColor}
        aria-hidden="true"
        className="shrink-0"
      >
        {direction === 'down' ? (
          <path d="M5 6 L10 15 L15 6 Z" />
        ) : (
          <path d="M6 5 L15 10 L6 15 Z" />
        )}
      </svg>
    </div>
  );
};
