# Protocolo TermoControl (ESP32 <-> Servidor)

## 1. Estado (`state`)
Publicado periodicamente pelo ESP32 (ex: 1s). Formato PLANO (sem envelope "payload").

Ver: [state.exemplo.json](protocolo/state.exemplo.json)

Novos campos incluídos:
- `buzzer`: `{ "on": false, "silenced": false }` no nível de topo.
- `burner.phase`: Fases em string (`OFF`, `WAIT_PUMP`, `STANDBY`, `PURGE`, `RUNNING`, `POST_PURGE`, `LOCKOUT`). `STANDBY` = permissão concedida, esperando TL fechar a malha no LFL.
- `burner.phaseTime_s`, `burner.starts`
- `io`: Sinais físicos crus para comissionamento (`lockoutS`, `gasValves`, `fan`, `chainOk`, `pumpFb`, `permOut`, `pumpOut`, `pressmA`).
- `pump`: `{ "cmd": true, "fb": true, "fault": false }`
- `novus`: `{ "commOk": true, "pv": 71.0, "sp": 72.0, "mv": 45.0, "auto": true, "alarms": [false, false], "quality": "OK" }`
- `tank`: Sinais físicos reais expandidos (`levelNormal`, `pressureLow`, `pumpCmd`, `pumpFb`, `isAuto`, `isLatched`, `lowLevelLatched`, `timeoutLatched`, `pumpFault`, `startsLastHour`).
- `alarms`: `[ { "code": "TEMP_H", "severity": "H", "active": true, "acked": false, "since": 12345 } ]`
- `allowedActions`: Matriz pré-calculada estendida para aquecedores, tanque e sistema (ex: `{ "AQ01": ["BURNER_STOP", "PUMP_STOP"], "TX01": ["TX01_PUMP_STOP"], "SYS": ["ALARM_SILENCE", "ALARM_ACK"] }`).

### Qualidade de Medição (Quality)
* `OK`: Leitura válida
* `FAULT`: Erro de hardware do sensor
* `NOT_MEASURED`: Sensor ausente na configuração
* `COMM_LOST`: Falha de comunicação (ex: Modbus/Servidor). Ao iniciar, ou ao perder a comunicação, a qualidade fica em `COMM_LOST` e o valor numérico nulo (`null`).

### Motivos de Bloqueio (blockReasons) e Erros Comuns
- `NOT_REQUESTED`, `CHAIN_NOT_OK`, `ESTOP_PRESSED`, `LFL_LOCKOUT`, `MAX_LOCKOUTS_24H`
- `TEMP_SENSOR_FAULT`, `PRESS_SENSOR_FAULT`, `LOW_PRESSURE`, `NOVUS_COMM_LOST`
- `SW_TEMP_LIMIT_LATCHED`, `24H_CONTINUOUS_STOP`, `IGNITION_TIMEOUT`
- *Novos*: `DISCREPANCY_GAS_WITHOUT_FAN`, `SERVER_LOST`, `TANK_LOW_LEVEL`, `PUMP_FAULT`, `NO_PUMP_FLOW`

## 2. Comando (`command`)
Enviado pelo Servidor -> ESP32.

Ver: [command.exemplo.json](protocolo/command.exemplo.json)

### Comandos Permitidos (Lista Branca)
* Aquecedor: `BURNER_START`, `BURNER_STOP`, `PUMP_START`, `PUMP_STOP`, `SW_LIMIT_RESET`, `FAULT_RESET`, `LOCKOUT_COUNT_RESET`
* Tanque: `TX01_PUMP_STOP`, `TX01_AUTO`, `TANK_LEVEL_RESET`
* Sistema: `ALARM_SILENCE`, `ALARM_ACK` (value = código do alarme ou "ALL")

## 3. Resposta (`ack`)
Retornada pelo ESP32 imediatamente após um `command`. Sem envelope "payload".

Ver: [ack.exemplo.json](protocolo/ack.exemplo.json)

### Motivos Comuns de Recusa (`reason`):
* `INVALID_TARGET`: Target inexistente
* `INVALID_COMMAND`: Comando fora da lista branca
* `NOT_AUTHORIZED`: Perfil do usuário não tem permissão para a ação no target específico
* `INVALID_VALUE`: Valor associado fora da faixa ou inválido
* `NOT_IN_STATE`: Estado não permite este comando (ex: reset sem falha ativa)
