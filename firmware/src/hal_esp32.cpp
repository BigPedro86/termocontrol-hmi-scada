#ifndef PIO_UNIT_TESTING
#include "hal_esp32.h"
#include "config.h"
#include "types.h"

#define CHK_PIN(p) static_assert((p) != 7 && (p) != 15, "Pinos 7 e 15 reservados e nao podem ser entradas");
CHK_PIN(MCP_AQ01_LOCKOUT)
CHK_PIN(MCP_AQ01_GAS_VALVES)
CHK_PIN(MCP_AQ01_FAN)
CHK_PIN(MCP_AQ01_CHAIN_OK)
CHK_PIN(MCP_AQ01_PUMP_FB)
CHK_PIN(MCP_AQ02_LOCKOUT)
CHK_PIN(MCP_AQ02_GAS_VALVES)
CHK_PIN(MCP_AQ02_FAN)
CHK_PIN(MCP_AQ02_CHAIN_OK)
CHK_PIN(MCP_AQ02_PUMP_FB)
CHK_PIN(MCP_ESTOP_OK)
CHK_PIN(MCP_TX01_LEVEL_SW)
CHK_PIN(MCP_TX01_PRESS_SW)
CHK_PIN(MCP_TX01_PUMP_FB)

static_assert(MCP_BUZZER == 15, "BUZZER deve estar na porta 15");

// Calcula a mascara de configuração esperada
#define MASK_PIN(p) (1 << (p))
constexpr uint16_t EXPECTED_IODIR = 
    MASK_PIN(MCP_AQ01_LOCKOUT) | MASK_PIN(MCP_AQ01_GAS_VALVES) | MASK_PIN(MCP_AQ01_FAN) | 
    MASK_PIN(MCP_AQ01_CHAIN_OK) | MASK_PIN(MCP_AQ01_PUMP_FB) | 
    MASK_PIN(MCP_AQ02_LOCKOUT) | MASK_PIN(MCP_AQ02_GAS_VALVES) | MASK_PIN(MCP_AQ02_FAN) | 
    MASK_PIN(MCP_AQ02_CHAIN_OK) | MASK_PIN(MCP_AQ02_PUMP_FB) | 
    MASK_PIN(MCP_ESTOP_OK) | MASK_PIN(MCP_TX01_LEVEL_SW) | 
    MASK_PIN(MCP_TX01_PRESS_SW) | MASK_PIN(MCP_TX01_PUMP_FB);

constexpr uint16_t EXPECTED_GPPU = EXPECTED_IODIR; // Mesma máscara, pull-up em todas entradas

HardwareSerial RS485Serial(2);

HAL_ESP32::HAL_ESP32() {
    lastModbusPoll = 0;
    modbusCurrentSlave = 0;
    inputFilterMs = 40; // Default filter
    mcpFilter.setFilterMs(inputFilterMs);
    for(int i=0; i<2; i++) {
        modbusData[i] = {0.0f, 0.0f, 0.0f, false, 0};
    }
}

void HAL_ESP32::mcpTask(void *pvParameters) {
    HAL_ESP32* hal = (HAL_ESP32*)pvParameters;
    uint32_t lastCheck = 0;
    int goodReads = 0;

    auto readReg16 = [](uint8_t reg, bool& ok) -> uint16_t {
        Wire.beginTransmission(0x20);
        Wire.write(reg);
        if (Wire.endTransmission() != 0) { ok = false; return 0; }
        Wire.requestFrom(0x20, 2);
        if (Wire.available() == 2) {
            uint8_t l = Wire.read();
            uint8_t h = Wire.read();
            return (h << 8) | l;
        }
        ok = false;
        return 0;
    };

    while(true) {
        uint32_t now = hal->millis();
        bool cycleOk = true;

        // Leitura GPIO
        uint16_t vals = readReg16(0x12, cycleOk); // 0x12 é GPIOA no bank 0

        if (cycleOk) {
            hal->mcpFilter.updateRaw(vals, now);
        } else {
            hal->mcpFilter.setIoFault(true);
            goodReads = 0;
            // Se falhou, nao continua pro check de 1s
        }

        if (cycleOk && now - lastCheck >= 1000) {
            lastCheck = now;
            
            bool configOk = true;
            uint16_t iodir = readReg16(0x00, configOk); // IODIRA
            uint16_t gppu  = readReg16(0x0C, configOk); // GPPUA

            if (!configOk || iodir != EXPECTED_IODIR || gppu != EXPECTED_GPPU) {
                hal->mcpFilter.setIoFault(true);
                goodReads = 0;

                // Tenta reconfigurar
                hal->mcp.begin_I2C();
                for(int i=0; i<16; i++) {
                    if (i == MCP_BUZZER || i == 7) {
                        hal->mcp.pinMode(i, OUTPUT);
                        hal->mcp.digitalWrite(i, LOW);
                    } else {
                        hal->mcp.pinMode(i, INPUT_PULLUP);
                    }
                }
            } else {
                if (goodReads < 3) {
                    goodReads++;
                }
                if (goodReads >= 3 && hal->mcpFilter.isIoFault()) {
                    hal->mcpFilter.setIoFault(false);
                    hal->mcpFilter.resetFilter();
                }
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

void HAL_ESP32::begin() {
    // 1. Relays (Boot Seguro)
    digitalWrite(PIN_AQ01_PERM_CMD, LOW);
    digitalWrite(PIN_AQ02_PERM_CMD, LOW);
    digitalWrite(PIN_AQ01_PUMP_CMD, LOW);
    digitalWrite(PIN_AQ02_PUMP_CMD, LOW);
    digitalWrite(PIN_TX01_PUMP_CMD, LOW);
    
    pinMode(PIN_AQ01_PERM_CMD, OUTPUT);
    pinMode(PIN_AQ02_PERM_CMD, OUTPUT);
    pinMode(PIN_AQ01_PUMP_CMD, OUTPUT);
    pinMode(PIN_AQ02_PUMP_CMD, OUTPUT);
    pinMode(PIN_TX01_PUMP_CMD, OUTPUT);

    // 2. I2C devices
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    if (mcp.begin_I2C()) {
        for(int i=0; i<16; i++) {
            if (i == MCP_BUZZER || i == 7) {
                mcp.pinMode(i, OUTPUT);
                mcp.digitalWrite(i, LOW);
            } else {
                mcp.pinMode(i, INPUT_PULLUP);
            }
        }
    } else {
        mcpFilter.setIoFault(true);
    }

    if (!ads.begin()) {
        mcpFilter.setIoFault(true); // Treated as ioFault
    }

    // 3. SPI devices (MAX31865)
    pt100[0] = new Adafruit_MAX31865(PIN_AQ01_CS, PIN_SPI_MOSI, PIN_SPI_MISO, PIN_SPI_SCK);
    pt100[1] = new Adafruit_MAX31865(PIN_AQ02_CS, PIN_SPI_MOSI, PIN_SPI_MISO, PIN_SPI_SCK);
    pt100[0]->begin(MAX31865_3WIRE);
    pt100[1]->begin(MAX31865_3WIRE);

    // 4. Modbus RTU
    pinMode(PIN_RS485_DE_RE, OUTPUT);
    digitalWrite(PIN_RS485_DE_RE, LOW);
    RS485Serial.begin(9600, SERIAL_8N1, PIN_RS485_RX, PIN_RS485_TX);
    MB = new ModbusClientRTU(PIN_RS485_DE_RE);
    MB->begin(RS485Serial);
    MB->setTimeout(300);
    MB->onDataHandler([this](ModbusMessage response, uint32_t token) {
        int h = token - 1; // token 1 = AQ01, 2 = AQ02
        if (h >= 0 && h < 2) {
            int16_t pv, sv, mv;
            response.get(3, pv);
            response.get(5, sv);
            response.get(7, mv);
            
            portENTER_CRITICAL(&this->modbusMux);
            this->modbusData[h].pv = pv / 10.0f;
            this->modbusData[h].sv = sv / 10.0f;
            this->modbusData[h].mv = mv / 10.0f;
            this->modbusData[h].commOk = true;
            this->modbusData[h].lastSuccessTime = this->millis();
            portEXIT_CRITICAL(&this->modbusMux);
        }
    });
    MB->onErrorHandler([this](Error error, uint32_t token) {
        // Ignora erro imediato, tratamos com timeout de 5s no pollModbus
    });

    // 5. Preferences (NVS)
    preferences.begin("termocontrol", false);
    inputFilterMs = preferences.getUInt("inputFilterMs", 40);
    mcpFilter.setFilterMs(inputFilterMs);

    // Start MCP Task
    xTaskCreate(HAL_ESP32::mcpTask, "MCP_Task", 4096, this, 1, NULL);
}

void HAL_ESP32::setBurnerCmd(int h, bool state) {
    if (h == 0) digitalWrite(PIN_AQ01_PERM_CMD, state ? HIGH : LOW);
    else if (h == 1) digitalWrite(PIN_AQ02_PERM_CMD, state ? HIGH : LOW);
}

void HAL_ESP32::setPumpCmd(int h, bool state) {
    if (h == 0) digitalWrite(PIN_AQ01_PUMP_CMD, state ? HIGH : LOW);
    else if (h == 1) digitalWrite(PIN_AQ02_PUMP_CMD, state ? HIGH : LOW);
}

void HAL_ESP32::setTx01PumpCmd(bool state) {
    digitalWrite(PIN_TX01_PUMP_CMD, state ? HIGH : LOW);
}

void HAL_ESP32::setBuzzer(bool state) {
    if (!mcpFilter.isIoFault()) {
        mcp.digitalWrite(MCP_BUZZER, state ? HIGH : LOW);
    }
}

// ==========================================
// Digital Inputs (Filtered & Fault-Tolerant)
// ==========================================
bool HAL_ESP32::getFilteredInput(int pin) {
    return mcpFilter.getFilteredInput(pin, millis());
}

bool HAL_ESP32::getLflLockout(int h) {
    if (mcpFilter.isIoFault()) return true; // Fail-safe: assume lockout active
    if (h == 0) return getFilteredInput(MCP_AQ01_LOCKOUT);
    return getFilteredInput(MCP_AQ02_LOCKOUT);
}

bool HAL_ESP32::getLflGasValves(int h) {
    if (h == 0) return getFilteredInput(MCP_AQ01_GAS_VALVES);
    return getFilteredInput(MCP_AQ02_GAS_VALVES);
}

bool HAL_ESP32::getLflFan(int h) {
    if (h == 0) return getFilteredInput(MCP_AQ01_FAN);
    return getFilteredInput(MCP_AQ02_FAN);
}

bool HAL_ESP32::getSafetyChainOk(int h) {
    if (h == 0) return getFilteredInput(MCP_AQ01_CHAIN_OK);
    return getFilteredInput(MCP_AQ02_CHAIN_OK);
}

bool HAL_ESP32::getPumpFb(int h) {
    if (h == 0) return getFilteredInput(MCP_AQ01_PUMP_FB);
    return getFilteredInput(MCP_AQ02_PUMP_FB);
}

bool HAL_ESP32::getEStopOk() {
    return getFilteredInput(MCP_ESTOP_OK);
}

bool HAL_ESP32::getTx01LevelSw() {
    return getFilteredInput(MCP_TX01_LEVEL_SW);
}

bool HAL_ESP32::getTx01PressSw() {
    return getFilteredInput(MCP_TX01_PRESS_SW);
}

bool HAL_ESP32::getTx01PumpFb() {
    return getFilteredInput(MCP_TX01_PUMP_FB);
}

// ==========================================
// Analog Inputs
// ==========================================
AnalogValue HAL_ESP32::getTemperature(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::FAULT};
    uint16_t rtd = pt100[h]->readRTD();
    uint8_t fault = pt100[h]->readFault();
    if (fault) {
        pt100[h]->clearFault();
        return {0.0f, SensorQuality::FAULT};
    }
    float temp = pt100[h]->temperature(100.0f, 430.0f);
    return {temp, SensorQuality::OK};
}

AnalogValue HAL_ESP32::getPressure(int h) {
    if (mcpFilter.isIoFault() || h < 0 || h > 1) return {0.0f, SensorQuality::FAULT};
    int16_t adc = ads.readADC_SingleEnded(h == 0 ? ADS_AQ01_PRESS : ADS_AQ02_PRESS);
    float volts = (adc * 4.096f) / 32768.0f;
    float mA = (volts / 250.0f) * 1000.0f;
    SensorValue sv = convert4_20mA(mA, 0.0f, 10.0f);
    return {sv.value, sv.quality == Quality::OK ? SensorQuality::OK : SensorQuality::FAULT};
}

// ==========================================
// Modbus
// ==========================================
#define REG_SV 0
#define REG_PV 1
#define REG_MV 2
#define REG_STATUS1 6
#define REG_STATUS2 9

void HAL_ESP32::pollModbus() {
    uint32_t now = millis();
    
    // Check timeout for both
    for (int h = 0; h < 2; h++) {
        if (now - modbusData[h].lastSuccessTime > config.modbusTimeoutMs) {
            modbusData[h].commOk = false;
        }
    }

    if (now - lastModbusPoll < 1000) return;
    
    // Only queue if queue is empty
    if (MB->getMessageCount() > 0) return;

    lastModbusPoll = now;

    // Asynchronous read (Function 03) from slave
    int slaveAddr = modbusCurrentSlave + 1;
    // Parameters: token, serverID, functionCode, address, count
    MB->addRequest((uint32_t)slaveAddr, slaveAddr, READ_HOLD_REGISTER, REG_SV, 3);
    
    // Switch to next slave for next time
    modbusCurrentSlave = (modbusCurrentSlave + 1) % 2;
}

AnalogValue HAL_ESP32::getNovusPV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    portENTER_CRITICAL(&modbusMux);
    AnalogValue ret = {modbusData[h].pv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
    portEXIT_CRITICAL(&modbusMux);
    return ret;
}
AnalogValue HAL_ESP32::getNovusSV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    portENTER_CRITICAL(&modbusMux);
    AnalogValue ret = {modbusData[h].sv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
    portEXIT_CRITICAL(&modbusMux);
    return ret;
}
AnalogValue HAL_ESP32::getNovusMV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    portENTER_CRITICAL(&modbusMux);
    AnalogValue ret = {modbusData[h].mv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
    portEXIT_CRITICAL(&modbusMux);
    return ret;
}
bool HAL_ESP32::getNovusA1(int h) { return false; } // Não validados (a definir pela tabela Novus)
bool HAL_ESP32::getNovusA2(int h) { return false; } // Não validados (a definir pela tabela Novus)
bool HAL_ESP32::isNovusCommOk(int h) {
    if (h < 0 || h > 1) return false;
    portENTER_CRITICAL(&modbusMux);
    bool ok = modbusData[h].commOk;
    portEXIT_CRITICAL(&modbusMux);
    return ok;
}

unsigned long HAL_ESP32::millis() { return ::millis(); }
bool HAL_ESP32::isIoFault() { return mcpFilter.isIoFault(); }

void HAL_ESP32::saveConfig(const std::string& key, const std::string& value) {
    preferences.putString(key.c_str(), value.c_str());
}

std::string HAL_ESP32::loadConfig(const std::string& key, const std::string& default_val) {
    return preferences.getString(key.c_str(), default_val.c_str()).c_str();
}
#endif
