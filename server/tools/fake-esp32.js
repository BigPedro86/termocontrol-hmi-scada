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
          payload: {
            id: msg.payload.id,
            accepted: true
          }
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
    heaters: [
      {
        id: 'AQ01',
        name: 'Aquecedor 01',
        burner: {
          phase: (isLowLevel || isSensorFault) ? 'OFF' : 'RUNNING',
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
          value: isSensorFault ? 0 : 85.0,
          quality: isSensorFault ? 'FAULT' : 'OK'
        },
        press: {
          value: 3.5,
          quality: 'OK'
        },
        novus: {
          commOk: !noNovus,
          pv: noNovus ? 0 : 85.0,
          sp: noNovus ? 0 : 80.0,
          mv: noNovus ? 0 : 45.0,
          auto: true,
          alarms: [false, false],
          quality: noNovus ? 'COMM_LOST' : 'OK'
        },
        pump: {
          cmd: true,
          fb: true
        },
        chainOk: true
      },
      {
        id: 'AQ02',
        name: 'Aquecedor 02',
        burner: {
          phase: 'OFF',
          permission: false,
          requested: false,
          blockReasons: [
            ...(isLowLevel ? ['TANK_LOW_LEVEL'] : []),
            'Parada comandada pelo operador', 'Falha no sensor de pressão', 'Bomba sem confirmação de funcionamento'
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
          value: 0,
          quality: 'FAULT'
        },
        novus: {
          commOk: false,
          pv: 0,
          sp: 0,
          mv: 0,
          auto: true,
          alarms: [false, false],
          quality: 'COMM_LOST'
        },
        pump: {
          cmd: false,
          fb: false
        },
        chainOk: false
      }
    ],
    tank: {
      levelNormal: !isLowLevel,
      pressureLow: false,
      pumpCmd: false,
      pumpFb: false,
      isAuto: true,
      isLatched: false
    },
    alarms: [
      ...(isSensorFault ? [{ id: 'alm_sensor_aq01', equipment: 'AQ01', type: 'SensorFault', description: 'Falha no sensor de temperatura', severity: 'Danger', timestamp: new Date().toISOString(), cleared: false, acked: false }] : []),
      ...(isLowLevel ? [{ id: 'alm_tank_low', equipment: 'TX01', type: 'LowLevel', description: 'Nível baixo detectado', severity: 'Danger', timestamp: new Date().toISOString(), cleared: false, acked: false }] : []),
      { id: 'alm_press_aq02', equipment: 'AQ02', type: 'SensorFault', description: 'Falha no sensor de pressão', severity: 'Danger', timestamp: new Date().toISOString(), cleared: false, acked: false },
      { id: 'alm_novus_aq02', equipment: 'AQ02', type: 'CommLoss', description: 'Sem comunicação com o Novus', severity: 'Warning', timestamp: new Date(Date.now() - 261000).toISOString(), cleared: false, acked: true }
    ],
    allowedActions: {
      'AQ01': isLowLevel ? [] : ['BURNER_START', 'BURNER_STOP', 'PUMP_START', 'PUMP_STOP'],
      'TX01': ['TX01_PUMP_STOP', 'TX01_AUTO', 'TANK_LEVEL_RESET']
    }
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'state', ...payload }));
  }
}

connect();
