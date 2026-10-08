#ifndef HAL_H
#define HAL_H

#include <stdint.h>
#include <string>

enum class SensorQuality {
    OK,
    FAULT,
    NOT_MEASURED,
    COMM_LOST
};

struct AnalogValue {
    float value;
    SensorQuality quality;
};

// Interface Abstrata para Hardware
class HAL {
public:
    virtual ~HAL() = default;

    // Saídas Digitais
    virtual void setBurnerCmd(int heaterIndex, bool state) = 0;
    virtual void setPumpCmd(int heaterIndex, bool state) = 0;
    virtual void setTx01PumpCmd(bool state) = 0;
    virtual void setBuzzer(bool state) = 0;

    // Entradas Digitais
    virtual bool getLflLockout(int heaterIndex) = 0;
    virtual bool getLflGasValves(int heaterIndex) = 0;
    virtual bool getLflFan(int heaterIndex) = 0;
    virtual bool getSafetyChainOk(int heaterIndex) = 0;
    virtual bool getPumpFb(int heaterIndex) = 0;
    virtual bool getNovusA1(int heaterIndex) = 0;
    virtual bool getNovusA2(int heaterIndex) = 0;
    virtual bool getEStopOk() = 0;
    virtual bool getTx01LevelSw() = 0;
    virtual bool getTx01PressSw() = 0;
    virtual bool getTx01PumpFb() = 0;

    // Entradas Analógicas
    virtual AnalogValue getTemperature(int heaterIndex) = 0;
    virtual AnalogValue getPressure(int heaterIndex) = 0;

    // Modbus (apenas dados providos pelo serviço Modbus, integrados aqui para mock)
    virtual AnalogValue getNovusPV(int heaterIndex) = 0;
    virtual AnalogValue getNovusSV(int heaterIndex) = 0;
    virtual AnalogValue getNovusMV(int heaterIndex) = 0;
    virtual bool isNovusCommOk(int heaterIndex) = 0;

    // Tempo
    virtual unsigned long millis() = 0;

    // NVS Storage
    virtual void saveConfig(const std::string& key, const std::string& value) = 0;
    virtual std::string loadConfig(const std::string& key, const std::string& defaultValue) = 0;
};

#endif // HAL_H
