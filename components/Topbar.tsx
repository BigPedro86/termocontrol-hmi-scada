import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { CommChip } from './ui/CommChip';

export default function Topbar() {
  const { isOnline, lastUpdateTs, currentUser, logout, state } = useApp();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleString('pt-BR');
  
  // Calculate seconds since last update using lastUpdateTs
  const secondsAgo = lastUpdateTs ? Math.floor((Date.now() - lastUpdateTs) / 1000) : null;
  const isStale = secondsAgo !== null && secondsAgo > 5;
  const serverState = isOnline ? 'OK' : 'SEM COMUNICAÇÃO';
  const espState = !isOnline ? 'SEM DADOS' : (isStale ? 'SEM COMUNICAÇÃO' : 'OK');
  const isEspOffline = !isOnline || isStale;
  
  const novusAQ01State = isEspOffline ? 'SEM DADOS' : (state?.heaters?.[0]?.novus.commOk === false ? 'SEM COMUNICAÇÃO' : 'OK');
  const novusAQ02State = isEspOffline ? 'SEM DADOS' : (state?.heaters?.[1]?.novus.commOk === false ? 'SEM COMUNICAÇÃO' : 'OK');

  return (
    <header className="h-14 shrink-0 box-border px-4 md:px-6 flex items-center gap-4 md:gap-6 bg-tc-surface border-b border-tc-border overflow-hidden whitespace-nowrap">
      <div className="flex items-baseline gap-4 shrink-0">
        <span className="text-base font-semibold text-tc-text truncate max-w-[120px] md:max-w-none" title="Planta TermoControl">TermoControl</span>
        <span className="text-tc-text-muted tabular-nums text-sm hidden md:inline">{timeStr}</span>
      </div>
      
      <div className="ml-auto flex items-center gap-1.5 md:gap-2 shrink min-w-0 overflow-x-auto no-scrollbar">
        <CommChip label="SRV" state={serverState} />
        <CommChip label="ESP32" state={espState} />
        <CommChip label="N1" state={novusAQ01State} />
        <CommChip label="N2" state={novusAQ02State} />
        
        {lastUpdateTs === null && (
          <span className="ml-1 md:ml-2 text-xs text-tc-text-muted">
            aguardando dados
          </span>
        )}
      </div>
      
      <div className="w-[1px] h-8 bg-tc-border shrink-0"></div>
      
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {currentUser ? (
          <>
            <span className="h-7 px-2 rounded bg-tc-surface-2 text-xs font-semibold tracking-wider text-tc-text-muted flex items-center">
              {currentUser.role.toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-tc-text mr-1 md:mr-2 truncate max-w-[80px] md:max-w-none" title={currentUser.name}>{currentUser.name}</span>
            <button 
              onClick={() => { logout(); navigate('/'); }}
              className="h-10 px-4 rounded-lg bg-tc-surface-2 text-tc-text font-semibold hover:bg-tc-border transition-colors cursor-pointer"
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <span className="h-7 px-2 rounded bg-tc-surface-2 text-xs font-semibold tracking-wider text-tc-text-muted flex items-center">
              MODO VISUALIZAÇÃO
            </span>
            <Link 
              to="/login"
              className="h-10 px-4 rounded-lg bg-tc-action-fill text-white font-semibold flex items-center hover:bg-tc-action transition-colors"
            >
              Entrar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
