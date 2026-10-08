import React from 'react';

interface TankIllustrationProps {
  level: number;
  pressure: number;
  pumpStatus: 'Off' | 'On' | 'Fault';
  lowSensor: boolean;
  highSensor: boolean;
}

const TankIllustration: React.FC<TankIllustrationProps> = ({ level, pressure, pumpStatus, lowSensor, highSensor }) => {
  const isPumpActive = pumpStatus === 'On';
  const pumpColor = pumpStatus === 'On' ? '#10b981' : pumpStatus === 'Fault' ? '#ef4444' : '#64748b';

  return (
    <div className="relative w-full h-80 flex items-center justify-center bg-tc-surface-2 rounded-lg overflow-hidden border border-tc-border shadow-inner">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <svg viewBox="0 0 500 250" className="w-full h-full max-w-xl drop-shadow-2xl">
        <defs>
          <linearGradient id="tankBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <clipPath id="tankClip">
            <rect x="80" y="60" width="340" height="130" rx="15" />
          </clipPath>
        </defs>

        <rect x="80" y="60" width="340" height="130" fill="url(#tankBody)" rx="15" />
        
        <g clipPath="url(#tankClip)">
          <rect 
            x="80" 
            y={190 - (level * 1.3)} 
            width="340" 
            height={level * 1.3} 
            fill="url(#waterGrad)" 
            opacity="0.8" 
            className="transition-all duration-1000"
          >
            {isPumpActive && (
              <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
            )}
          </rect>
          <path 
            d={`M 80 ${190 - (level * 1.3)} Q 165 ${185 - (level * 1.3)} 250 ${190 - (level * 1.3)} T 420 ${190 - (level * 1.3)}`} 
            stroke="white" 
            strokeWidth="2" 
            fill="none" 
            opacity="0.3"
          >
            <animate attributeName="d" 
              values={`M 80 ${190 - (level * 1.3)} Q 165 ${185 - (level * 1.3)} 250 ${190 - (level * 1.3)} T 420 ${190 - (level * 1.3)};
                       M 80 ${190 - (level * 1.3)} Q 165 ${195 - (level * 1.3)} 250 ${190 - (level * 1.3)} T 420 ${190 - (level * 1.3)};
                       M 80 ${190 - (level * 1.3)} Q 165 ${185 - (level * 1.3)} 250 ${190 - (level * 1.3)} T 420 ${190 - (level * 1.3)}`} 
              dur="3s" repeatCount="indefinite" 
            />
          </path>
        </g>

        <line x1="100" y1="60" x2="100" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,4" />
        <line x1="400" y1="60" x2="400" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,4" />

        <g transform="translate(425, 80)">
           <circle r="6" fill={highSensor ? '#ef4444' : '#334155'} stroke="#1e293b" strokeWidth="1" />
           <text x="12" y="4" fill="white" fontSize="8" fontWeight="bold">NÍVEL ALTO</text>
        </g>
        <g transform="translate(425, 160)">
           <circle r="6" fill={lowSensor ? '#f59e0b' : '#334155'} stroke="#1e293b" strokeWidth="1" />
           <text x="12" y="4" fill="white" fontSize="8" fontWeight="bold">NÍVEL BAIXO</text>
        </g>

        <path d="M 40 220 L 120 220 L 120 190" stroke="#475569" strokeWidth="6" fill="none" />
        <g transform="translate(60, 220)">
          <rect x="-15" y="-5" width="30" height="10" fill="#1e293b" rx="2" />
          <circle cx="0" cy="-15" r="18" fill={pumpColor} stroke="#1e293b" strokeWidth="2" />
          <g transform="translate(0, -15)">
             <path d="M -8 0 L 8 0 M 0 -8 L 0 8 M -6 -6 L 6 6 M -6 6 L 6 -6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8">
               {isPumpActive && (
                 <animateTransform
                   attributeName="transform"
                   type="rotate"
                   from="0 0 0"
                   to="360 0 0"
                   dur="0.6s"
                   repeatCount="indefinite"
                 />
               )}
             </path>
             <circle cx="0" cy="0" r="3" fill="white" />
          </g>
        </g>

        <g transform="translate(250, 45)">
           <path d="M -10 0 L 10 0 L 0 15 Z" fill="#1e293b" />
           <rect x="-30" y="-30" width="60" height="30" rx="5" fill="#1e293b" />
           <text textAnchor="middle" y="-10" fill="#10b981" fontSize="12" fontWeight="black" fontFamily="monospace">
             {pressure.toFixed(2)}
           </text>
           <text textAnchor="middle" y="5" fill="white" fontSize="6" fontWeight="bold">BAR</text>
        </g>
      </svg>

      <div className="absolute top-6 left-8 flex flex-col gap-1">
        <span className="label text-tc-text-muted">Monitoramento de Expansão</span>
        <div className="flex items-center gap-4 mt-1">
          <div className="bg-tc-surface px-3 py-1.5 rounded border border-tc-border backdrop-blur-sm">
            <span className="label text-tc-text-muted mr-2">NÍVEL:</span>
            <span className="text-sm font-bold text-tc-action">{level}%</span>
          </div>
          <div className="bg-tc-surface px-3 py-1.5 rounded border border-tc-border backdrop-blur-sm">
            <span className="label text-tc-text-muted mr-2">BOMBA:</span>
            <span className={`text-sm font-bold ${isPumpActive ? 'text-tc-equip-on' : 'text-tc-text-muted'}`}>{pumpStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TankIllustration;
