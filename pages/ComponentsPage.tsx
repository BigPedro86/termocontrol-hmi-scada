import React from 'react';
import { Card, ValueDisplay, StatusBadge, AnalogBar, CommandButton, AlarmStrip, CommChip, PhaseStepper } from '../components/ui';

export const ComponentsPage: React.FC = () => {
  return (
    <div className="p-4 md:p-12 w-full min-h-screen box-border flex flex-col gap-6 overflow-x-hidden">
      <div className="flex items-baseline gap-4 shrink-0">
        <h1 className="title-page m-0">Padrão visual da IHM</h1>
        <span className="text-tc-text-muted">Referência de cores, textos e componentes</span>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* CORES */}
        <Card title="Cores" className="h-auto overflow-y-auto min-w-0">
          <div className="flex flex-col gap-2 text-sm">
            {[
              { token: 'bg', hex: '#16191D', desc: 'Fundo da aplicação', border: true },
              { token: 'surface', hex: '#1F2328', desc: 'Cards e painéis', border: true },
              { token: 'surface-2', hex: '#282D33', desc: 'Campos, trilhos, desabilitado' },
              { token: 'border', hex: '#363C44', desc: 'Bordas de 1 px' },
              { token: 'equip-on', hex: '#E7EAEE', desc: 'Texto, valores, equipamento ligado' },
              { token: 'text-muted', hex: '#9AA3AD', desc: 'Rótulos, unidades, "SEM DADOS"' },
              { token: 'text-dim', hex: '#6B7480', desc: 'Só botão desabilitado' },
              { token: 'equip-off', hex: '#4A515A', desc: 'Equipamento parado, tubo sem fluxo' },
              { token: 'alarm-crit', hex: '#F0616A', desc: 'Contorno e texto de alarme crítico' },
              { token: 'alarm-crit-fill', hex: '#B8322F', desc: 'Fundo crítico com texto branco' },
              { token: 'alarm-warn', hex: '#F5A524', desc: 'Aviso H/L (texto escuro por cima)' },
              { token: 'stop', hex: '#C93C3C', desc: 'Botões de PARADA' },
              { token: 'action / action-fill', hex: '#3B82F6 / #2F6FDB', desc: 'Setpoint, foco / botão de partida' },
              { token: 'flame', hex: '#FF8A3D', desc: 'Só o ícone da chama (Queimando)' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 h-10">
                <span className={`w-8 h-8 rounded shrink-0 ${c.border ? 'border border-tc-border' : ''}`} style={{ background: c.hex.split(' / ')[0] }}></span>
                <span className="font-semibold w-36">{c.token}</span>
                <span className="w-20 text-tc-text-muted tabular-nums">{c.hex}</span>
                <span className="text-tc-text-muted">{c.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* TEXTOS */}
        <Card title="Textos · Inter" className="h-auto overflow-y-auto min-w-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="title-page">Aquecedor 01</span>
              <span className="text-xs text-tc-text-muted">title-page · 20/28 · 700</span>
            </div>
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="title-card">Sequência do queimador</span>
              <span className="text-xs text-tc-text-muted">title-card · 16/24 · 600</span>
            </div>
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="flex items-baseline gap-1"><span className="value">72,4</span><span className="text-tc-text-muted">°C</span></span>
              <span className="text-xs text-tc-text-muted">value · 28/32 · 700 · tabular-nums</span>
            </div>
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="value-sm">Ligada · confirmada</span>
              <span className="text-xs text-tc-text-muted">value-sm · 16/20 · 600</span>
            </div>
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="body">Parada comandada pelo operador</span>
              <span className="text-xs text-tc-text-muted">body · 14/20 · 400</span>
            </div>
            <div className="flex flex-col gap-1 pb-4 border-b border-tc-surface-2">
              <span className="label text-tc-text-muted">TEMPERATURA (PT100)</span>
              <span className="text-xs text-tc-text-muted">label · 12/16 · 600 · CAIXA ALTA · 0.04em</span>
            </div>
            
            <h2 className="title-card mt-2">Números</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 tabular-nums text-sm">
              <span className="text-tc-text-muted">Temperatura</span><span className="font-semibold">72,4 °C</span>
              <span className="text-tc-text-muted">Pressão</span><span className="font-semibold">2,35 bar</span>
              <span className="text-tc-text-muted">Modulação</span><span className="font-semibold">46 %</span>
              <span className="text-tc-text-muted">GLP</span><span className="font-semibold">3.500 kg</span>
              <span className="text-tc-text-muted">Data e hora</span><span className="font-semibold">30/09/2026 14:05:12</span>
            </div>
          </div>
        </Card>

        {/* COMPONENTES */}
        <Card title="Componentes" className="h-auto overflow-y-auto min-w-0">
          <div className="flex flex-col gap-4">
            
            <span className="label text-tc-text-muted">VALOR · 4 ESTADOS DE QUALIDADE</span>
            <div className="grid grid-cols-4 gap-3">
              <ValueDisplay value={2.35} unit="bar" decimals={2} />
              <ValueDisplay value={0} quality="FAULT" />
              <ValueDisplay value={0} quality="NOT_MEASURED" />
              <ValueDisplay value={0} quality="COMM_LOST" />
            </div>

            <span className="label text-tc-text-muted mt-4">ESTADO DO EQUIPAMENTO</span>
            <div className="flex gap-2 flex-wrap">
              <StatusBadge state="ON" />
              <StatusBadge state="OFF" />
              <StatusBadge state="RUNNING" />
              <StatusBadge state="PURGE" />
              <StatusBadge state="WAIT_PUMP" />
              <StatusBadge state="POST_PURGE" />
              <StatusBadge state="LOCKOUT" />
              <StatusBadge state="FAULT" />
              <StatusBadge state="NO_DATA" />
            </div>

            <span className="label text-tc-text-muted mt-4">BOTÕES DE COMANDO</span>
            <div className="grid grid-cols-3 gap-3">
              <CommandButton label="PARAR" variant="stop" onClick={() => {}} />
              <CommandButton label="PARTIR" variant="start" onClick={() => {}} />
              <CommandButton 
                label="PARTIR" 
                variant="start" 
                disabled 
                blockReasonCode={"Sem comunicação com o controlador"} 
                onClick={() => {}} 
              />
              <CommandButton 
                label="PARTIR" 
                variant="start" 
                disabled 
                blockReasonCode={"Partida não permitida pelo controlador"} 
                onClick={() => {}} 
              />
            </div>

            <span className="label text-tc-text-muted mt-4">FAIXA DE ALARMES</span>
            <div className="flex flex-col gap-2">
              <AlarmStrip alarms={[{ id: '1', type: 'PRESS_SENSOR_FAULT', cleared: false, acked: false, timestamp: new Date().toISOString(), equipment: 'AQ02', severity: 'Danger', description: '' }]} canAck />
              <AlarmStrip alarms={[{ id: '2', type: 'PUMP_NOT_CONFIRMED', cleared: false, acked: false, timestamp: new Date().toISOString(), equipment: 'AQ02', severity: 'Warning', description: '' }]} canAck />
              <AlarmStrip alarms={[]} />
            </div>

            <span className="label text-tc-text-muted mt-4">COMUNICAÇÃO</span>
            <div className="flex gap-2 flex-wrap">
              <CommChip label="ESP32" state="OK" />
              <CommChip label="NOVUS AQ02" state="FALHA" />
              <CommChip label="SERVIDOR" state="SEM COMUNICAÇÃO" />
            </div>

            <span className="label text-tc-text-muted mt-4">BARRAS ANALÓGICAS</span>
            <div className="flex flex-col gap-4">
              <AnalogBar label="PRESSÃO DE ÁGUA" min={0} max={7} value={2.35} ll={1.0} l={1.5} h={5.5} hh={6.0} unit="bar" decimals={2} />
              <AnalogBar label="TEMPERATURA (PT100)" spLabel="Novus PV 72,1 °C · SP 75,0 °C" min={0} max={120} value={72.4} sp={75.0} h={85.0} hh={90.0} unit="°C" decimals={1} />
            </div>

            <span className="label text-tc-text-muted mt-4">PHASE STEPPER</span>
            <div className="flex flex-col gap-4">
              <PhaseStepper phase="RUNNING" />
              <PhaseStepper phase="LOCKOUT" />
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
};
