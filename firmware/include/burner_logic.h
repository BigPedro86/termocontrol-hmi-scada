#pragma once
#include "types.h"
#include <string>
#include <vector>

#include "hal.h"

class BurnerLogic {
public:
    BurnerLogic(int id = 0, HAL* hal = nullptr);
    
    void update(const HeaterInputs& inputs, float deltaTimeS);
    
    BurnerPhase getPhase() const { return phase; }
    bool getPermission() const { return permission; }
    const std::vector<std::string>& getBlockReasons() const { return blockReasons; }
    bool isSwLimitLatched() const { return swLimitLatched; }
    bool isIgnitionTimeout() const { return ignitionTimeout; }
    bool hasDiscrepancy() const { return discrepancy; }

    void startBurner();
    void stopBurner();
    void resetSoftwareLimit();
    void resetLockoutCount();
    
    bool canResetSwLimit() const;
    void _saveLockouts();
    void _loadLockouts();

private:
    BurnerPhase phase;
    bool permission;
    bool requested;
    std::vector<std::string> blockReasons;
    
    float purgeTimer;
    bool swLimitLatched;
    std::vector<float> lockoutTimes;
    float totalUptime;
    float runHoursCont;
    bool force24hStop;
    bool ignitionTimeout;
    bool discrepancy;
    
    float pumpFbTimer;
    bool prevCmdStart;
    bool swLimitResetPending;
    
    int heaterId;
    HAL* hal_ptr;
    float lastTemp;
    float lastSwLimit;
    
    void evaluatePhase(const HeaterInputs& inputs);
    void checkInterlocks(const HeaterInputs& inputs);
};
