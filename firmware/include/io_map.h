#pragma once

// Este arquivo é a ÚNICA fonte de mapeamento físico.

// ==========================================
// SAÍDAS A RELÉ (Digital Out - ESP32 Direto)
// ==========================================
#define PIN_AQ01_PERM_CMD  25
#define PIN_AQ02_PERM_CMD  26
#define PIN_AQ01_PUMP_CMD  27
#define PIN_AQ02_PUMP_CMD  32
#define PIN_TX01_PUMP_CMD  33 // A_CONFIRMAR

// ==========================================
// I2C E/S EXPANSÃO E ADC
// ==========================================
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22

// O BUZZER agora usa a porta 15 do MCP23017
#define MCP_BUZZER  15

// ==========================================
// ENTRADAS ISOLADAS 230V (via MCP23017 no I2C)
// ==========================================
// Os pinos referem-se aos ports do MCP23017 (0 a 15)
// ⚠ VALIDAR NO EQUIPAMENTO: O GPA7 (Porta 7) e GPB7 (Porta 15) só funcionam como SAÍDA.
// A porta 7 está reservada (somente saída — não usar como entrada).
#define MCP_AQ01_LOCKOUT    0
#define MCP_AQ01_GAS_VALVES 1
#define MCP_AQ01_FAN        2
#define MCP_AQ01_CHAIN_OK   3
#define MCP_AQ01_PUMP_FB    4

#define MCP_AQ02_LOCKOUT    5
#define MCP_AQ02_GAS_VALVES 6
// Porta 7 RESERVADA (somente saída)
#define MCP_AQ02_CHAIN_OK   8
#define MCP_AQ02_PUMP_FB    9

#define MCP_ESTOP_OK        10
#define MCP_TX01_LEVEL_SW   11
#define MCP_TX01_PRESS_SW   12
#define MCP_TX01_PUMP_FB    13
#define MCP_AQ02_FAN        14
// Porta 15 é o BUZZER (saída)

// Polaridade das entradas (ATIVO = optoacoplador conduzindo = nível BAIXO)
// ⚠ VALIDAR NO EQUIPAMENTO: tipo de módulo de entrada.
// Comportamento em caso de fio rompido (nível ALTO):
// - CHAIN_OK, ESTOP_OK, PUMP_FB, TX01_LEVEL_SW: Não OK (Seguro).
// - LOCKOUT: Bloqueio NÃO detectado (alarme e contagem se perdem; segurança real fica no LFL).
// - GAS_VALVES: Válvulas parecem fechadas (gera IGNITION_TIMEOUT de 60s).
// - FAN: Ventilador parece desligado (com gás aberto, gera DISCREPANCY_GAS_WITHOUT_FAN).
// - TX01_PRESS_SW: Parece pressão normal; reposição não liga (lado seguro contra sobrepressão).
#define INPUT_ACTIVE_LEVEL  LOW

// ==========================================
// ENTRADAS 4-20mA (via ADS1115 no I2C)
// ==========================================
// Pinos referem-se aos canais do ADS (0 a 3)
#define ADS_AQ01_PRESS 0
#define ADS_AQ02_PRESS 1
// O TX01 não possui transmissor de pressão 4-20mA

// ==========================================
// SENSORES PT100 (via MAX31865 no SPI)
// ==========================================
#define PIN_SPI_MOSI 23
#define PIN_SPI_MISO 19 // Evitando GPIO 12
#define PIN_SPI_SCK  18
#define PIN_AQ01_CS  13
#define PIN_AQ02_CS  14

// ==========================================
// COMUNICAÇÃO MODBUS RTU (UART2)
// ==========================================
// PROVISÓRIO — responsável técnico define: TL pelo relé I/O1 do Novus.
#define PIN_RS485_RX    16
#define PIN_RS485_TX    17
#define PIN_RS485_DE_RE 4
