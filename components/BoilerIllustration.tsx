import React from 'react';
import { BurnerPhase, BURNER_PHASE_LABEL } from '../types';

interface BoilerIllustrationProps {
  burnerPhase: BurnerPhase;
  modulation: number;
  pumpRunning: boolean;
}

const BoilerIllustration: React.FC<BoilerIllustrationProps> = ({ burnerPhase, modulation, pumpRunning }) => {
  const isActive = burnerPhase === 'RUNNING';
  const isPurging = burnerPhase === 'PURGE' || burnerPhase === 'POST_PURGE';
  const isLockout = burnerPhase === 'LOCKOUT';

  const flameScale = isActive ? 0.3 + (modulation / 100) * 0.9 : 0;
  
  const outerDur = `${(0.8 - (modulation / 100) * 0.6).toFixed(2)}s`;
  const innerDur = `${(0.5 - (modulation / 100) * 0.4).toFixed(2)}s`;

  const pumpColor = pumpRunning ? '#10b981' : '#64748b';
  
  return (
    <div className="relative w-full h-64 flex items-center justify-center bg-tc-surface-2 rounded-lg overflow-hidden border border-tc-border shadow-inner">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <svg viewBox="0 0 400 200" className="w-full h-full max-w-md drop-shadow-2xl">
        <defs>
          <linearGradient id="boilerBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect x="100" y="160" width="20" height="20" fill="#1e293b" rx="2" />
        <rect x="280" y="160" width="20" height="20" fill="#1e293b" rx="2" />

        <path d="M 320 120 L 350 120 L 350 160" stroke="#475569" strokeWidth="8" fill="none" />
        <line x1="320" y1="140" x2="340" y2="140" stroke="#475569" strokeWidth="8" />

        <rect x="80" y="60" width="240" height="110" fill="url(#boilerBody)" rx="10" />
        
        <line x1="100" y1="65" x2="100" y2="165" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,4" />
        <line x1="300" y1="65" x2="300" y2="165" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,4" />

        <path d="M 280 60 L 280 30 L 310 30 L 310 60" fill="#334155" />
        <rect x="275" y="25" width="40" height="8" fill="#1e293b" rx="2" />

        <g opacity="0.4">
          <line x1="110" y1="85" x2="290" y2="85" stroke="#1e293b" strokeWidth="3" />
          <line x1="110" y1="105" x2="290" y2="105" stroke="#1e293b" strokeWidth="3" />
          <line x1="110" y1="125" x2="290" y2="125" stroke="#1e293b" strokeWidth="3" />
          <line x1="110" y1="145" x2="290" y2="145" stroke="#1e293b" strokeWidth="3" />
        </g>

        <path d="M 40 95 L 85 85 L 85 145 L 40 135 Z" fill="#1e293b" />
        <circle cx="60" cy="115" r="15" fill="#334155" stroke="#475569" strokeWidth="2" />

        <g transform="translate(350, 165)">
          <rect x="-15" y="-5" width="30" height="10" fill="#1e293b" rx="2" />
          <circle cx="0" cy="-15" r="15" fill={pumpColor} stroke="#1e293b" strokeWidth="2" />
          <g transform="translate(0, -15)">
             <path d="M -8 0 L 8 0 M 0 -8 L 0 8 M -6 -6 L 6 6 M -6 6 L 6 -6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8">
               {pumpRunning && (
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
          {pumpRunning && (
            <circle cx="0" cy="-15" r="18" fill={pumpColor} opacity="0.1">
              <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {isActive && (
          <g transform={`translate(110, 115) scale(${flameScale})`}>
            <path d="M 0 0 C 30 -30 80 -10 120 0 C 80 10 30 30 0 0" fill="#fb923c" filter="url(#glow)">
              <animate attributeName="d" 
                values="M 0 0 C 30 -30 80 -10 120 0 C 80 10 30 30 0 0;
                        M 0 0 C 35 -35 85 -5 130 0 C 85 5 35 35 0 0;
                        M 0 0 C 30 -30 80 -10 120 0 C 80 10 30 30 0 0" 
                dur={outerDur} repeatCount="indefinite" />
            </path>
            <path d="M 0 0 C 20 -15 50 -5 80 0 C 50 5 20 15 0 0" fill="#fef08a">
               <animate attributeName="d" 
                values="M 0 0 C 20 -15 50 -5 80 0 C 50 5 20 15 0 0;
                        M 0 0 C 25 -20 55 -2 90 0 C 55 2 25 20 0 0;
                        M 0 0 C 20 -15 50 -5 80 0 C 50 5 20 15 0 0" 
                dur={innerDur} repeatCount="indefinite" />
            </path>
          </g>
        )}
        
        {isActive && (
          <rect x="100" y="80" width="190" height="70" fill="orange" opacity={0.1 + (modulation / 500)}>
            <animate attributeName="opacity" values={`${0.1 + modulation/500}; ${0.2 + modulation/500}; ${0.1 + modulation/500}`} dur={outerDur} repeatCount="indefinite" />
          </rect>
        )}

        {isLockout && (
          <circle cx="60" cy="115" r="18" fill="#ef4444" opacity="0.3">
            <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      
      <div className="absolute bottom-4 left-6 flex flex-col gap-1">
        <span className="label text-tc-text-muted">Sistemas Auxiliares</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-tc-action animate-pulse' :
              isPurging ? 'bg-tc-action animate-pulse' :
              isLockout ? 'bg-tc-alarm-crit animate-ping' :
              'bg-tc-border'
            }`}></div>
            <span className={`text-[10px] font-bold ${
              isActive ? 'text-tc-action' :
              isPurging ? 'text-tc-action' :
              isLockout ? 'text-tc-alarm-crit' :
              'text-tc-text-muted'
            }`}>
              {BURNER_PHASE_LABEL[burnerPhase] || burnerPhase}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pumpRunning ? 'bg-tc-equip-on animate-pulse' : 'bg-tc-border'}`}></div>
            <span className={`text-[10px] font-bold ${pumpRunning ? 'text-tc-equip-on' : 'text-tc-text-muted'}`}>
              BOMBA: {pumpRunning ? 'LIGADA' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoilerIllustration;