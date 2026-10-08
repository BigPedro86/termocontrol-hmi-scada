const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const secret = 'esp32_termocontrol_device_secret_2024';
const url = `ws://localhost:3000/?device=true&secret=${secret}`;

const contratoPath = path.join(__dirname, '../../docs/protocolo/state.exemplo.json');
let payload = JSON.parse(fs.readFileSync(contratoPath, 'utf8'));

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
        console.log(`Comando recebido: ID=${msg.id} Target=${msg.target} CMD=${msg.command} Value=${msg.value}`);
        let accepted = false;
        let reason = 'INVALID_COMMAND';

        if (msg.target === 'AQ01') {
          const h = payload.heaters.find(h => h.id === 'AQ01');
          if (msg.command === 'BURNER_START') {
            h.burner.requested = true;
            h.burner.phase = 'RUNNING';
            accepted = true;
            reason = 'START_ACCEPTED';
          } else if (msg.command === 'BURNER_STOP') {
            h.burner.requested = false;
            h.burner.permission = false;
            h.burner.phase = 'OFF';
            accepted = true;
            reason = 'STOP_EXECUTED';
          }
        }

        ws.send(JSON.stringify({
          type: 'ack',
          id: msg.id,
          accepted,
          reason
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

  // Atualiza campos dinâmicos básicos
  payload.seq = Date.now();
  payload.uptime_s = Math.floor(process.uptime());

  // Aplica simulações (opcionais, com base nas flags de linha de comando)
  if (isLowLevel) {
    payload.tank.levelNormal = false;
    payload.alarms.push({ code: 'LEVEL_LL', severity: 'H', active: true, acked: false, since: payload.uptime_s });
    if (payload.heaters[0]) {
      payload.heaters[0].burner.phase = 'OFF';
      payload.heaters[0].burner.permission = false;
      if (!payload.heaters[0].burner.blockReasons.includes('TANK_LOW_LEVEL')) {
          payload.heaters[0].burner.blockReasons.push('TANK_LOW_LEVEL');
      }
      payload.heaters[0].io.permOut = false;
      payload.heaters[0].io.gasValves = false;
      payload.heaters[0].io.fan = false;
    }
    payload.allowedActions['AQ01'] = [];
  }

  if (isSensorFault) {
    if (payload.heaters[0]) {
      payload.heaters[0].temp.quality = 'FAULT';
      payload.heaters[0].temp.value = null;
      payload.heaters[0].burner.phase = 'OFF';
      payload.heaters[0].burner.permission = false;
      if (!payload.heaters[0].burner.blockReasons.includes('TEMP_SENSOR_FAULT')) {
          payload.heaters[0].burner.blockReasons.push('TEMP_SENSOR_FAULT');
      }
    }
    payload.alarms.push({ code: 'TEMP_H', severity: 'H', active: true, acked: false, since: payload.uptime_s });
  }

  if (noNovus && payload.heaters[0]) {
    payload.heaters[0].novus.commOk = false;
    payload.heaters[0].novus.quality = 'COMM_LOST';
    payload.heaters[0].novus.pv = null;
    payload.heaters[0].novus.sp = null;
    payload.heaters[0].novus.mv = null;
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload)); // O JSON já possui "type": "state" na raiz
  }
}

connect();;
