# Protocolo TermoControl (ESP32 <-> Servidor)

## 1. Estado (`state`)
Publicado periodicamente pelo ESP32 (ex: 1s).

```json
{
  "type": "state", 
  "seq": 1832, 
  "uptime_s": 86400, 
  "estopOk": true,
  "heaters": [{
    "id": "AQ01",
    "burner": {
      "phase": "RUNNING", 
      "permission": true, 
      "requested": true,
      "blockReasons": [], 
      "lockout": false, 
      "lockoutCount24h": 0, 
      "runHours": 12.4
    },
    "temp":  { "value": 71.3, "quality": "OK" },
    "press": { "value": 2.1,  "quality": "OK" },
    "novus": {
      "commOk": true, "pv": 71.0, "sp": 72.0, "mv": 45.0,
      "auto": true, "alarms": [false, false], "quality": "OK"
    },
    "pump": { "cmd": true, "fb": true },
    "chainOk": true
  }],
  "tank": {
    "id": "TX01",
    "levelNormal": true,
    "pressureLow": false,
    "pumpCmd": true,
    "pumpFb": true,
    "isAuto": true,
    "isLatched": false
  },
  "alarms": [{ "code": "AQ01_TEMP_H", "severity": "H", "active": true, "latched": true, "since": 1832000 }],
  "allowedActions": { "AQ01": ["BURNER_STOP", "PUMP_STOP"] }
}
```

### Qualidade de Medição (Quality)
* `OK`: Leitura válida
* `FAULT`: Erro de hardware do sensor (ex: PT100 aberto/curto, 4-20mA < 3.6mA)
* `NOT_MEASURED`: Sensor ausente na configuração
* `COMM_LOST`: Falha de comunicação (ex: Modbus)

### Fases do Queimador (Phase)
* `OFF`, `WAIT_PUMP`, `PURGE`, `RUNNING`, `POST_PURGE`, `LOCKOUT`

### Motivos de Bloqueio (blockReasons)
* `NOT_REQUESTED`: Sem pedido de start
* `CHAIN_NOT_OK`: Cadeia de segurança aberta
* `ESTOP_PRESSED`: Emergência acionada
* `LFL_LOCKOUT`: Bloqueio ativo no LFL
* `MAX_LOCKOUTS_24H`: 3 bloqueios em menos de 24h
* `TEMP_SENSOR_FAULT`: Sensor PT100 em falha
* `PRESS_SENSOR_FAULT`: Sensor de pressão em falha
* `LOW_PRESSURE`: Pressão < 0.5 bar
* `NOVUS_COMM_LOST`: Sem comunicação com Novus
* `SW_TEMP_LIMIT_LATCHED`: Limite max temperatura atingido e travado
* `24H_CONTINUOUS_STOP`: Limite de queima de 24h contínuas atingido
* `DISCREPANCY_GAS_WITHOUT_PERM`: Válvula de gás operando sem permissão do SCADA
* `IGNITION_TIMEOUT`: Excedido 60s em pré-purga sem ignição
* `NO_PUMP_FLOW`: Ausência de fluxo de bomba comprovado

## 2. Comando (`command`)
Enviado pelo Servidor -> ESP32.

```json
{ 
  "type": "command", 
  "id": "uuid-1234", 
  "target": "AQ01", 
  "command": "BURNER_START",
  "user": "joao", 
  "role": "Supervisor", 
  "reason": "Início de turno",
  "value": null
}
```

### Comandos Permitidos (Lista Branca)
* `BURNER_START`, `BURNER_STOP`
* `PUMP_START`, `PUMP_STOP`
* `TX01_PUMP_STOP`, `TX01_AUTO`, `TANK_LEVEL_RESET`
* `ALARM_ACK`
* `SW_LIMIT_RESET` (Reseta travamento de software, restrito a perfis autorizados)
* `SET_CONFIG` (Requer role Admin)

## 3. Resposta (`ack`)
Retornada pelo ESP32 imediatamente após um `command`.

```json
{ 
  "type": "ack", 
  "id": "uuid-1234", 
  "accepted": false, 
  "reason": "NOT_AUTHORIZED" 
}
```

### Motivos Comuns de Recusa (`reason`):
* `INVALID_TARGET`: Target inexistente
* `INVALID_COMMAND`: Comando fora da lista branca
* `NOT_AUTHORIZED`: Perfil do usuário não tem permissão
* `INVALID_VALUE`: Valor (se aplicável) fora do range tolerável
