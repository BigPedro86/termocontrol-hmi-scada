import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import {
  Activity, Settings2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SafeValue } from '../components/SafeValue';
import AnalogBar from '../components/AnalogBar';
import { Card } from '../components/ui/Card';
import { ValueDisplay } from '../components/ui/ValueDisplay';
import { PhaseStepper } from '../components/ui/PhaseStepper';
import { CommandButton } from '../components/ui/CommandButton';

const HeaterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { heaters, isOnline, allowedActions, currentUser, settings, sendCommand, pendingCommands } = useApp();
  const [realTrendData, setRealTrendData] = useState<any[]>([]);

  const heater = heaters.find(h => h.id === id);

  useEffect(() => {
    if (!currentUser?.token || settings.useSimulation || !id) return;
    const httpUrl = settings.endpoint.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/+$/, '');
    const fetchHistory = () => {
      axios.get(`${httpUrl}/history?equipment=${id}&limit=60`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
        .then(res => {
          const formatted = res.data.map((p: any) => {
            const date = new Date(p.ts);
            const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            const heaterData = p.heaters?.[id!];
            return {
              time: timeLabel,
              temp: heaterData?.temp ?? 0,
              pres: heaterData?.pressure ?? 0,
              setpoint: heaterData?.setpoint ?? 0,
            };
          });
          setRealTrendData(formatted);
        })
        .catch(err => console.error('HeaterDetail: Erro ao buscar history:', err));
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.token, settings.useSimulation, settings.endpoint, id]);

  if (!heater) return <Navigate to="/" />;

  const actions = allowedActions[heater.id] || [];
  const blockReasons = heater.burner.blockReasons || [];
  
  const hasPending = pendingCommands.some(p => p.equipmentId === heater.id && p.status === 'pending');
  const lockCommands = hasPending || !isOnline;

  const handleCommand = (cmd: string, val: any) => {
    if (!currentUser) {
      alert("Autentique-se para enviar comandos.");
      return;
    }
    sendCommand(heater.id, cmd, val);
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center bg-tc-surface p-6 rounded-lg border border-tc-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tc-surface-2 rounded-lg flex items-center justify-center border border-tc-border">
            <Activity className="w-6 h-6 text-tc-text-muted" />
          </div>
          <div>
            <h1 className="title-page m-0 text-tc-text uppercase tracking-wider">{heater.name}</h1>
            <p className="label text-tc-text-muted mt-1">Supervisão de Malha Fechada</p>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <ValueDisplay label="HORAS DE OPERAÇÃO" value={heater.burner.runHours} quality={isOnline ? 'OK' : 'COMM_LOST'} />
          <ValueDisplay label="BLOQUEIOS 24H" value={heater.burner.lockoutCount24h} quality={isOnline ? 'OK' : 'COMM_LOST'} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          <Card title="SEQUÊNCIA DE IGNIÇÃO (LFL1.333)">
            <PhaseStepper phase={heater.burner.phase} isOnline={isOnline} />
          </Card>

          <Card title="INSTRUMENTAÇÃO" className="flex flex-col gap-8">
            <AnalogBar 
              label="Temperatura (PT100)" 
              value={heater.temp.value} 
              unit="°C" 
              min={0} max={120} 
              sp={heater.novus.sp} 
              quality={heater.temp.quality}
              limits={{ ll: 5, l: 15, h: 85, hh: 95 }}
            />
            
            <AnalogBar 
              label="Pressão de Água" 
              value={heater.press.value} 
              unit=" bar" 
              min={0} max={6} 
              quality={heater.press.quality}
              limits={{ ll: 0.5, l: 1.0, h: 4.5, hh: 5.0 }}
            />
            
            <AnalogBar 
              label="Modulação Novus (MV)" 
              value={heater.novus.mv} 
              unit="%" 
              min={0} max={100} 
              quality={heater.novus.commOk ? 'OK' : 'COMM_LOST'}
            />
          </Card>

        </div>

        <div className="flex flex-col gap-6">
          <Card title="COMANDOS IHM" icon={<Settings2 className="w-5 h-5 text-tc-text-muted" />} className="h-full">
            
            <div className="mb-6 p-4 rounded-lg bg-tc-surface-2 border border-tc-border">
              <div className="label text-tc-text-muted mb-2">CADEIA DE SEGURANÇA (HARDWARE)</div>
              <div className="flex items-center gap-2">
                <SafeValue value={heater.chainOk} type="boolean" boolTrueText="FECHADA (OK)" boolFalseText="ABERTA (FALHA)" className={`text-sm font-bold tracking-widest px-2 py-1 rounded ${heater.chainOk ? 'bg-tc-equip-on text-tc-bg' : 'bg-tc-alarm-crit text-white'}`} />
              </div>
            </div>

            <div className="mb-8">
               <div className="label text-tc-text-muted mb-2">RESTRIÇÕES LÓGICAS ATIVAS</div>
               {!isOnline ? (
                 <div className="text-xs font-bold text-tc-text-muted bg-tc-surface-2 px-3 py-2 rounded border border-tc-border">SEM DADOS</div>
               ) : blockReasons.length > 0 ? (
                 <ul className="space-y-2 list-none p-0 m-0">
                   {blockReasons.map((r, i) => (
                     <li key={i} className="text-xs font-bold text-tc-bg bg-tc-alarm-warn px-3 py-2 rounded">
                       ⚠ {r}
                     </li>
                   ))}
                 </ul>
               ) : (
                 <div className="text-xs font-bold text-tc-bg bg-tc-equip-on px-3 py-2 rounded">
                   ✓ Nenhuma restrição
                 </div>
               )}
            </div>

            <div className="flex flex-col gap-4 flex-1">
               <CommandButton 
                  variant="start"
                  label="LIGAR BOMBA"
                  disabled={lockCommands || !actions.includes('PUMP_START')}
                  onClick={() => handleCommand('PUMP_START', null)}
               />
               <CommandButton 
                  variant="stop"
                  label="DESLIGAR BOMBA"
                  disabled={lockCommands || !actions.includes('PUMP_STOP')}
                  onClick={() => handleCommand('PUMP_STOP', null)}
                  isConfirmed={!heater.pump.cmd && !heater.pump.fb}
               />
               
               <hr className="border-tc-border my-2" />

               <CommandButton 
                  variant="start"
                  label="LIBERAR QUEIMADOR"
                  disabled={lockCommands || !actions.includes('BURNER_START')}
                  onClick={() => handleCommand('BURNER_START', null)}
               />
               <CommandButton 
                  variant="stop"
                  label="BLOQUEAR QUEIMADOR"
                  disabled={lockCommands || !actions.includes('BURNER_STOP')}
                  onClick={() => handleCommand('BURNER_STOP', null)}
                  isConfirmed={!heater.burner.requested && !heater.burner.permission && !heater.io.gasValves}
               />
            </div>
            
            {hasPending && (
              <div className="mt-4 text-center">
                <span className="label text-tc-action animate-pulse">AGUARDANDO CONFIRMAÇÃO...</span>
              </div>
            )}
          </Card>

          <Card title="SINAIS DE CAMPO" className="h-max">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-semibold tracking-wide text-tc-text-dim">
              <div className="flex justify-between border-b border-tc-border pb-1"><span>lockoutS:</span> <span>{heater.io.lockoutS ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>gasValves:</span> <span>{heater.io.gasValves ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>fan:</span> <span>{heater.io.fan ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>chainOk:</span> <span>{heater.io.chainOk ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>pumpFb:</span> <span>{heater.io.pumpFb ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>permOut:</span> <span>{heater.io.permOut ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>pumpOut:</span> <span>{heater.io.pumpOut ? '1' : '0'}</span></div>
              <div className="flex justify-between border-b border-tc-border pb-1"><span>pressmA:</span> <span>{heater.io.pressmA?.toFixed(1)}</span></div>
            </div>
          </Card>
        </div>
      </div>

      {realTrendData.length > 0 && (
        <Card title="CURVA DE TEMPERATURA VS SETPOINT">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realTrendData}>
                <defs>
                  <linearGradient id="colorTempDetail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363C44" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} interval={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} unit="°C" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2328', border: '1px solid #363C44', color: '#E7EAEE' }} />
                
                {realTrendData[0]?.setpoint > 0 && (
                  <ReferenceLine y={realTrendData[0].setpoint} stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'SP', fill: '#3B82F6', fontSize: 10, fontWeight: 'bold' }} />
                )}
                <ReferenceLine y={95} stroke="#F0616A" strokeWidth={1} label={{ position: 'insideTopLeft', value: 'HH', fill: '#F0616A', fontSize: 10 }} />
                
                <Area type="monotone" dataKey="temp" stroke="#3B82F6" strokeWidth={2} fill="url(#colorTempDetail)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default HeaterDetail;
