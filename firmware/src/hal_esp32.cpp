#ifndef PIO_UNIT_TESTING
#include "hal_esp32.h"
#include "config.h"
#include "types.h"

// For Modbus hardware serial handling
HardwareSerial RS485Serial(2);

// Callback for Modbus DE/RE pin
static void modbusPreTransmission() {
    digitalWrite(PIN_RS485_DE_RE, HIGH);
}
static void modbusPostTransmission() {
    digitalWrite(PIN_RS485_DE_RE, LOW);
}

HAL_ESP32::HAL_ESP32() {
    lastModbusPoll = 0;
    for(int i=0; i<2; i++) {
        modbusData[i] = {0.0f, 0.0f, 0.0f, false, false, false};
    }
}

void HAL_ESP32::begin() {
    // 1. Relays (Boot Seguro - all off before setting to output)
    digitalWrite(PIN_AQ01_PERM_CMD, LOW);
    digitalWrite(PIN_AQ02_PERM_CMD, LOW);
    digitalWrite(PIN_AQ01_PUMP_CMD, LOW);
    digitalWrite(PIN_AQ02_PUMP_CMD, LOW);
    digitalWrite(PIN_TX01_PUMP_CMD, LOW);
    digitalWrite(PIN_BUZZER, LOW);
    
    pinMode(PIN_AQ01_PERM_CMD, OUTPUT);
    pinMode(PIN_AQ02_PERM_CMD, OUTPUT);
    pinMode(PIN_AQ01_PUMP_CMD, OUTPUT);
    pinMode(PIN_AQ02_PUMP_CMD, OUTPUT);
    pinMode(PIN_TX01_PUMP_CMD, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    // 2. I2C devices
    Wire.begin();
    if (!mcp.begin_I2C()) {
        // Handle error (perhaps just retry or log)
    }
    
    // Set MCP pins to input
    for(int i=0; i<16; i++) {
        mcp.pinMode(i, INPUT_PULLUP);
    }

    if (!ads.begin()) {
        // Handle error
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
    
    // Slave 1 = AQ01, Slave 2 = AQ02
    node1.begin(1, RS485Serial);
    node1.preTransmission(modbusPreTransmission);
    node1.postTransmission(modbusPostTransmission);
    
    node2.begin(2, RS485Serial);
    node2.preTransmission(modbusPreTransmission);
    node2.postTransmission(modbusPostTransmission);

    // 5. Preferences (NVS)
    preferences.begin("termocontrol", false);
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
    digitalWrite(PIN_BUZZER, state ? HIGH : LOW);
}

bool HAL_ESP32::getLflLockout(int h) {
    if (h == 0) return !mcp.digitalRead(MCP_AQ01_LOCKOUT); // Assuming low = fault
    return !mcp.digitalRead(MCP_AQ02_LOCKOUT);
}

bool HAL_ESP32::getLflGasValves(int h) {
    if (h == 0) return mcp.digitalRead(MCP_AQ01_GAS_VALVES);
    return mcp.digitalRead(MCP_AQ02_GAS_VALVES);
}

bool HAL_ESP32::getLflFan(int h) {
    if (h == 0) return mcp.digitalRead(MCP_AQ01_FAN);
    return mcp.digitalRead(MCP_AQ02_FAN);
}

bool HAL_ESP32::getSafetyChainOk(int h) {
    if (h == 0) return mcp.digitalRead(MCP_AQ01_CHAIN_OK);
    return mcp.digitalRead(MCP_AQ02_CHAIN_OK);
}

bool HAL_ESP32::getPumpFb(int h) {
    if (h == 0) return mcp.digitalRead(MCP_AQ01_PUMP_FB);
    return mcp.digitalRead(MCP_AQ02_PUMP_FB);
}

bool HAL_ESP32::getEStopOk() {
    return mcp.digitalRead(MCP_ESTOP_OK);
}

bool HAL_ESP32::getTx01LevelSw() {
    return !mcp.digitalRead(MCP_TX01_LEVEL_SW); // LOW (GND) = normal, HIGH = baixo (fio rompido/aberto)
}

bool HAL_ESP32::getTx01PressSw() {
    return !mcp.digitalRead(MCP_TX01_PRESS_SW); // LOW (GND) = baixa pressão (pedindo reposição)
}

bool HAL_ESP32::getTx01PumpFb() {
    return !mcp.digitalRead(MCP_TX01_PUMP_FB); // LOW (GND) = pump ON (contato auxiliar fechado)
}

AnalogValue HAL_ESP32::getTemperature(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::FAULT};
    
    uint16_t rtd = pt100[h]->readRTD();
    uint8_t fault = pt100[h]->readFault();
    
    if (fault) {
        pt100[h]->clearFault();
        return {0.0f, SensorQuality::FAULT};
    }
    
    float ratio = rtd;
    ratio /= 32768;
    float r = ratio * 430.0f; // Reference resistor
    // Simplified conversion or use library
    float temp = pt100[h]->temperature(100.0f, 430.0f);
    
    return {temp, SensorQuality::OK};
}

AnalogValue HAL_ESP32::getPressure(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::FAULT};
    
    int16_t adc = 0;
    if (h == 0) adc = ads.readADC_SingleEnded(ADS_AQ01_PRESS);
    else adc = ads.readADC_SingleEnded(ADS_AQ02_PRESS);
    
    // ADS1115 gives 0-32767 for 0-4.096V (gain 1)
    // Convert ADC to voltage (gain = 1, +/- 4.096V)
    float volts = (adc * 4.096f) / 32768.0f;
    // Assuming 250 ohm shunt resistor: I = V / R
    float mA = (volts / 250.0f) * 1000.0f;
    
    // Use the conversion function from types.h (min=0, max=10 bar)
    SensorValue sv = convert4_20mA(mA, 0.0f, 10.0f);
    
    return {sv.value, sv.quality == Quality::OK ? SensorQuality::OK : SensorQuality::FAULT};
}

// Polling Modbus
void HAL_ESP32::pollModbus() {
    if (millis() - lastModbusPoll < 1000) return; // 1 second interval
    lastModbusPoll = millis();

    for (int h = 0; h < 2; h++) {
        ModbusMaster* node = (h == 0) ? &node1 : &node2;
        // Read Holding Registers (Function 03) - Novus PV, SV, MV, Status etc.
        // According to Novus N2000S manual, PV is usually 0000, SV is 0001
        // (Verify registers on physical device as requested!)
        uint8_t result = node->readHoldingRegisters(0, 4); // VALIDAR NO EQUIPAMENTO
        
        if (result == node->ku8MBSuccess) {
            modbusData[h].pv = node->getResponseBuffer(0) / 10.0f; // Assuming 1 decimal
            modbusData[h].sv = node->getResponseBuffer(1) / 10.0f;
            modbusData[h].mv = node->getResponseBuffer(2) / 10.0f; // Could be MV
            uint16_t status = node->getResponseBuffer(3);
            modbusData[h].a1 = (status & 0x01) != 0; // Validate bitmask
            modbusData[h].a2 = (status & 0x02) != 0; // Validate bitmask
            modbusData[h].commOk = true;
        } else {
            modbusData[h].commOk = false;
        }
    }
}

AnalogValue HAL_ESP32::getNovusPV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    return {modbusData[h].pv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
}
AnalogValue HAL_ESP32::getNovusSV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    return {modbusData[h].sv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
}
AnalogValue HAL_ESP32::getNovusMV(int h) {
    if (h < 0 || h > 1) return {0.0f, SensorQuality::COMM_LOST};
    return {modbusData[h].mv, modbusData[h].commOk ? SensorQuality::OK : SensorQuality::COMM_LOST};
}
bool HAL_ESP32::getNovusA1(int h) {
    if (h < 0 || h > 1) return false;
    return modbusData[h].a1;
}
bool HAL_ESP32::getNovusA2(int h) {
    if (h < 0 || h > 1) return false;
    return modbusData[h].a2;
}
bool HAL_ESP32::isNovusCommOk(int h) {
    if (h < 0 || h > 1) return false;
    return modbusData[h].commOk;
}

unsigned long HAL_ESP32::millis() {
    return ::millis();
}

void HAL_ESP32::saveConfig(const std::string& key, const std::string& value) {
    preferences.putString(key.c_str(), value.c_str());
}

std::string HAL_ESP32::loadConfig(const std::string& key, const std::string& default_val) {
    return preferences.getString(key.c_str(), default_val.c_str()).c_str();
}

#endif
