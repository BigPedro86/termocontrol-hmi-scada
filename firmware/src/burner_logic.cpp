#include "burner_logic.h"

#include "config.h"

#include "config.h"
#include <sstream>

BurnerLogic::BurnerLogic(int id, HAL* hal) : phase(BurnerPhase::OFF), permission(false), requested(false),
    purgeTimer(0), swLimitLatched(false), totalUptime(0),
    runHoursCont(0), force24hStop(false), ignitionTimeout(false), discrepancy(false),
    pumpFbTimer(0), prevCmdStart(false), swLimitResetPending(false),
    heaterId(id), hal_ptr(hal), lastTemp(0), lastSwLimit(90.0f) {
    _loadLockouts();
}

void BurnerLogic::startBurner() {
    requested = true;
}

void BurnerLogic::stopBurner() {
    requested = false;
    ignitionTimeout = false;
    discrepancy = false;
}

void BurnerLogic::resetSoftwareLimit() {
    swLimitResetPending = true;
}

bool BurnerLogic::canResetSwLimit() const {
    return lastTemp < (lastSwLimit - 5.0f);
}

void BurnerLogic::resetLockoutCount() {
    lockoutTimes.clear();
    _saveLockouts();
}

void BurnerLogic::_saveLockouts() {
    if (!hal_ptr) return;
    std::string key = "AQ0" + std::to_string(heaterId + 1) + "_LCK";
    std::string val = "";
    for (float t : lockoutTimes) {
        val += std::to_string(t) + ";";
    }
    hal_ptr->saveConfig(key, val);
}

void BurnerLogic::_loadLockouts() {
    if (!hal_ptr) return;
    std::string key = "AQ0" + std::to_string(heaterId + 1) + "_LCK";
    std::string val = hal_ptr->loadConfig(key, "");
    lockoutTimes.clear();
    
    size_t pos = 0;
    while ((pos = val.find(";")) != std::string::npos) {
        std::string token = val.substr(0, pos);
        if (!token.empty()) {
            try { lockoutTimes.push_back(std::stof(token)); } catch(...) {}
        }
        val.erase(0, pos + 1);
    }
}

void BurnerLogic::update(const HeaterInputs& inputs, float deltaTimeS) {
    if (inputs.cmd_stop) {
        requested = false;
        ignitionTimeout = false; 
        discrepancy = false;     
    } else if (inputs.cmd_start && !prevCmdStart) {
        requested = true;
    }
    prevCmdStart = inputs.cmd_start;
    
    if (inputs.swLimitResetCmd || swLimitResetPending) {
        swLimitResetPending = false;
        if (inputs.temp.value < inputs.swLimit - 5.0f) {
            swLimitLatched = false;
        }
    }
    
    lastTemp = inputs.temp.value;
    lastSwLimit = inputs.swLimit;
    
    totalUptime += deltaTimeS;
    
    if (inputs.lockout && phase != BurnerPhase::LOCKOUT) {
        lockoutTimes.push_back(totalUptime);
        _saveLockouts();
    }
    
    bool changed = false;
    while (!lockoutTimes.empty() && (totalUptime - lockoutTimes.front()) > 86400.0f) {
        lockoutTimes.erase(lockoutTimes.begin());
        changed = true;
    }
    if (changed) _saveLockouts();
    
    // Evaluate if we are in purge for too long
    if (phase == BurnerPhase::PURGE) {
        purgeTimer += deltaTimeS;
        if (purgeTimer > 60.0f) {
            ignitionTimeout = true;
        }
    } else {
        purgeTimer = 0.0f;
    }
    
    if (phase == BurnerPhase::RUNNING) {
        runHoursCont += deltaTimeS;
    } else {
        runHoursCont = 0.0f;
    }
    
    if (inputs.pumpFb) {
        pumpFbTimer += deltaTimeS;
    } else {
        pumpFbTimer = 0.0f;
    }

    checkInterlocks(inputs);
    evaluatePhase(inputs);
}

void BurnerLogic::checkInterlocks(const HeaterInputs& inputs) {
    blockReasons.clear();
    
    if (!requested) {
        blockReasons.push_back("NOT_REQUESTED");
    }
    if (inputs.tankLowLevel) {
        blockReasons.push_back("TANK_LOW_LEVEL");
    }
    if (!inputs.chainOk) {
        blockReasons.push_back("SAFETY_CHAIN_OPEN");
    }
    if (!inputs.estopOk) {
        blockReasons.push_back("ESTOP_PRESSED");
    }
    if (inputs.lockout) {
        blockReasons.push_back("LFL_LOCKOUT");
    }
    if (lockoutTimes.size() >= config.maxLockouts24h) {
        blockReasons.push_back("MAX_LOCKOUTS_24H");
    }
    if (inputs.temp.quality != Quality::OK) {
        blockReasons.push_back("TEMP_SENSOR_FAULT");
    }
    if (inputs.press.quality != Quality::OK) {
        blockReasons.push_back("PRESS_SENSOR_FAULT");
    }
    if (inputs.press.value < config.minPressure || inputs.press.value > config.maxPressure) {
        blockReasons.push_back("PRESSURE_OUT_OF_RANGE");
    }
    
    if (inputs.temp.value >= inputs.swLimit && inputs.temp.quality == Quality::OK) {
        swLimitLatched = true;
    }
    if (swLimitLatched) {
        blockReasons.push_back("SW_TEMP_LIMIT_LATCHED");
    }
    
    if (runHoursCont >= 86400.0f) {
        force24hStop = true;
    }
    
    if (force24hStop && phase == BurnerPhase::OFF) {
        force24hStop = false;
    }

    if (force24hStop) {
        blockReasons.push_back("24H_CONTINUOUS_STOP");
    }
    
    bool tentativePerm = blockReasons.empty();
    if (!tentativePerm && inputs.gasValves && phase != BurnerPhase::RUNNING) {
        discrepancy = true;
    }

    if (discrepancy) {
        blockReasons.push_back("DISCREPANCY_GAS_WITHOUT_PERM");
    }
    if (ignitionTimeout) {
        blockReasons.push_back("IGNITION_TIMEOUT");
    }
    if (pumpFbTimer < 10.0f) {
        blockReasons.push_back("PUMP_FB_WAIT_10S");
    }
    
    permission = blockReasons.empty();
}

void BurnerLogic::evaluatePhase(const HeaterInputs& inputs) {
    if (inputs.lockout) {
        phase = BurnerPhase::LOCKOUT;
        return;
    }
    
    if (!permission) {
        if (inputs.fan) {
            phase = BurnerPhase::POST_PURGE;
        } else {
            phase = BurnerPhase::OFF;
        }
        return;
    }
    
    if (inputs.gasValves && inputs.fan) {
        phase = BurnerPhase::RUNNING;
    } else if (inputs.fan && !inputs.gasValves) {
        phase = BurnerPhase::PURGE;
    } else {
        phase = BurnerPhase::WAIT_PUMP;
    }
}
