import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, RefreshCcw, Link2, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { Card } from '../components/ui/Card';
import { CommandButton } from '../components/ui/CommandButton';

const Settings: React.FC = () => {
  const { settings, setSettings, currentUser } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const defaultSettings: AppSettings = {
    protocol: 'WebSocket',
    endpoint: `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}`,
    updateInterval: 2000,
    supervisorOnly: true,
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSaving(false);
    setSaveSuccess(true);

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRestore = () => {
    if (window.confirm("Deseja restaurar todas as configurações para os padrões de fábrica?")) {
      setSettings(defaultSettings);
      setSaveSuccess(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="title-page m-0 text-tc-text uppercase">Configurações de Sistema</h1>
          <p className="body text-tc-text-muted mt-1">Parâmetros de comunicação e restrições de operação.</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-tc-equip-on text-tc-bg rounded font-bold animate-bounce border border-tc-border">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Configurações salvas com sucesso!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="COMUNICAÇÃO" icon={<Link2 className="w-5 h-5 text-tc-text-muted" />}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="label text-tc-text-muted block mb-1">PROTOCOLO DE DADOS</label>
              <select
                value={settings.protocol}
                onChange={(e) => handleChange('protocol', e.target.value)}
                className="w-full bg-tc-surface-2 border border-tc-border rounded p-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
              >
                <option value="WebSocket">WebSocket (Real-time)</option>
                <option value="MQTT">MQTT (Broker)</option>
                <option value="REST">HTTP/REST (Polling)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label text-tc-text-muted block mb-1">ENDPOINT DO ESP32</label>
              <input
                type="text"
                value={settings.endpoint}
                onChange={(e) => handleChange('endpoint', e.target.value)}
                className="w-full bg-tc-surface-2 border border-tc-border rounded p-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
                placeholder="ws://ip-do-dispositivo/ws"
              />
            </div>

            <div className="space-y-2">
              <label className="label text-tc-text-muted block mb-1">TAXA DE ATUALIZAÇÃO (MS)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={settings.updateInterval}
                  onChange={(e) => handleChange('updateInterval', Number(e.target.value))}
                  className="flex-1 h-2 bg-tc-surface-2 rounded appearance-none cursor-pointer"
                />
                <span className="w-20 text-right font-bold text-tc-text bg-tc-surface-2 px-3 py-1 rounded border border-tc-border">{settings.updateInterval}ms</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="LIMITES E SEGURANÇA" icon={<Shield className="w-5 h-5 text-tc-text-muted" />}>
          <div className="space-y-4">
            <div className="p-4 bg-tc-alarm-warn text-tc-bg rounded border border-tc-border">
              <p className="text-xs font-bold m-0">Limites de setpoint e alarmes são configurados diretamente no ESP32 (NVS) pelo perfil Admin.</p>
            </div>

            <div className="p-4 bg-tc-surface-2 rounded border border-tc-border flex items-center justify-between transition-colors">
              <div>
                <span className="block text-sm font-bold text-tc-text">Trava de Supervisão</span>
                <span className="label text-tc-text-muted">Apenas supervisor altera setpoints e comanda</span>
              </div>
              <button
                onClick={() => handleChange('supervisorOnly', !settings.supervisorOnly)}
                className={`w-12 h-6 rounded-full transition-all relative border-0 cursor-pointer ${settings.supervisorOnly ? 'bg-tc-action' : 'bg-tc-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-tc-text rounded-full transition-all ${settings.supervisorOnly ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <button
          onClick={handleRestore}
          className="px-8 py-4 bg-tc-surface border border-tc-border text-tc-text font-bold rounded cursor-pointer hover:bg-tc-surface-2 flex items-center justify-center gap-2 transition-all"
        >
          <RefreshCcw className="w-5 h-5" />
          RESTAURAR PADRÕES
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-12 py-4 bg-tc-action-fill text-white font-bold rounded cursor-pointer hover:opacity-90 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
