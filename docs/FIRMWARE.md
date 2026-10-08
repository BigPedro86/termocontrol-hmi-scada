# Firmware do ESP32 — TermoControl HMI/SCADA

## 1. Tabela de E/S (I/O Map)

| Módulo | Pino ESP32 / Porta | Sinal | E/S | Comentário | Ativo em | Com fio rompido |
|---|---|---|---|---|---|---|
| **ESP32** | GPIO 25 | AQ01_PERM_CMD | Saída | Habilitação do queimador 1 | Alto | N/A |
| **ESP32** | GPIO 26 | AQ02_PERM_CMD | Saída | Habilitação do queimador 2 | Alto | N/A |
| **ESP32** | GPIO 27 | AQ01_PUMP_CMD | Saída | Bomba 1 | Alto | N/A |
| **ESP32** | GPIO 32 | AQ02_PUMP_CMD | Saída | Bomba 2 | Alto | N/A |
| **ESP32** | GPIO 33 | TX01_PUMP_CMD | Saída | Bomba de reposição | Alto | N/A |
| **MAX31865 (1)** | GPIO 13 | AQ01_CS | Saída | Chip Select PT100 1 | Baixo | N/A |
| **MAX31865 (2)** | GPIO 14 | AQ02_CS | Saída | Chip Select PT100 2 | Baixo | N/A |
| **SPI Bus** | GPIO 23 | SPI_MOSI | Saída | Barramento SPI | N/A | N/A |
| **SPI Bus** | GPIO 19 | SPI_MISO | Entrada | Barramento SPI | N/A | N/A |
| **SPI Bus** | GPIO 18 | SPI_SCK | Saída | Barramento SPI | N/A | N/A |
| **RS485** | GPIO 17 | RS485_TX | Saída | TX Modbus (UART2) | N/A | N/A |
| **RS485** | GPIO 16 | RS485_RX | Entrada | RX Modbus (UART2) | N/A | N/A |
| **RS485** | GPIO 4 | RS485_DE_RE | Saída | Controle de direção (DE/RE) | N/A | N/A |
| **I2C Bus** | GPIO 21 | I2C_SDA | E/S | Barramento I2C | N/A | N/A |
| **I2C Bus** | GPIO 22 | I2C_SCL | Saída | Barramento I2C | N/A | N/A |
| **ADS1115** | I2C A0 | AQ01_PRESS | Entrada | Analógica 4-20mA (AQ01) | N/A | 0 mA (FAULT) |
| **ADS1115** | I2C A1 | AQ02_PRESS | Entrada | Analógica 4-20mA (AQ02) | N/A | 0 mA (FAULT) |
| **MCP23017** | Porta 0 | AQ01_LOCKOUT | Entrada | Falha queimador 1 | Baixo | Bloqueio não detectado |
| **MCP23017** | Porta 1 | AQ01_GAS_VALVES | Entrada | Retorno válvulas de gás 1 | Baixo | Detectado pelo IGNITION_TIMEOUT |
| **MCP23017** | Porta 2 | AQ01_FAN | Entrada | Retorno ventilador 1 | Baixo | Gera DISCREPANCY_GAS_WITHOUT_FAN |
| **MCP23017** | Porta 3 | AQ01_CHAIN_OK | Entrada | Cadeia de segurança 1 | Baixo | Não OK |
| **MCP23017** | Porta 4 | AQ01_PUMP_FB | Entrada | Retorno bomba 1 | Baixo | Não OK |
| **MCP23017** | Porta 5 | AQ02_LOCKOUT | Entrada | Falha queimador 2 | Baixo | Bloqueio não detectado |
| **MCP23017** | Porta 6 | AQ02_GAS_VALVES | Entrada | Retorno válvulas de gás 2 | Baixo | Detectado pelo IGNITION_TIMEOUT |
| **MCP23017** | Porta 14 | AQ02_FAN | Entrada | Retorno ventilador 2 | Baixo | Gera DISCREPANCY_GAS_WITHOUT_FAN |
| **MCP23017** | Porta 8 | AQ02_CHAIN_OK | Entrada | Cadeia de segurança 2 | Baixo | Não OK |
| **MCP23017** | Porta 9 | AQ02_PUMP_FB | Entrada | Retorno bomba 2 | Baixo | Não OK |
| **MCP23017** | Porta 10 | ESTOP_OK | Entrada | Emergência geral | Baixo | Não OK |
| **MCP23017** | Porta 11 | TX01_LEVEL_SW | Entrada | Nível tanque (0 = Normal, 1 = Baixo) | Baixo | Baixo |
| **MCP23017** | Porta 12 | TX01_PRESS_SW | Entrada | Pressostato reposição | Baixo | Reposição não liga |
| **MCP23017** | Porta 13 | TX01_PUMP_FB | Entrada | Retorno bomba reposição | Baixo | Não OK |
| **MCP23017** | Porta 15 | BUZZER | Saída | Sirene de alarme | Alto | N/A |


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
