import React from 'react';
import { BurnerPhase } from '../../types';

interface PhaseStepperProps {
  phase: BurnerPhase;
}

const PHASES = [
  { id: 'OFF', label: 'PARADO' },
  { id: 'WAIT_PUMP', label: 'AGUARDANDO BOMBA' },
  { id: 'PURGE', label: 'PURGA' },
  { id: 'RUNNING', label: 'QUEIMANDO' },
  { id: 'POST_PURGE', label: 'PÓS-PURGA' }
];

export const PhaseStepper: React.FC<PhaseStepperProps> = ({ phase }) => {
  const currentIndex = PHASES.findIndex(p => p.id === phase);
  const isLockout = phase === 'LOCKOUT';
  
  return (
    <div className="flex items-start justify-between w-full">
      {PHASES.map((p, index) => {
        const isActive = p.id === phase;
        const isPast = !isLockout && index < currentIndex;
        const isFuture = isLockout || index > currentIndex;
        
        let iconNode = null;
        
        if (isActive) {
          if (p.id === 'RUNNING') {
            iconNode = (
              <span className="w-8 h-8 rounded-full bg-tc-equip-on shrink-0 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF8A3D" stroke="#C2410C" strokeWidth="1.5" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
              </span>
            );
          } else {
            iconNode = (
              <span className="w-8 h-8 rounded-full bg-tc-equip-on shrink-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#16191D]" />
              </span>
            );
          }
        } else if (isPast) {
          iconNode = (
            <span className="w-7 h-7 rounded-full bg-tc-text-muted shrink-0 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16191D" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>
            </span>
          );
        } else {
          iconNode = <span className="w-7 h-7 box-border rounded-full border-2 border-tc-equip-off shrink-0" />;
        }

        return (
          <React.Fragment key={p.id}>
            <div className={`flex flex-col items-center gap-2 w-24 shrink-0 ${isLockout ? 'opacity-40' : ''}`}>
              <div className="h-8 flex items-center justify-center">{iconNode}</div>
              <span className={`text-xs text-center leading-tight tracking-wider ${isActive && !isLockout ? 'text-tc-equip-on font-bold' : isPast && !isLockout ? 'text-tc-text-muted font-semibold' : 'text-tc-text-dim font-semibold'}`}>
                {p.label}
              </span>
            </div>
            {index < PHASES.length - 1 && (
              <div className={`flex-grow h-[2px] mt-4 ${(isPast || isActive) && !isLockout ? 'bg-tc-text-muted' : 'bg-tc-border'}`} />
            )}
          </React.Fragment>
        );
      })}
      
      {isLockout && (
        <>
          <div className="flex-grow h-[2px] bg-tc-border mt-4" />
          <div className="flex flex-col items-center gap-2 w-24 shrink-0">
            <div className="h-8 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-tc-alarm-crit-fill shrink-0 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </span>
            </div>
            <span className="text-xs text-center leading-tight font-bold tracking-wider text-tc-alarm-crit">
              BLOQUEIO
            </span>
          </div>
        </>
      )}
    </div>
  );
};
