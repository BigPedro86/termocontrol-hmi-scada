const fs = require('fs');
const path = require('path');

const ioMapPath = path.join(__dirname, '../include/io_map.h');
const docsPath = path.join(__dirname, '../../docs/FIRMWARE.md');

const ioMap = fs.readFileSync(ioMapPath, 'utf8');
const docs = fs.readFileSync(docsPath, 'utf8');

const lines = ioMap.split('\n');
const pins = {};

lines.forEach(line => {
    const match = line.match(/^#define\s+([A-Z0-9_]+)\s+(\d+)/);
    if (match) {
        pins[match[1]] = match[2];
    }
});

let newTable = `| Módulo | Pino ESP32 / Porta | Sinal | E/S | Comentário | Ativo em | Com fio rompido |\n|---|---|---|---|---|---|---|\n`;
newTable += `| **ESP32** | GPIO ${pins['PIN_AQ01_PERM_CMD']} | AQ01_PERM_CMD | Saída | Habilitação do queimador 1 | Alto | N/A |\n`;
newTable += `| **ESP32** | GPIO ${pins['PIN_AQ02_PERM_CMD']} | AQ02_PERM_CMD | Saída | Habilitação do queimador 2 | Alto | N/A |\n`;
newTable += `| **ESP32** | GPIO ${pins['PIN_AQ01_PUMP_CMD']} | AQ01_PUMP_CMD | Saída | Bomba 1 | Alto | N/A |\n`;
newTable += `| **ESP32** | GPIO ${pins['PIN_AQ02_PUMP_CMD']} | AQ02_PUMP_CMD | Saída | Bomba 2 | Alto | N/A |\n`;
newTable += `| **ESP32** | GPIO ${pins['PIN_TX01_PUMP_CMD']} | TX01_PUMP_CMD | Saída | Bomba de reposição | Alto | N/A |\n`;

newTable += `| **MAX31865 (1)** | GPIO ${pins['PIN_AQ01_CS']} | AQ01_CS | Saída | Chip Select PT100 1 | Baixo | N/A |\n`;
newTable += `| **MAX31865 (2)** | GPIO ${pins['PIN_AQ02_CS']} | AQ02_CS | Saída | Chip Select PT100 2 | Baixo | N/A |\n`;
newTable += `| **SPI Bus** | GPIO ${pins['PIN_SPI_MOSI']} | SPI_MOSI | Saída | Barramento SPI | N/A | N/A |\n`;
newTable += `| **SPI Bus** | GPIO ${pins['PIN_SPI_MISO']} | SPI_MISO | Entrada | Barramento SPI | N/A | N/A |\n`;
newTable += `| **SPI Bus** | GPIO ${pins['PIN_SPI_SCK']} | SPI_SCK | Saída | Barramento SPI | N/A | N/A |\n`;

newTable += `| **RS485** | GPIO ${pins['PIN_RS485_TX']} | RS485_TX | Saída | TX Modbus (UART2) | N/A | N/A |\n`;
newTable += `| **RS485** | GPIO ${pins['PIN_RS485_RX']} | RS485_RX | Entrada | RX Modbus (UART2) | N/A | N/A |\n`;
newTable += `| **RS485** | GPIO ${pins['PIN_RS485_DE_RE']} | RS485_DE_RE | Saída | Controle de direção (DE/RE) | N/A | N/A |\n`;

newTable += `| **I2C Bus** | GPIO ${pins['PIN_I2C_SDA']} | I2C_SDA | E/S | Barramento I2C | N/A | N/A |\n`;
newTable += `| **I2C Bus** | GPIO ${pins['PIN_I2C_SCL']} | I2C_SCL | Saída | Barramento I2C | N/A | N/A |\n`;

newTable += `| **ADS1115** | I2C A${pins['ADS_AQ01_PRESS']} | AQ01_PRESS | Entrada | Analógica 4-20mA (AQ01) | N/A | 0 mA (FAULT) |\n`;
newTable += `| **ADS1115** | I2C A${pins['ADS_AQ02_PRESS']} | AQ02_PRESS | Entrada | Analógica 4-20mA (AQ02) | N/A | 0 mA (FAULT) |\n`;

newTable += `| **MCP23017** | Porta ${pins['MCP_AQ01_LOCKOUT']} | AQ01_LOCKOUT | Entrada | Falha queimador 1 | Baixo | Bloqueio não detectado |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ01_GAS_VALVES']} | AQ01_GAS_VALVES | Entrada | Retorno válvulas de gás 1 | Baixo | Detectado pelo IGNITION_TIMEOUT |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ01_FAN']} | AQ01_FAN | Entrada | Retorno ventilador 1 | Baixo | Gera DISCREPANCY_GAS_WITHOUT_FAN |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ01_CHAIN_OK']} | AQ01_CHAIN_OK | Entrada | Cadeia de segurança 1 | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ01_PUMP_FB']} | AQ01_PUMP_FB | Entrada | Retorno bomba 1 | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ02_LOCKOUT']} | AQ02_LOCKOUT | Entrada | Falha queimador 2 | Baixo | Bloqueio não detectado |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ02_GAS_VALVES']} | AQ02_GAS_VALVES | Entrada | Retorno válvulas de gás 2 | Baixo | Detectado pelo IGNITION_TIMEOUT |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ02_FAN']} | AQ02_FAN | Entrada | Retorno ventilador 2 | Baixo | Gera DISCREPANCY_GAS_WITHOUT_FAN |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ02_CHAIN_OK']} | AQ02_CHAIN_OK | Entrada | Cadeia de segurança 2 | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_AQ02_PUMP_FB']} | AQ02_PUMP_FB | Entrada | Retorno bomba 2 | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_ESTOP_OK']} | ESTOP_OK | Entrada | Emergência geral | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_TX01_LEVEL_SW']} | TX01_LEVEL_SW | Entrada | Nível tanque (0 = Normal, 1 = Baixo) | Baixo | Baixo |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_TX01_PRESS_SW']} | TX01_PRESS_SW | Entrada | Pressostato reposição | Baixo | Reposição não liga |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_TX01_PUMP_FB']} | TX01_PUMP_FB | Entrada | Retorno bomba reposição | Baixo | Não OK |\n`;
newTable += `| **MCP23017** | Porta ${pins['MCP_BUZZER']} | BUZZER | Saída | Sirene de alarme | Alto | N/A |\n`;

const startIndex = docs.indexOf('## 1. Tabela de E/S (I/O Map)');
if (startIndex !== -1) {
    const headerEndIndex = docs.indexOf('\n', startIndex);
    let nextSectionIndex = docs.indexOf('\n## ', headerEndIndex + 1);
    if (nextSectionIndex === -1) nextSectionIndex = docs.length;

    const newDocs = docs.substring(0, headerEndIndex + 1) + '\n' + newTable + '\n' + docs.substring(nextSectionIndex);
    fs.writeFileSync(docsPath, newDocs);
    console.log("Tabela atualizada com sucesso!");
} else {
    console.log("Seção '## Tabela de Pinos (I/O Map)' não encontrada.");
}
