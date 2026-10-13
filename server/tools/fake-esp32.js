const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Segredo e porta vêm do server/.env (nunca fixos no código — regra 11)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const secret = process.env.DEVICE_SECRET;
if (!secret) { console.error('DEVICE_SECRET não definido em server/.env'); process.exit(1); }
const port = process.env.PORT || 3000;
const host = process.env.FAKE_HOST || 'localhost';
const url = `ws://${host}:${port}/?device=true&secret=${encodeURIComponent(secret)}`;

const contratoPath = path.join(__dirname, '../../docs/protocolo/state.exemplo.json');
let payload = JSON.parse(fs.readFileSync(contratoPath, 'utf8'));

// State variables
let phaseTime = 0;
let phase = 'OFF';
let requested = false;
let lflLockout = false;
let noNovus = false;
let pt100Open = false;
let lowLevel = false;
let emergency = false;
let pumpWait = 0;
let postPurgeTimer = 0;

let ws;
function connect() {
  ws = new WebSocket(url);
  ws.on('error', () => console.log('Servidor indisponível, tentando de novo em 2 s...'));
  ws.on('open', () => {
    console.log('Fake ESP32 conectado.');
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'command') {
        console.log(`Comando recebido: ID=${msg.id} Target=${msg.target} CMD=${msg.command} Value=${msg.value}`);
        let accepted = false;
        let reason = 'INVALID_COMMAND';

        if (msg.target === 'AQ01') {
          if (msg.command === 'BURNER_START') {
            if (emergency || lowLevel || lflLockout || pt100Open) {
               reason = 'CONDITION_STILL_ACTIVE';
            } else {
               requested = true;
               if (phase === 'OFF') {
                   phase = 'WAIT_PUMP';
                   pumpWait = 0;
                   phaseTime = 0;
               }
               accepted = true;
               reason = 'START_ACCEPTED';
            }
          } else if (msg.command === 'BURNER_STOP' || msg.command === 'PUMP_STOP') {
            // Como no firmware: PUMP_STOP também retira o queimador
            requested = false;
            if (phase !== 'OFF' && phase !== 'POST_PURGE') {
                phase = 'POST_PURGE';
                phaseTime = 0;
            }
            accepted = true;
            reason = 'STOP_EXECUTED';
          } else if (msg.command === 'ALARM_ACK') {
            accepted = true;
            reason = 'ACK_EXECUTED';
          } else if (msg.command === 'FAULT_RESET') {
            accepted = true;
            reason = 'RESET_EXECUTED';
          }
        } else if (msg.target === 'TX01') {
           if (msg.command === 'TANK_LEVEL_RESET') {
               accepted = true;
               reason = 'RESET_EXECUTED';
           }
        } else if (msg.target === 'SYS') {
            if (msg.command === 'ALARM_ACK' || msg.command === 'ALARM_SILENCE') {
                accepted = true;
                reason = 'ACK_EXECUTED';
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
  payload.seq = Date.now();
  payload.uptime_s = Math.floor(process.uptime());
  
  const isSensorFault = process.argv.includes('--sensor-fault') || pt100Open;
  const isLowLevel = process.argv.includes('--low-level') || lowLevel;
  const isNoNovus = process.argv.includes('--no-novus') || noNovus;

  // Lógica da Sequência
  if (emergency || isLowLevel || lflLockout || isSensorFault) {
      if (phase !== 'OFF' && phase !== 'POST_PURGE') {
          phase = 'POST_PURGE';
          phaseTime = 0;
          requested = false;
      }
  }

  if (phase === 'WAIT_PUMP') {
      phaseTime++;
      if (phaseTime >= 10) {
          phase = 'STANDBY';
          phaseTime = 0;
      }
  } else if (phase === 'STANDBY') {
      phaseTime++;
      if (phaseTime >= 2) {
          phase = 'PURGE';
          phaseTime = 0;
      }
  } else if (phase === 'PURGE') {
      phaseTime++;
      if (phaseTime >= 34) {
          phase = 'RUNNING';
          phaseTime = 0;
      }
  } else if (phase === 'RUNNING') {
      phaseTime++;
  } else if (phase === 'POST_PURGE') {
      phaseTime++;
      if (phaseTime >= 18) {
          phase = 'OFF';
          phaseTime = 0;
      }
  } else {
      phaseTime = 0;
  }

  const h = payload.heaters[0];
  h.burner.phase = phase;
  h.burner.phaseTime_s = phaseTime;
  h.burner.requested = requested;
  h.burner.permission = (phase === 'STANDBY' || phase === 'PURGE' || phase === 'RUNNING');
  
  h.io.permOut = h.burner.permission;
  h.io.fan = (phase === 'PURGE' || phase === 'RUNNING' || phase === 'POST_PURGE');
  h.io.gasValves = (phase === 'RUNNING');
  h.io.pumpCmd = (phase !== 'OFF' || requested);
  h.io.pumpFb = h.io.pumpCmd;

  h.burner.blockReasons = [];
  payload.allowedActions['AQ01'] = [];
  if (phase === 'OFF' && !requested) {
      payload.allowedActions['AQ01'].push('BURNER_START');
  } else if (requested || phase !== 'OFF') {
      payload.allowedActions['AQ01'].push('BURNER_STOP');
  }
  // Paradas sempre oferecidas (regra 2), como no firmware
  if (!payload.allowedActions['AQ01'].includes('BURNER_STOP')) payload.allowedActions['AQ01'].push('BURNER_STOP');
  payload.allowedActions['AQ01'].push('PUMP_STOP');

  if (emergency) h.burner.blockReasons.push('ESTOP_PRESSED');
  if (lflLockout) h.burner.blockReasons.push('LFL_LOCKOUT');
  if (isLowLevel) h.burner.blockReasons.push('TANK_LOW_LEVEL');
  if (isSensorFault) h.burner.blockReasons.push('TEMP_SENSOR_FAULT');

  // Alarmes dinâmicos
  payload.alarms = [];
  const al = (code, description, severity = 'C') =>
    payload.alarms.push({ code, description, severity, active: true, acked: false, since: payload.uptime_s });
  if (isLowLevel) al('TX01_LOW_LEVEL', 'Nível baixo no tanque de expansão — sistema parado');
  if (lflLockout) al('AQ01_LFL_LOCKOUT', 'Bloqueio do programador de chama');
  if (isSensorFault) al('AQ01_TEMP_SENSOR_FAULT', 'Falha no sensor de temperatura');
  if (isNoNovus) al('AQ01_NOVUS_COMM_LOST', 'Perda de comunicação com Modbus', 'H');

  if (isNoNovus) {
    h.novus.commOk = false;
    h.novus.quality = 'COMM_LOST';
    h.novus.pv = null;
    h.novus.sp = null;
    h.novus.mv = null;
  } else {
    h.novus.commOk = true;
    h.novus.quality = 'OK';
    h.novus.pv = 65.0;
    h.novus.sp = 70.0;
    h.novus.mv = phase === 'RUNNING' ? 80.0 : 0.0;
  }

  if (isSensorFault) {
    h.temp.quality = 'FAULT';
    h.temp.value = null;
  } else {
    h.temp.quality = 'OK';
    h.temp.value = 65.5;
  }
  
  if (isLowLevel) {
      payload.tank.levelNormal = false;
  } else {
      payload.tank.levelNormal = true;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

connect();
setInterval(sendState, 1000);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Comandos: L (LFL Lockout), R (LFL Reset), N (Toggle Novus), P (Toggle PT100), T (Toggle Tank), E (Toggle Emergencia), Q (Sair)');
rl.on('line', (line) => {
  const key = line.trim().toUpperCase();
  switch(key) {
    case 'L': lflLockout = true; console.log('>> LFL Bloqueado'); break;
    case 'R': lflLockout = false; console.log('>> LFL Resetado'); break;
    case 'N': noNovus = !noNovus; console.log('>> Novus Comm: ' + !noNovus); break;
    case 'P': pt100Open = !pt100Open; console.log('>> PT100 Aberto: ' + pt100Open); break;
    case 'T': lowLevel = !lowLevel; console.log('>> Tank Low Level: ' + lowLevel); break;
    case 'E': emergency = !emergency; console.log('>> Emergencia: ' + emergency); break;
    case 'Q': process.exit(0); break;
  }
});
