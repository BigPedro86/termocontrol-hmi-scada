import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, BellOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AlarmBanner: React.FC = () => {
  const { activeAlarms, ackAlarms } = useApp();
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);

  const unacked = activeAlarms.filter(a => !a.acked);
  const activeCount = activeAlarms.length;

  if (activeCount === 0) return null;

  const latestAlarm = unacked.length > 0 ? unacked[0] : activeAlarms[0];
  const isDanger = latestAlarm.severity === 'Danger';
  
  const bgColor = isDanger ? 'bg-tc-alarm-crit-fill' : 'bg-tc-alarm-warn-fill';
  const textColor = isDanger ? 'text-white' : 'text-white';

  return (
    <div className={`h-12 flex items-center justify-between px-4 shrink-0 shadow-lg z-30 transition-colors ${bgColor} ${textColor}`}>
      <div 
        className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden"
        onClick={() => navigate('/alarms')}
      >
        <AlertTriangle className={`w-5 h-5 shrink-0 ${unacked.length > 0 ? 'animate-pulse' : ''}`} />
        <div className="flex items-center gap-2 font-bold text-sm truncate uppercase tracking-wide">
          <span className="shrink-0">{latestAlarm.equipment}:</span>
          <span className="truncate">{latestAlarm.description}</span>
        </div>
        {activeCount > 1 && (
          <span className="px-2 py-0.5 rounded-full bg-black/20 text-xs font-bold">
            +{activeCount - 1} ativos
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
          className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-black/10 hover:bg-black/20 transition-colors border-0 cursor-pointer text-white"
          title="Silenciar a buzina temporariamente"
        >
          {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          Silenciar
        </button>
        {unacked.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); ackAlarms(); }}
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-black/30 hover:bg-black/40 transition-colors shadow-sm border-0 cursor-pointer text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            Reconhecer (ACK)
          </button>
        )}
      </div>
    </div>
  );
};

export default AlarmBanner;
