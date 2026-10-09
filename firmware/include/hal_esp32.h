#pragma once

#include "hal.h"
#include <Arduino.h>
#include <atomic>
#include <Adafruit_MCP23X17.h>
#include <Adafruit_ADS1X15.h>
#include <Adafruit_MAX31865.h>
#include "ModbusClientRTU.h"
#include <Preferences.h>
#include "io_map.h"
#include "mcp_filter.h"

class HAL_ESP32 : public HAL {
public:
    HAL_ESP32();
    void begin();

    // Outputs
    void setBurnerCmd(int h, bool state) override;
    void setPumpCmd(int h, bool state) override;
    void setTx01PumpCmd(bool state) override;
    void setBuzzer(bool state) override;

    // Digital Inputs
    bool getLflLockout(int h) override;
    bool getLflGasValves(int h) override;
    bool getLflFan(int h) override;
    bool getSafetyChainOk(int h) override;
    bool getPumpFb(int h) override;
    bool getEStopOk() override;
    bool getTx01LevelSw() override;
    bool getTx01PressSw() override;
    bool getTx01PumpFb() override;

    // Analog Inputs
    AnalogValue getTemperature(int h) override;
    AnalogValue getPressure(int h) override;
    
    // Modbus
    AnalogValue getNovusPV(int h) override;
    AnalogValue getNovusSV(int h) override;
    AnalogValue getNovusMV(int h) override;
    bool getNovusA1(int h) override;
    bool getNovusA2(int h) override;
    bool isNovusCommOk(int h) override;

    // Utils
    bool isIoFault() override;
    unsigned long millis() override;
    void saveConfig(const std::string& key, const std::string& value) override;
    std::string loadConfig(const std::string& key, const std::string& default_val) override;

    // For Modbus periodic poll
    void pollModbus();

private:
    Adafruit_MCP23X17 mcp;
    Adafruit_ADS1115 ads;
    Adafruit_MAX31865* pt100[2];
    Preferences preferences;

    // Filtro MCP
    static void mcpTask(void *pvParameters);
    MCPFilter mcpFilter;
    uint32_t inputFilterMs;
    std::atomic<bool> buzzerState{false};
    SemaphoreHandle_t i2cMutex;

    // Modbus states
    struct ModbusData {
        float pv;
        float sv;
        float mv;
        bool commOk;
        uint32_t lastSuccessTime;
    };
    ModbusData modbusData[2];
    ModbusClientRTU* MB;
    unsigned long lastModbusPoll;
    int modbusCurrentSlave;
    portMUX_TYPE modbusMux = portMUX_INITIALIZER_UNLOCKED;

    bool getFilteredInput(int pin);
};
