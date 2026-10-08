# Firmware do ESP32 — TermoControl HMI/SCADA

## 1. Tabela de E/S (I/O Map)

Abaixo está o mapeamento de sinais do firmware (fonte: `firmware/include/io_map.h`).
**Regra:** Não são utilizados os pinos de strapping do ESP32 (0, 2, 5, 12, 15) para saídas ou comunicação que possam interferir no boot.

| Sinal | Direção | Tipo / Protocolo | Pino/Porta | Descrição |
|---|---|---|---|---|
| `AQ01_PERM_CMD` | Saída | Relé Direto (DO) | GPIO 18 | Permissão do Aquecedor 01 (Série com TL) |
| `AQ02_PERM_CMD` | Saída | Relé Direto (DO) | GPIO 19 | Permissão do Aquecedor 02 (Série com TL) |
| `AQ01_PUMP_CMD` | Saída | Relé Direto (DO) | GPIO 21 | Comando da Bomba 01 |
| `AQ02_PUMP_CMD` | Saída | Relé Direto (DO) | GPIO 22 | Comando da Bomba 02 |
| `TX01_PUMP_CMD` | Saída | Relé Direto (DO) | GPIO 23 | Comando da Bomba do Tanque (A Confirmar) |
| `BUZZER` | Saída | Relé Direto (DO) | GPIO 25 | Sirene de Alarme |
| `AQ01_LOCKOUT` | Entrada | Isolada (MCP23017) | Porta 0 | Retorno de Bloqueio (Sinal S) - AQ01 |
| `AQ01_GAS_VALVES` | Entrada | Isolada (MCP23017) | Porta 1 | Retorno Válvulas Abertas (Borne V) - AQ01 |
| `AQ01_FAN` | Entrada | Isolada (MCP23017) | Porta 2 | Retorno Contator Ventilador - AQ01 |
| `AQ01_CHAIN_OK` | Entrada | Isolada (MCP23017) | Porta 3 | Tensão Cadeia Segurança OK - AQ01 |
| `AQ01_PUMP_FB` | Entrada | Isolada (MCP23017) | Porta 4 | Prova de Fluxo da Bomba - AQ01 |
| `ESTOP_OK` | Entrada | Isolada (MCP23017) | Porta 10 | Botão de Emergência OK |
| `AQ01_PRESS` | Entrada | 4-20mA (ADS1115) | Canal 0 | Pressão de Água - AQ01 |
| `AQ01_TEMP` | Entrada | PT100 (MAX31865) | CS: GPIO 4 | Temperatura de Água - AQ01 |
| Modbus RTU | IN/OUT | RS485 (UART2) | RX:16, TX:17, DE:5 | Leitura do controlador Novus N2000S |

*(Os sinais do AQ02 seguem a mesma lógica, listados no `io_map.h`)*

---

## 2. Máquina de Estados do Queimador

A lógica do queimador (`BurnerLogic`) foi desacoplada em C++ puro e avalia as permissões e o estado operacional em cada ciclo. O ESP32 **só autoriza**, quem faz a regulação fina é o Novus e a segurança de ignição é do LFL1.333.

*   `OFF`: Desligado. Ocorre quando não há comando ativo de start, quando há comando de parada (prioritário), reinício do controlador, ou detecção de falha grave (falha de sensor, pressão baixa, parada de 24h, limite de temperatura de software atingido).
*   `WAIT_PUMP`: Permissão de operação foi concedida logicamente. O sistema aguarda o fluxo da bomba (`PUMP_FB`) e verifica se a temperatura está dentro dos conformes antes de atracar o relé.
*   `PURGE`: O relé de permissão foi atracado. O LFL inicia a pré-purga. O retorno `FAN` está ligado, aguardando a ignição (`GAS_VALVES`). Se o gás não abrir em 60s, a permissão é retirada por falha de ignição.
*   `RUNNING`: Operação normal. Permissão ativa, retorno de ventilação (`FAN`) OK e chama confirmada (`GAS_VALVES`).
*   `POST_PURGE`: O relé foi desatracado (comando interrompido). O ventilador continua girando controlado pelo LFL, mas as válvulas de gás fecharam.
*   `LOCKOUT`: O programador LFL enviou sinal de bloqueio. A permissão é retirada imediatamente.

---

## 3. Matriz de Causa e Efeito (Testes Unitários - `native`)

| Causa / Cenário | Efeito Esperado (Resultado do Teste) | Status |
|---|---|---|
| Partida normal (Todos retornos OK) | Fase muda para `WAIT_PUMP` -> `PURGE` -> `RUNNING`. Permissão OK. | Passou |
| `Off` em qualquer fase | Relé de permissão abre em <= 1s. Se o ventilador persistir, fase = `POST_PURGE`. | Passou |
| Bomba comandada, mas sem `PUMP_FB` (sem retorno) | Permissão nunca é concedida ou é retirada. | Passou |
| Sensor PT100 em Falha (Quality = FAULT) | Permissão retirada. Condição insegura detectada. | Passou |
| Laço 4-20mA < 3.6mA | Permissão retirada. Sinal interpretado como ruptura do cabo. | Passou |
| Bloqueio do LFL | Fase = `LOCKOUT`. Permissão retirada. Incrementa contagem nas 24h. | Passou |
| 3 bloqueios em 24h | Bloqueio sistêmico com falha `MAX_LOCKOUTS_24H`. Permissão bloqueada permanentemente (requer rearme de falha). | Passou |
| Válvulas de gás ativas SEM permissão | Discrepância / Contato colado. Falha crítica. Permissão bloqueada. | Passou |
| Partida sem chama em 60s (Tempo de purga excedido) | Permissão retirada. Falha `IGNITION_TIMEOUT`. | Passou |
| Reinício do controlador | Boot seguro (todas saídas desativadas). Inicia em fase `OFF`. | Passou |
| Limite de temperatura de software atingido | Permissão cortada. Sistema entra em intertravamento com travamento permanente (`SW_LIMIT_LATCHED`) exigindo reset via software por Operador. | Passou |
| Queimador contínuo por > 24h | Permissão temporariamente removida forçando a ciclagem do LFL1 (obrigatório para sensores de chama intermitentes). | Passou |
| Perda de Comunicação com Novus | Permissão retirada (por segurança a lógica derruba o queimador caso a modulação não possa ser vista). | Passou |
| Parada da bomba com calor residual | Permissão de queimador cai, mas a bomba continua ligada durante o tempo de Pós-Purga configurável (ex: 180s). | Passou |
