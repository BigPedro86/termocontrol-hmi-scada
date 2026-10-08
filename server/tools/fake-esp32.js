const WebSocket = require('ws');

const secret = 'esp32_termocontrol_device_secret_2024';
const url = `ws://localhost:3000/?device=true&secret=${secret}`;

let ws;
function connect() {
  ws = new WebSocket(url);
  ws.on('open', () => {
    console.log('Fake ESP32 conectado.');
    setInterval(sendState, 1000);
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'command') {
        console.log('Comando recebido:', msg);
        // Simulando ack automático aceitando tudo
        ws.send(JSON.stringify({
          type: 'ack',
          id: msg.id,
          accepted: true,
          reason: 'OK'
        }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    console.log('Desconectado. Tentando reconectar...');
    setTimeout(connect, 2000);
  });
}

function sendState() {
  const isSensorFault = process.argv.includes('--sensor-fault');
  const isLowLevel = process.argv.includes('--low-level');
  const noNovus = process.argv.includes('--no-novus');

  const payload = {
    seq: Date.now(),
    uptime_s: Math.floor(process.uptime()),
    estopOk: true,
    buzzer: { on: false, silenced: false },
    heaters: [
      {
        id: 'AQ01',
        name: 'Aquecedor 01',
        burner: {
          phase: (isLowLevel || isSensorFault) ? 'OFF' : 'RUNNING',
          phaseTime_s: 45,
          starts: 12,
          permission: !(isLowLevel || isSensorFault),
          requested: true,
          blockReasons: [
            ...(isLowLevel ? ['TANK_LOW_LEVEL'] : []),
            ...(isSensorFault ? ['TEMP_SENSOR_FAULT'] : [])
          ],
          lockout: false,
          lockoutCount24h: 0,
          runHours: 120
        },
        temp: {
          value: isSensorFault ? null : 85.0,
          quality: isSensorFault ? 'FAULT' : 'OK'
        },
        press: {
          value: 3.5,
          quality: 'OK'
        },
        novus: {
          commOk: !noNovus,
          pv: noNovus ? null : 85.0,
          sp: noNovus ? null : 80.0,
          mv: noNovus ? null : 45.0,
          auto: true,
          alarms: [false, false],
          quality: noNovus ? 'COMM_LOST' : 'OK'
        },
        pump: {
          cmd: true,
          fb: true,
          fault: false
        },
        io: { lockoutS: false, gasValves: !(isLowLevel || isSensorFault), fan: !(isLowLevel || isSensorFault), chainOk: true, pumpFb: true, permOut: !(isLowLevel || isSensorFault), pumpOut: true, pressmA: 12.0 },
        chainOk: true
      },
      {
        id: 'AQ02',
        name: 'Aquecedor 02',
        burner: {
          phase: 'OFF',
          phaseTime_s: 0,
          starts: 5,
          permission: false,
          requested: false,
          blockReasons: [
            ...(isLowLevel ? ['TANK_LOW_LEVEL'] : []),
            'Parada comandada pelo operador', 'PUMP_FAULT'
          ],
          lockout: false,
          lockoutCount24h: 1,
          runHours: 3.1
        },
        temp: {
          value: 41.8,
          quality: 'OK'
        },
        press: {
          value: null,
          quality: 'FAULT'
        },
        novus: {
          commOk: false,
          pv: null,
          sp: null,
          mv: null,
          auto: true,
          alarms: [false, false],
          quality: 'COMM_LOST'
        },
        pump: {
          cmd: false,
          fb: false,
          fault: true
        },
        io: { lockoutS: false, gasValves: false, fan: false, chainOk: false, pumpFb: false, permOut: false, pumpOut: false, pressmA: 3.0 },
        chainOk: false
      }
    ],
    tank: {
      levelNormal: !isLowLevel,
      pressureLow: false,
      pumpCmd: false,
      pumpFb: false,
      isAuto: true,
      isLatched: false,
      lowLevelLatched: false,
      timeoutLatched: false,
      pumpFault: false,
      startsLastHour: 0
    },
    alarms: [
      ...(isSensorFault ? [{ code: 'TEMP_H', severity: 'H', active: true, acked: false, since: Math.floor(process.uptime()) }] : []),
      ...(isLowLevel ? [{ code: 'LEVEL_LL', severity: 'H', active: true, acked: false, since: Math.floor(process.uptime()) }] : [])
    ],
    allowedActions: {
      'AQ01': isLowLevel ? [] : ['BURNER_START', 'BURNER_STOP', 'PUMP_START', 'PUMP_STOP', 'FAULT_RESET'],
      'TX01': ['TX01_PUMP_STOP', 'TX01_AUTO', 'TANK_LEVEL_RESET'],
      'SYS': ['ALARM_SILENCE', 'ALARM_ACK']
    }
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'state', ...payload }));
  }
}

connect();
