import { HeaterState, TankState, GLPState, AllowedActions, CommandAck, Alarm } from '@/types';

export interface SystemState {
  heaters: HeaterState[];
  tank: TankState;
  glp: GLPState;
  /** Ações permitidas por equipamento, vindas do ESP32 */
  allowedActions?: AllowedActions;
  /** Alarmes ativos vindos do ESP32 */
  alarms?: Alarm[];
}

export interface DeviceDriver {
  /**
   * Conecta ao dispositivo.
   * @param onStateChange  Chamado quando o servidor envia um state atualizado.
   * @param onOnline       Chamado quando o dispositivo (ESP32) vai online.
   * @param onOffline      Chamado quando o dispositivo (ESP32) vai offline (B1).
   * @param onRawMessage   Chamado para mensagens brutas (ack, error, alarm_update).
   */
  connect(
    onStateChange: (state: Partial<SystemState>) => void,
    onOnline?: () => void,
    onOffline?: () => void,
    onRawMessage?: (data: any) => void
  ): void;

  disconnect(): void;
  sendCommand(equipmentId: string, cmd: string, value: any): Promise<boolean>;
  updateSettings(settings: any): void;
}
