import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HeaterState, BURNER_PHASE_LABEL } from '../types';
import { X, ShieldAlert, Loader2, CheckCircle, AlertCircle, Lock, Info, XCircle } from 'lucide-react';

interface CommandModalProps {
  heater: HeaterState;
  onClose: () => void;
}

const TRANSLATE_REASON: Record<string, string> = {
  'NOT_REQUESTED': 'Sem pedido de partida',
  'CHAIN_NOT_OK': 'Cadeia de segurança aberta',
  'ESTOP_PRESSED': 'Emergência acionada',
  'LFL_LOCKOUT': 'Bloqueio ativo no LFL',
  'MAX_LOCKOUTS_24H': 'Muitos bloqueios em 24h',
  'TEMP_SENSOR_FAULT': 'Sensor PT100 em falha',
  'PRESS_SENSOR_FAULT': 'Sensor de pressão em falha',
  'LOW_PRESSURE': 'Pressão da caldeira muito baixa',
  'NOVUS_COMM_LOST': 'Sem comunicação com Novus',
  'SW_TEMP_LIMIT_LATCHED': 'Limite de temperatura software atingido e travado',
  '24H_CONTINUOUS_STOP': 'Limite de 24h contínuas (parada obrigatória)',
  'DISCREPANCY_GAS_WITHOUT_PERM': 'Discrepância Válvula Gás (sem permissão)',
  'IGNITION_TIMEOUT': 'Timeout de pré-purga sem ignição (60s)',
  'NO_PUMP_FLOW': 'Sem retorno (fluxo) da bomba',
  'INVALID_TARGET': 'Alvo inválido',
  'INVALID_COMMAND': 'Comando não permitido ou desconhecido',
  'NOT_AUTHORIZED': 'Perfil não autorizado para este comando',
  'INVALID_VALUE': 'Valor fornecido inválido'
};

const translate = (reason: string | undefined) => {
  if (!reason) return 'Motivo desconhecido';
  return TRANSLATE_REASON[reason] || reason;
};

const CommandModal: React.FC<CommandModalProps> = ({ heater, onClose }) => {
  const { sendCommand, currentUser, isOnline, allowedActions, pendingCommands } = useApp();
  const [confirmTextPump, setConfirmTextPump] = useState('');
  const [confirmTextBurner, setConfirmTextBurner] = useState('');

  const hasLogin = !!currentUser;
  const actions = allowedActions[heater.id] || [];
  const canBurnerStart = hasLogin && actions.includes('BURNER_START');
  const canBurnerStop  = hasLogin && actions.includes('BURNER_STOP');
  const canPumpStart   = hasLogin && actions.includes('PUMP_START');
  const canPumpStop    = hasLogin && actions.includes('PUMP_STOP');

  const hasPending = pendingCommands.some(p => p.equipmentId === heater.id && p.status === 'pending');
  const lastResult = pendingCommands.find(p => p.equipmentId === heater.id && p.status !== 'pending');

  const handleAction = async (cmd: string, requireConfirmation = false) => {
    if (!isOnline || !hasLogin) return;

    if (requireConfirmation) {
      const textToVerify = cmd === 'PUMP_START' ? confirmTextPump : confirmTextBurner;
      if (textToVerify.toUpperCase() !== 'LIGAR') {
        alert('Favor digitar LIGAR no campo de confirmação para este equipamento.');
        return;
      }
    }

    await sendCommand(heater.id, cmd, null);

    if (cmd === 'PUMP_START') setConfirmTextPump('');
    if (cmd === 'BURNER_START') setConfirmTextBurner('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tc-bg/80 backdrop-blur-sm transition-all">
      <div className="bg-tc-surface rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-tc-border animate-[in_0.2s_ease-out]">
        <div className="p-6 bg-tc-surface-2 border-b border-tc-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tc-action rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-tc-text uppercase tracking-tight m-0">Comando Central</h2>
              <p className="label text-tc-text-muted m-0">{heater.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border-0 bg-transparent hover:bg-tc-border rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-tc-text-muted" />
          </button>
        </div>

        {!isOnline && (
          <div className="m-6 p-4 bg-tc-alarm-crit-fill border border-tc-alarm-crit text-white rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-tight">
            <AlertCircle className="w-5 h-5 shrink-0" />
            SISTEMA OFFLINE: OPERAÇÃO REMOTA BLOQUEADA
          </div>
        )}

        {!hasLogin && isOnline && (
          <div className="m-6 p-4 bg-tc-alarm-warn-fill border border-tc-alarm-warn text-white rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-tight">
            <Lock className="w-5 h-5 shrink-0" />
            FAÇA LOGIN PARA ENVIAR COMANDOS
          </div>
        )}

        <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center gap-3 p-4 bg-tc-surface-2 rounded border border-tc-border">
            <span className="label text-tc-text-muted">Fase:</span>
            <span className={`text-sm font-bold uppercase ${
              heater.burner.phase === 'RUNNING' ? 'text-tc-action' :
              heater.burner.phase === 'LOCKOUT' ? 'text-tc-alarm-crit animate-pulse' :
              heater.burner.phase === 'PURGE' || heater.burner.phase === 'POST_PURGE' ? 'text-tc-action' :
              'text-tc-text'
            }`}>
              {BURNER_PHASE_LABEL[heater.burner.phase] || heater.burner.phase}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="label text-tc-text-muted m-0">BOMBA DE CIRCULAÇÃO 50CV</h3>
              <span className={`px-2 py-1 rounded-md label ${heater.pump.cmd ? 'bg-tc-equip-on text-tc-bg' : 'bg-tc-surface-2 text-tc-text-muted'
                }`}>
                {heater.pump.cmd ? (heater.pump.fb ? 'LIGADA' : 'CMD SEM FB') : 'OFF'}
              </span>
            </div>

            <div className="flex gap-4 items-center">
              <button
                disabled={!canPumpStart || hasPending}
                onClick={() => handleAction('PUMP_START', true)}
                className={`flex-1 py-4 px-6 font-bold text-xs rounded border-0 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 ${canPumpStart ? 'bg-tc-action-fill text-white hover:opacity-90' : 'bg-tc-surface-2 text-tc-text-muted'
                  }`}
              >
                {!canPumpStart && <Lock className="w-4 h-4" />}
                LIGAR BOMBA
              </button>
              <button
                disabled={!canPumpStop || hasPending}
                onClick={() => handleAction('PUMP_STOP')}
                className="flex-1 py-4 px-6 bg-tc-surface-2 border border-tc-border text-tc-text font-bold text-xs rounded hover:bg-tc-border disabled:opacity-50 transition-all cursor-pointer"
              >
                DESLIGAR
              </button>
            </div>

            {canPumpStart && !heater.pump.cmd && (
              <input
                type="text"
                value={confirmTextPump}
                onChange={(e) => setConfirmTextPump(e.target.value)}
                placeholder="Digite 'LIGAR' para confirmar partida"
                className="w-full bg-tc-surface-2 border border-tc-border rounded px-4 py-3 text-xs font-bold text-tc-text focus:border-tc-action outline-none"
              />
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-tc-border">
            <div className="flex items-center justify-between">
              <h3 className="label text-tc-text-muted m-0">QUEIMADOR MODULANTE GLP</h3>
            </div>

            <div className="flex gap-4">
              <button
                disabled={!canBurnerStart || hasPending}
                onClick={() => handleAction('BURNER_START', true)}
                className={`flex-1 py-4 px-6 font-bold text-xs rounded border-0 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 ${canBurnerStart ? 'bg-tc-action-fill text-white hover:opacity-90' : 'bg-tc-surface-2 text-tc-text-muted'
                  }`}
              >
                {!canBurnerStart && <Lock className="w-4 h-4" />}
                PARTIDA QUEIMADOR
              </button>
              <button
                disabled={!canBurnerStop || hasPending}
                onClick={() => handleAction('BURNER_STOP')}
                className="flex-1 py-4 px-6 bg-tc-surface-2 border border-tc-border text-tc-text font-bold text-xs rounded hover:bg-tc-border disabled:opacity-50 transition-all cursor-pointer"
              >
                APAGAR CHAMA
              </button>
            </div>

            {heater.burner.blockReasons.length > 0 && isOnline && (
              <div className="p-3 bg-tc-alarm-warn-fill border border-tc-alarm-warn rounded space-y-1">
                <p className="label text-white m-0 flex items-center gap-2">
                  <Info className="w-3 h-3" /> Intertravamentos Ativos (ESP32):
                </p>
                <ul className="text-[9px] font-bold text-white list-disc list-inside m-0 pl-2">
                  {heater.burner.blockReasons.map((reason, idx) => (
                    <li key={idx}>{translate(reason)}</li>
                  ))}
                </ul>
              </div>
            )}

            {heater.burner.lockout && (
              <div className="p-3 bg-tc-alarm-crit-fill border border-tc-alarm-crit rounded">
                <p className="label text-white flex items-center gap-2 m-0">
                  <AlertCircle className="w-3 h-3" /> BLOQUEIO DO LFL — REARME SOMENTE LOCAL
                </p>
                <p className="text-[9px] font-bold text-white/80 m-0 mt-1">
                  Bloqueios nas últimas 24h: {heater.burner.lockoutCount24h}
                </p>
              </div>
            )}

            {canBurnerStart && heater.burner.phase === 'OFF' && (
              <input
                type="text"
                value={confirmTextBurner}
                onChange={(e) => setConfirmTextBurner(e.target.value)}
                placeholder="Digite 'LIGAR' para confirmar ignição"
                className="w-full bg-tc-surface-2 border border-tc-border rounded px-4 py-3 text-xs font-bold text-tc-text focus:border-tc-action outline-none"
              />
            )}

            <div className="grid grid-cols-3 gap-3 p-4 bg-tc-surface-2 rounded border border-tc-border">
              <div className="text-center">
                <span className="label text-tc-text-muted block">PV (Novus)</span>
                <span className="text-lg font-bold text-tc-text">{heater.novus.commOk ? `${heater.novus.pv.toFixed(1)}°C` : 'SEM COM.'}</span>
              </div>
              <div className="text-center">
                <span className="label text-tc-text-muted block">SP (Novus)</span>
                <span className="text-lg font-bold text-tc-text">{heater.novus.commOk ? `${heater.novus.sp.toFixed(1)}°C` : 'SEM COM.'}</span>
              </div>
              <div className="text-center">
                <span className="label text-tc-text-muted block">MV (Modulação)</span>
                <span className="text-lg font-bold text-tc-text">{heater.novus.commOk ? `${heater.novus.mv.toFixed(1)}%` : 'SEM COM.'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-tc-surface-2 border-t border-tc-border flex items-center justify-center min-h-[80px]">
          {hasPending && (
            <div className="flex items-center gap-3 text-tc-action font-bold animate-pulse uppercase text-xs">
              <Loader2 className="w-5 h-5 animate-spin" />
              AGUARDANDO ACK DO ESP32...
            </div>
          )}
          {lastResult?.status === 'accepted' && (
            <div className="flex items-center gap-3 text-tc-equip-on font-bold uppercase text-xs">
              <CheckCircle className="w-5 h-5" />
              ORDEM ACEITA PELO ESP32
            </div>
          )}
          {lastResult?.status === 'rejected' && (
            <div className="flex items-center gap-3 text-tc-alarm-crit font-bold uppercase text-xs">
              <XCircle className="w-5 h-5" />
              RECUSADO: {translate(lastResult.reason)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandModal;
