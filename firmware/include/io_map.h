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
#define PIN_BUZZER         12 // A_CONFIRMAR

// ==========================================
// ENTRADAS ISOLADAS 230V (via MCP23017 no I2C)
// ==========================================
// Os pinos aqui referem-se aos ports do MCP23017 (0 a 15)
#define MCP_AQ01_LOCKOUT    0
#define MCP_AQ01_GAS_VALVES 1
#define MCP_AQ01_FAN        2
#define MCP_AQ01_CHAIN_OK   3
#define MCP_AQ01_PUMP_FB    4

#define MCP_AQ02_LOCKOUT    5
#define MCP_AQ02_GAS_VALVES 6
#define MCP_AQ02_FAN        7
#define MCP_AQ02_CHAIN_OK   8
#define MCP_AQ02_PUMP_FB    9

#define MCP_ESTOP_OK        10
#define MCP_TX01_LEVEL_SW   11
#define MCP_TX01_PRESS_SW   12
#define MCP_TX01_PUMP_FB    13

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
#define PIN_AQ01_CS  4
#define PIN_AQ02_CS  13

// ==========================================
// COMUNICAÇÃO MODBUS RTU (UART2)
// ==========================================
#define PIN_RS485_RX    16
#define PIN_RS485_TX    17
#define PIN_RS485_DE_RE 5
