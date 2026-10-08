
export enum UserRole {
  OPERATOR = 'Operator',
  SUPERVISOR = 'Supervisor',
  MAINTENANCE = 'Maintenance',
  ADMIN = 'Admin'
}

// ─── Qualidade de medição (firmware → IHM) ─────────────────────────────────
export type MeasurementQuality = 'OK' | 'FAULT' | 'NOT_MEASURED' | 'COMM_LOST';

/** Rótulo de exibição para qualidade diferente de OK */
export function qualityLabel(q: MeasurementQuality | undefined): string | null {
  switch (q) {
    case 'FAULT':        return 'FALHA';
    case 'NOT_MEASURED': return 'N/M';
    case 'COMM_LOST':    return 'SEM COM.';
    default:             return null;   // OK → mostrar o número
  }
}

// ─── Fases do queimador (deduzidas de FAN, GAS_VALVES, LOCKOUT) ────────────
export type BurnerPhase = 'OFF' | 'WAIT_PUMP' | 'STANDBY' | 'PURGE' | 'RUNNING' | 'POST_PURGE' | 'LOCKOUT';

export const BURNER_PHASE_LABEL: Record<BurnerPhase, string> = {
  OFF:        'Parado',
  WAIT_PUMP:  'Aguardando Bomba',
  STANDBY:    'Em espera',
  PURGE:      'Purga',
  RUNNING:    'Queimando',
  POST_PURGE: 'Pós-purga',
  LOCKOUT:    'BLOQUEIO — Rearme Local',
};

// ─── Modelo do queimador ────────────────────────────────────────────────────
export interface BurnerState {
  phase: BurnerPhase;
  phaseTime_s: number;
  starts: number;
  permission: boolean;
  requested: boolean;
  blockReasons: string[];
  lockout: boolean;
  lockoutCount24h: number;
  runHours: number;
}

// ─── Modelo do Novus ────────────────────────────────────────────────────────
export interface NovusState {
  commOk: boolean;
  pv: number;
  sp: number;
  mv: number;
  auto: boolean;
  alarms: boolean[];
  quality: MeasurementQuality;
}

// ─── Modelo de medição com qualidade ────────────────────────────────────────
export interface Measurement {
  value: number;
  quality: MeasurementQuality;
}

// ─── Aquecedor (novo protocolo ESP32) ───────────────────────────────────────
export interface HeaterState {
  id: string;
  name: string;
  burner: BurnerState;
  temp: Measurement;
  press: Measurement;
  novus: NovusState;
  pump: { cmd: boolean; fb: boolean; fault: boolean };
  io: { 
    lockoutS: boolean; 
    gasValves: boolean; 
    fan: boolean; 
    chainOk: boolean; 
    pumpFb: boolean; 
    permOut: boolean; 
    pumpOut: boolean; 
    pressmA: number; 
  };
  chainOk: boolean;
}

// ─── Tanque de Expansão ─────────────────────────────────────────────────────
export interface TankState {
  id: string;
  levelNormal: boolean;
  pressureLow: boolean;
  pumpCmd: boolean;
  pumpFb: boolean;
  isAuto: boolean;
  isLatched: boolean;
  lowLevelLatched: boolean;
  timeoutLatched: boolean;
  pumpFault: boolean;
  startsLastHour: number;
  name?: string;
}

// ─── GLP (gerido pelo servidor) ─────────────────────────────────────────────
export interface GLPState {
  currentLevelKg: number;
  capacityKg: number;
  dailyConsumption: number;
  readings: { date: string; level: number }[];
  refills: { date: string; quantity: number }[];
}

// ─── Alarme (vem do ESP32 → servidor → IHM) ────────────────────────────────
export interface Alarm {
  id: string;
  equipment: string;
  type: string;
  description: string;
  severity: 'Warning' | 'Danger' | 'Info';
  timestamp: string;
  cleared: boolean;
  clearedAt?: string;
  acked: boolean;
  ackedBy?: string;
  ackedAt?: string;
}

// ─── Ack do ESP32 ───────────────────────────────────────────────────────────
export interface CommandAck {
  id: string;
  accepted: boolean;
  reason?: string;
}

// ─── allowedActions (ESP32 envia por equipamento) ───────────────────────────
export type AllowedActions = Record<string, string[]>;

// ─── Log de evento (sessão local) ───────────────────────────────────────────
export interface LogEntry {
  id: string;
  timestamp: string;
  equipment: string;
  type: 'Command' | 'Alarm' | 'Setpoint' | 'Login';
  description: string;
  user: string;
  severity: 'Info' | 'Warning' | 'Danger';
}

// ─── Settings ───────────────────────────────────────────────────────────────
export interface AppSettings {
  protocol: 'REST' | 'WebSocket' | 'MQTT';
  endpoint: string;
  updateInterval: number;
  supervisorOnly: boolean;
  theme?: 'light' | 'dark';
  useSimulation?: boolean;
}
