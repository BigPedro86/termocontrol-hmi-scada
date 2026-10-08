export const TRANSLATIONS: Record<string, string> = {
  STOP_COMMANDED: 'Parada comandada pelo operador',
  SAFETY_CHAIN_OPEN: 'Cadeia de segurança aberta',
  PUMP_NOT_CONFIRMED: 'Bomba sem confirmação de funcionamento',
  LFL_LOCKOUT: 'Queimador em bloqueio — rearme no local',
  SW_TEMP_LIMIT_LATCHED: 'Limite de temperatura atuado — rearme necessário',
  TEMP_SENSOR_FAULT: 'Falha no sensor de temperatura',
  PRESS_SENSOR_FAULT: 'Falha no sensor de pressão',
  PRESSURE_OUT_OF_RANGE: 'Pressão fora da faixa',
  ESTOP_PRESSED: 'Emergência acionada',
  TANK_LOW_LEVEL: 'Nível baixo no tanque de expansão',
  TANK_LEVEL_STILL_LOW: 'Nível de água ainda está baixo',
  TANK_NOT_AUTOMATIC: 'Tanque não está em modo automático',
  STANDBY: 'Em espera',
  NO_PUMP_FLOW: 'Ausência de fluxo da bomba',
  DISCREPANCY_GAS_WITHOUT_FAN: 'Discrepância: Gás atuado sem ventilação',
  SERVER_LOST: 'Perda de conexão com o servidor SCADA',
  PUMP_FAULT: 'Falha na bomba',
};

export function t(code?: string): string {
  if (!code) return '';
  return TRANSLATIONS[code] || code;
}
