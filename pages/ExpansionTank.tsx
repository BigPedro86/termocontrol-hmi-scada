import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  Settings,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ValueDisplay } from '../components/ui/ValueDisplay';
import { CommandButton } from '../components/ui/CommandButton';

const TRANSLATE_REASON: Record<string, string> = {
  'TANK_LEVEL_STILL_LOW': 'Nível de água ainda está baixo',
  'UNAUTHORIZED_ROLE': 'Perfil não autorizado para este comando',
  'UNKNOWN_COMMAND': 'Comando desconhecido',
};

const translate = (reason: string | undefined) => {
  if (!reason) return 'Motivo desconhecido';
  return TRANSLATE_REASON[reason] || reason;
};

const ExpansionTank: React.FC = () => {
  const { tank, sendCommand, currentUser, isOnline, allowedActions, pendingCommands } = useApp();

  const handleCommand = (cmd: string) => {
    if (!currentUser) return alert('Autentique-se para enviar comandos.');
    sendCommand(tank.id, cmd, null);
  };

  const actions = allowedActions[tank.id] || [];
  const lockCommands = !isOnline || pendingCommands.some(p => p.equipmentId === tank.id);
  const hasLogin = !!currentUser;
  
  const canPumpStop = hasLogin && actions.includes('TX01_PUMP_STOP');
  const canAuto = hasLogin && actions.includes('TX01_AUTO');
  const canReset = hasLogin && actions.includes('TANK_LEVEL_RESET');

  const hasPending = pendingCommands.some(p => p.equipmentId === tank.id && p.status === 'pending');
  const lastResult = pendingCommands.find(p => p.equipmentId === tank.id && p.status !== 'pending');

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center bg-tc-surface p-6 rounded-lg border border-tc-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tc-surface-2 rounded-lg flex items-center justify-center border border-tc-border">
            <Database className="w-6 h-6 text-tc-text-muted" />
          </div>
          <div>
            <h1 className="title-page m-0 text-tc-text uppercase tracking-wider">{tank.name || 'Tanque de Expansão'}</h1>
            <p className="label text-tc-text-muted mt-1">ESTABILIZAÇÃO E REPOSIÇÃO AUTOMÁTICA</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <Card title="SINAIS E SENSORES DIGITAIS" className="h-full">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-tc-surface-2 p-4 rounded-lg border border-tc-border">
                <ValueDisplay label="NÍVEL DE ÁGUA" value={!isOnline ? null : (tank.levelNormal ? 'NORMAL' : 'BAIXO (ALARME)')} quality={isOnline ? (tank.levelNormal ? 'OK' : 'FAULT') : 'COMM_LOST'} />
              </div>
              
              <div className="flex justify-between items-center bg-tc-surface-2 p-4 rounded-lg border border-tc-border">
                <ValueDisplay label="PRESSOSTATO DA REDE" value={!isOnline ? null : (tank.pressureLow ? 'BAIXA (PEDIDO BOMBA)' : 'NORMAL')} quality={isOnline ? 'OK' : 'COMM_LOST'} />
              </div>

              <div className="flex justify-between items-center bg-tc-surface-2 p-4 rounded-lg border border-tc-border">
                <ValueDisplay label="COMANDO BOMBA (ESP32)" value={!isOnline ? null : (tank.pumpCmd ? 'LIGADA' : 'DESLIGADA')} quality={isOnline ? 'OK' : 'COMM_LOST'} />
              </div>
              
              <div className="flex justify-between items-center bg-tc-surface-2 p-4 rounded-lg border border-tc-border">
                <ValueDisplay label="RETORNO BOMBA (CONTATOR)" value={!isOnline ? null : (tank.pumpFb ? 'LIGADA' : 'DESLIGADA')} quality={isOnline ? 'OK' : 'COMM_LOST'} />
              </div>
            </div>
            
            {tank.isLatched && isOnline && (
              <div className="p-4 bg-tc-alarm-crit-fill border border-tc-alarm-crit rounded-lg mt-4">
                <p className="label text-white flex items-center gap-2 m-0">
                  <AlertCircle className="w-4 h-4" /> REPOSIÇÃO TRAVADA — EXIGE REARME (FALHA DE NÍVEL OU TIMEOUT)
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="PAINEL DE COMANDOS" icon={<Settings className="w-5 h-5 text-tc-text-muted" />} className="h-full">
            <div className="flex flex-col gap-4 flex-1">
               <div className="flex gap-4">
                 <CommandButton 
                    variant="start"
                    label={tank.isAuto ? "MODO AUTO (ATIVO)" : "ATIVAR MODO AUTO"}
                    disabled={lockCommands || !canAuto || tank.isAuto}
                    onClick={() => handleCommand('TX01_AUTO')}
                 />
                 <CommandButton 
                    variant="stop"
                    label="FORÇAR PARADA (MANUAL)"
                    disabled={lockCommands || !canPumpStop}
                    onClick={() => handleCommand('TX01_PUMP_STOP')}
                 />
               </div>
               
               <div className="pt-4 border-t border-tc-border">
                 <button
                    disabled={lockCommands || !canReset}
                    onClick={() => handleCommand('TANK_LEVEL_RESET')}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-tc-alarm-crit-fill hover:bg-tc-alarm-crit text-white"
                 >
                   <RefreshCw className="w-5 h-5" /> REARME (RESET DE TRAVAMENTO)
                 </button>
               </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-tc-border flex items-center justify-center min-h-[60px]">
              {hasPending && (
                <div className="flex items-center gap-3 text-tc-action font-bold animate-pulse uppercase text-xs tracking-wider">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AGUARDANDO ACK...
                </div>
              )}
              {lastResult?.status === 'accepted' && (
                <div className="flex items-center gap-3 text-tc-equip-on font-bold uppercase text-xs tracking-wider">
                  <CheckCircle className="w-5 h-5" />
                  ORDEM ACEITA PELO ESP32
                </div>
              )}
              {lastResult?.status === 'rejected' && (
                <div className="flex items-center gap-3 text-tc-alarm-crit font-bold uppercase text-xs tracking-wider">
                  <XCircle className="w-5 h-5" />
                  RECUSADO: {translate(lastResult.reason)}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExpansionTank;
