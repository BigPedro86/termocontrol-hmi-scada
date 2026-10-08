
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { HeaterState, TankState, GLPState, LogEntry, UserRole, AppSettings, Alarm, AllowedActions, CommandAck } from '@/types';
import { DeviceDriver, SystemState } from '@/services/DeviceDriver';
import { WebSocketDriver } from '@/services/WebSocketDriver';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PendingCommand {
  id: string;
  equipmentId: string;
  cmd: string;
  value: any;
  sentAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
}

export interface AuthUser {
  name: string;
  role: UserRole;
  token: string;
}

interface AppContextType {
  heaters: HeaterState[];
  tank: TankState;
  glp: GLPState;
  isOnline: boolean;
  pendingCommands: PendingCommand[];
  currentUser: AuthUser | null;
  logs: LogEntry[];
  settings: AppSettings;
  lastUpdate: string;
  lastUpdateTs: number | null;
  /** Ações permitidas pelo ESP32 (por equipamento) */
  allowedActions: AllowedActions;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  updateGLP: (updates: Partial<GLPState>) => void;
  sendCommand: (equipmentId: string, cmd: string, value: any, reason?: string) => Promise<boolean>;
  ackAlarms: () => void;
  setSettings: (settings: AppSettings) => void;
  activeAlarms: Alarm[];
  ackAlarm: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // S4: 30 minutos de inatividade

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [lastUpdateTs, setLastUpdateTs] = useState<number | null>(null);
  const [allowedActions, setAllowedActions] = useState<AllowedActions>({});

  const [settings, setLocalSettings] = useLocalStorage<AppSettings>('tc_settings', {
    protocol: 'WebSocket',
    endpoint: `ws://${typeof window !== 'undefined' ? (window.location.port === '5173' ? window.location.hostname + ':3000' : window.location.host) : 'localhost:3000'}`,
    updateInterval: 2000,
    supervisorOnly: true,
  });

  const [activeAlarms, setActiveAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const driverRef = useRef<DeviceDriver | null>(null);
  const [driver, setDriver] = useState<DeviceDriver | null>(null);

  // Estado default: heaters no novo formato
  const [heaters, setHeaters] = useState<HeaterState[]>([
    {
      id: 'AQ01', name: 'Aquecedor 01',
      burner: { phase: 'OFF', permission: false, requested: false, blockReasons: [], lockout: false, lockoutCount24h: 0, runHours: 0 },
      temp: { value: 0, quality: 'NOT_MEASURED' },
      press: { value: 0, quality: 'NOT_MEASURED' },
      novus: { commOk: false, pv: 0, sp: 0, mv: 0, auto: false, alarms: [false, false], quality: 'NOT_MEASURED' },
      pump: { cmd: false, fb: false },
      chainOk: false,
    },
    {
      id: 'AQ02', name: 'Aquecedor 02',
      burner: { phase: 'OFF', permission: false, requested: false, blockReasons: [], lockout: false, lockoutCount24h: 0, runHours: 0 },
      temp: { value: 0, quality: 'NOT_MEASURED' },
      press: { value: 0, quality: 'NOT_MEASURED' },
      novus: { commOk: false, pv: 0, sp: 0, mv: 0, auto: false, alarms: [false, false], quality: 'NOT_MEASURED' },
      pump: { cmd: false, fb: false },
      chainOk: false,
    },
  ]);
  const [tank, setTank] = useState<TankState>({
    id: 'TX01', name: 'Tanque de Expansão', levelNormal: true, pressureLow: false,
    pumpCmd: false, pumpFb: false, isAuto: true, isLatched: false,
  });
  const [glp, setGlp] = useState<GLPState>({
    currentLevelKg: 0, capacityKg: 8000, dailyConsumption: 0, readings: [], refills: [],
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingCommands, setPendingCommands] = useState<PendingCommand[]>([]);
  const pendingRef = useRef<PendingCommand[]>([]);
  pendingRef.current = pendingCommands;

  // S4: Timer de inatividade
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserRef = useRef<AuthUser | null>(null);
  currentUserRef.current = currentUser;

  // ─── Logging ─────────────────────────────────────────────────────────────

  const addLog = useCallback((
    type: LogEntry['type'],
    equipment: string,
    description: string,
    severity: LogEntry['severity'] = 'Info'
  ) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toLocaleString(),
      type, equipment, description,
      user: currentUserRef.current?.name || 'SYSTEM', severity,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 500));
  }, []);

  // ─── S4: Inatividade — só retira comandos, não desconecta ─────────────

  const doLogout = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setCurrentUser(null);
    // NÃO desconecta o driver — visualização continua sem login (regra 7)
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!currentUserRef.current) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      addLog('Login', 'System', '⏱ Sessão encerrada por inatividade (30 min)', 'Warning');
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [addLog, doLogout]);

  useEffect(() => {
    if (!currentUser) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [currentUser, resetIdleTimer]);

  // Carrega settings e alarmes do servidor ao fazer login
  useEffect(() => {
    if (!currentUser?.token) return;
    let httpUrl = settings.endpoint;
    if (!httpUrl.startsWith('ws://') && !httpUrl.startsWith('wss://') && !httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) httpUrl = `http://${httpUrl}`;
    httpUrl = httpUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/+$/, '');
    axios.get(`${httpUrl}/settings`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(res => {
         if (res.data && Object.keys(res.data).length > 0) {
             setLocalSettings(prev => ({ ...prev, ...res.data }));
         }
      })
      .catch(err => console.error('Erro ao carregar settings do servidor:', err));

    axios.get(`${httpUrl}/alarms`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(res => {
         if (res.data) setActiveAlarms(res.data);
      })
      .catch(err => console.error('Erro ao carregar alarmes:', err));

    const fetchLogs = () => {
      axios.get(`${httpUrl}/audit`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
        .then(res => {
          if (res.data) {
             setLogs(res.data.map((l: any) => ({
                id: l.id?.toString() || Date.now().toString(),
                timestamp: new Date(l.timestamp).toLocaleString(),
                equipment: l.target || 'System',
                type: l.target === 'System' ? 'Login' : 'Command',
                description: `${l.command} → ${l.value} (${l.result})`,
                user: l.username,
                severity: 'Info' as const
             })));
          }
        })
        .catch(err => console.error('Erro ao carregar auditoria:', err));
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);

  }, [currentUser?.token]);

  const setSettings = useCallback(async (newSettings: AppSettings) => {
      setLocalSettings(newSettings);
      if (currentUser?.token && currentUser.role === UserRole.ADMIN) {
          try {
             let httpUrl = newSettings.endpoint;
             if (!httpUrl.startsWith('ws://') && !httpUrl.startsWith('wss://') && !httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) httpUrl = `http://${httpUrl}`;
             httpUrl = httpUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/+$/, '');
             await axios.put(`${httpUrl}/settings`, newSettings, { headers: { Authorization: `Bearer ${currentUser.token}` }});
          } catch (e) {
             console.error('Erro ao salvar settings no servidor:', e);
          }
      }
  }, [currentUser, setLocalSettings]);

  // ─── Ack do ESP32 ─────────────────────────────────────────────────────────

  const handleAck = useCallback((ack: CommandAck) => {
    setPendingCommands(prev => prev.map(p => {
      if (p.id === ack.id) {
        addLog('Command', p.equipmentId,
          ack.accepted
            ? `✓ ESP32 aceitou: ${p.cmd}`
            : `✗ ESP32 recusou: ${p.cmd} — ${ack.reason || 'motivo desconhecido'}`,
          ack.accepted ? 'Info' : 'Warning'
        );
        return { ...p, status: ack.accepted ? 'accepted' as const : 'rejected' as const, reason: ack.reason };
      }
      return p;
    }));
    // Remove o comando pendente após 3s de feedback visual
    setTimeout(() => {
      setPendingCommands(prev => prev.filter(p => p.id !== ack.id));
    }, 3000);
  }, [addLog]);

  // ─── Driver lifecycle ─────────────────────────────────────────────────────

  useEffect(() => {
    driverRef.current?.disconnect();

    let newDriver: DeviceDriver;
    const token = currentUserRef.current?.token ?? '';
    newDriver = new WebSocketDriver(settings.endpoint, token);

    driverRef.current = newDriver;
    setDriver(newDriver);

    const handleOnline = () => {
      setIsOnline(true);
      addLog('Alarm', 'Sistema', 'ESP32 voltou online.', 'Info');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('Alarm', 'Sistema', '⚠ SEM COMUNICAÇÃO com o SERVIDOR!', 'Danger');
    };

    newDriver.connect(
      (state: Partial<SystemState>) => {
        setLastUpdate(new Date().toLocaleTimeString());
        setLastUpdateTs(Date.now());
        if (state.heaters) setHeaters(state.heaters as HeaterState[]);
        if (state.tank) setTank(state.tank as TankState);
        if (state.glp) setGlp(state.glp as GLPState);
        if (state.allowedActions) setAllowedActions(state.allowedActions);
        if (state.alarms) setActiveAlarms(state.alarms);
      },
      handleOnline,
      handleOffline,
      (data: any) => {
        if (data.type === 'ack') {
          handleAck(data as CommandAck);
        } else if (data.type === 'alarm_update') {
          setActiveAlarms(data.alarms || []);
        } else if (data.type === 'error') {
          addLog('Alarm', 'Sistema', data.message, 'Warning');
        }
      }
    );

    return () => newDriver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.endpoint, settings.protocol]);

  // ─── B2: Timeout de confirmação (fallback se o ack não chegar) ────────────

  useEffect(() => {
    if (pendingCommands.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      const timedOut = pendingCommands.filter(p => p.status === 'pending' && now - p.sentAt > 5000);
      timedOut.forEach(p =>
        addLog('Alarm', p.equipmentId, `⚠ Timeout: ${p.cmd} (sem ack em 5s)`, 'Warning')
      );
      if (timedOut.length > 0) setPendingCommands(prev => prev.filter(p => !(p.status === 'pending' && now - p.sentAt > 5000)));
    }, 5100);
    return () => clearTimeout(timer);
  }, [pendingCommands, addLog]);

  // ─── Auth (S1) ────────────────────────────────────────────────────────────

  const login = async (username: string, password: string): Promise<string | null> => {

    try {
      let httpUrl = settings.endpoint;
      if (!httpUrl.startsWith('ws://') && !httpUrl.startsWith('wss://') && !httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) {
        httpUrl = `http://${httpUrl}`;
      }
      httpUrl = httpUrl
        .replace(/^ws:\/\//, 'http://')
        .replace(/^wss:\/\//, 'https://')
        .replace(/\/+$/, '');

      const { data } = await axios.post(`${httpUrl}/auth/login`, { username, password });

      const authUser: AuthUser = {
        name: data.user.name,
        role: data.user.role as UserRole,
        token: data.token,
      };

      setCurrentUser(authUser);
      addLog('Login', 'System', `${username} autenticado como ${data.user.role}`);

      if (driverRef.current && driverRef.current instanceof WebSocketDriver) {
        (driverRef.current as WebSocketDriver).setToken(data.token);
      }

      return null;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Falha ao conectar ao servidor.';
      return msg;
    }
  };

  const logout = () => {
    addLog('Login', 'System', `${currentUser?.name} saiu do sistema`);
    doLogout();
  };

  // ─── State mutations ──────────────────────────────────────────────────────

  const updateGLP = (updates: Partial<GLPState>) => setGlp(prev => ({ ...prev, ...updates }));

  // ─── sendCommand ──────────────────────────────────────────────────────────

  const sendCommand = async (equipmentId: string, cmd: string, value: any, reason?: string): Promise<boolean> => {
    if (!currentUser) {
      // Sem login não pode enviar comandos
      return false;
    }
    if (settings.supervisorOnly && currentUser.role === UserRole.OPERATOR) {
      return false;
    }
    if (!driver) return false;

    addLog('Command', equipmentId, `${cmd} → ${value}${reason ? ` (Motivo: ${reason})` : ''}`);
    const success = await driver.sendCommand(equipmentId, cmd, value);

    if (success && !equipmentId.startsWith('GLP')) {
      const cmdId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      setPendingCommands(prev => [...prev, {
        id: cmdId, equipmentId, cmd, value, sentAt: Date.now(), status: 'pending',
      }]);
    }
    return success;
  };

  const ackAlarms = useCallback(() => {
    // Reconhece todos os alarmes não reconhecidos via REST
    if (!currentUser?.token) return;
    let httpUrl = settings.endpoint;
    if (!httpUrl.startsWith('ws://') && !httpUrl.startsWith('wss://') && !httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) httpUrl = `http://${httpUrl}`;
    httpUrl = httpUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/+$/, '');
    activeAlarms.filter(a => !a.acked).forEach(a => {
      axios.post(`${httpUrl}/alarms/${a.id}/ack`, {}, { headers: { Authorization: `Bearer ${currentUser.token}` } })
        .catch(e => console.error('Erro ao confirmar alarme:', e));
    });
  }, [currentUser?.token, settings, activeAlarms]);

  const ackAlarm = useCallback(async (id: string) => {
    if (!currentUser?.token) return;
    let httpUrl = settings.endpoint;
    if (!httpUrl.startsWith('ws://') && !httpUrl.startsWith('wss://') && !httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) httpUrl = `http://${httpUrl}`;
    httpUrl = httpUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/+$/, '');
    try {
        await axios.post(`${httpUrl}/alarms/${id}/ack`, {}, { headers: { Authorization: `Bearer ${currentUser.token}` } });
    } catch (e) {
        console.error('Erro ao confirmar alarme:', e);
    }
  }, [currentUser?.token, settings.endpoint]);

  // ─── A2: Notificação Sonora (Web Audio API) — funciona SEM login ──────────

  useEffect(() => {
    const hasUnacked = activeAlarms.some(a => !a.acked);
    let intervalId: any;
    let audioCtx: AudioContext | null = null;

    if (hasUnacked) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      };

      intervalId = setInterval(playBeep, 1000);
      playBeep();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) audioCtx.close();
    };
  }, [activeAlarms]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      heaters, tank, glp,
      isOnline, pendingCommands,
      currentUser, logs, settings, lastUpdate, lastUpdateTs, activeAlarms, allowedActions,
      login, logout,
      updateGLP,
      sendCommand, ackAlarms, ackAlarm, setSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
