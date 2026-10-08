import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, CheckCircle, Clock, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable } from '../components/ui/DataTable';

const Alarms: React.FC = () => {
  const { activeAlarms, ackAlarm, settings } = useApp();

  const sortedAlarms = useMemo(() => {
    return [...activeAlarms].sort((a, b) => {
      if (!a.acked && b.acked) return -1;
      if (a.acked && !b.acked) return 1;
      if (!a.cleared && b.cleared) return -1;
      if (a.cleared && !b.cleared) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [activeAlarms]);

  return (
    <div className="flex flex-col gap-6 fade-in h-full">
      <div className="flex items-center gap-4 p-6 bg-tc-surface rounded-lg border border-tc-border shrink-0">
        <div className="w-12 h-12 bg-tc-alarm-crit-fill rounded-lg flex items-center justify-center border border-tc-alarm-crit">
          <AlertOctagon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="title-page m-0 text-tc-text uppercase">Gerenciamento de Alarmes</h1>
          <p className="label text-tc-text-muted mt-1">Visualize e reconheça anomalias críticas do sistema.</p>
        </div>
      </div>

      <div className="flex-1 bg-tc-surface rounded-lg border border-tc-border overflow-hidden flex flex-col">
        <div className="p-6 border-b border-tc-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="title-section text-tc-text m-0">Alarmes Ativos</h3>
            <span className="bg-tc-alarm-crit-fill text-white px-3 py-1 rounded-full text-xs font-bold">
              {activeAlarms.length} Registro(s)
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-0">
          <DataTable
            data={sortedAlarms}
            keyExtractor={(a) => a.id}
            emptyMessage="Sistema operando normalmente. Nenhum alarme ativo."
            rowClassName={(alarm) => !alarm.acked ? 'bg-tc-alarm-crit-fill/10' : ''}
            columns={[
              {
                header: 'STATUS',
                accessor: (alarm) => (
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase w-max ${
                      alarm.acked 
                        ? 'bg-tc-surface-2 text-tc-text-muted' 
                        : 'bg-tc-alarm-crit-fill text-white animate-pulse'
                    }`}>
                      {alarm.acked ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {alarm.acked ? `Reconhecido por ${alarm.ackedBy}` : 'Não Reconhecido'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase w-max ${
                      alarm.cleared 
                        ? 'bg-tc-equip-on text-tc-bg' 
                        : 'bg-tc-alarm-warn-fill text-white'
                    }`}>
                      {alarm.cleared ? 'Problema Resolvido' : 'Anomalia Vigente'}
                    </span>
                  </div>
                )
              },
              {
                header: 'OCORRÊNCIA',
                accessor: (alarm) => (
                  <div className="flex items-center gap-2 text-xs font-bold text-tc-text-muted">
                    <Clock className="w-4 h-4" />
                    {format(new Date(alarm.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </div>
                )
              },
              {
                header: 'EQUIPAMENTO',
                accessor: (alarm) => (
                  <span className="text-xs font-bold text-tc-text bg-tc-surface-2 border border-tc-border px-2.5 py-1 rounded-md">
                    {alarm.equipment}
                  </span>
                )
              },
              {
                header: 'MENSAGEM',
                accessor: (alarm) => (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-tc-text">{alarm.type}</span>
                    <span className="text-xs font-bold text-tc-text-muted mt-0.5">{alarm.description}</span>
                  </div>
                )
              },
              {
                header: 'AÇÃO',
                accessor: (alarm) => (
                  <div className="text-right">
                    {!alarm.acked ? (
                      <button
                        onClick={() => ackAlarm(alarm.id)}
                        disabled={settings.useSimulation}
                        className="px-4 py-2 bg-tc-alarm-crit-fill hover:opacity-90 text-white text-xs font-bold rounded cursor-pointer transition-colors border-0 disabled:opacity-50"
                      >
                        RECONHECER
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-tc-text-muted italic">
                        {alarm.cleared ? 'Aguardando arquivamento...' : 'Aguardando resolução'}
                      </span>
                    )}
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default Alarms;
