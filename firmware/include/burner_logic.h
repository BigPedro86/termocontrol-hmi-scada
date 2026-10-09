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
    
    float getPhaseTime() const { return purgeTimer; }
    int getStarts() const { return 0; } // TODO: track starts
    bool getRequested() const { return requested; }
    int getLockouts24h() const { return lockoutTimes.size(); }
    float getRunHours() const { return 0.0f; }

    void startBurner();
    void stopBurner();
    void resetFaults();
    bool isConditionStillActive() const;
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
    
    bool lastGasValves;
    bool lastFan;
    bool lastTentativePerm;
    
    float purgeTimer;
    bool swLimitLatched;
    std::vector<uint32_t> lockoutTimes;
    float totalUptime; // Kept for other uses if needed, but lockout uses absolute epoch
    bool ignitionTimeout;
    
    // Discrepancy
    bool discrepancy;
    bool discGasNoPerm;
    bool discGasNoFan;
    float discTimer;
    float noFanTimer;
    
    float pumpFbTimer;
    bool prevCmdStart;
    bool prevLockout;
    bool swLimitResetPending;
    
    int heaterId;
    HAL* hal_ptr;
    float lastTemp;
    float lastSwLimit;
    
    void evaluatePhase(const HeaterInputs& inputs);
    void checkInterlocks(const HeaterInputs& inputs);
};
