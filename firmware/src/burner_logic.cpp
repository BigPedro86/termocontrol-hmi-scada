#include "burner_logic.h"
#include "config.h"
#include <sstream>
#include <time.h>

BurnerLogic::BurnerLogic(int id, HAL* hal) : phase(BurnerPhase::OFF), permission(false), requested(false),
    purgeTimer(0), swLimitLatched(false), totalUptime(0),
    runHoursCont(0), force24hStop(false), ignitionTimeout(false), 
    discrepancy(false), discGasNoPerm(false), discGasNoFan(false), discTimer(0), noFanTimer(0),
    pumpFbTimer(0), prevCmdStart(false), prevLockout(false), swLimitResetPending(false),
    heaterId(id), hal_ptr(hal), lastTemp(0), lastSwLimit(90.0f) {
    _loadLockouts();
}

void BurnerLogic::startBurner() {
    requested = true;
}

void BurnerLogic::stopBurner() {
    requested = false;
    ignitionTimeout = false;
}

void BurnerLogic::resetFaults() {
    discrepancy = false;
    discGasNoPerm = false;
    discGasNoFan = false;
}

bool BurnerLogic::isConditionStillActive() const {
    if (discGasNoFan && lastGasValves && !lastFan) return true;
    if (discGasNoPerm && lastGasValves && !lastTentativePerm) return true;
    return false;
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
    for (uint32_t t : lockoutTimes) {
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
            try { lockoutTimes.push_back(std::stoul(token)); } catch(...) {}
        }
        val.erase(0, pos + 1);
    }
}

void BurnerLogic::update(const HeaterInputs& inputs, float deltaTimeS) {
    static bool firstRun[2] = {true, true};
    if (firstRun[heaterId]) {
        firstRun[heaterId] = false;
        prevLockout = inputs.lockout;
    }

    if (inputs.cmd_stop) {
        requested = false;
        ignitionTimeout = false; 
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
    
    time_t nowTime;
    time(&nowTime);
    uint32_t currentEpoch = (uint32_t)nowTime;
    if (currentEpoch < 100000) {
        currentEpoch = inputs.uptime_s; // fallback to uptime if NTP not synced
    }
    
    if (inputs.lockout && !prevLockout) {
        lockoutTimes.push_back(currentEpoch);
        _saveLockouts();
    }
    prevLockout = inputs.lockout;
    
    bool changed = false;
    while (!lockoutTimes.empty()) {
        uint32_t oldest = lockoutTimes.front();
        if (currentEpoch >= oldest && (currentEpoch - oldest) > config.continuousRunMaxSec) {
            lockoutTimes.erase(lockoutTimes.begin());
            changed = true;
        } else if (currentEpoch < oldest && (oldest - currentEpoch) > config.continuousRunMaxSec) {
             // In case it was an epoch but now it's uptime, don't delete to be conservative.
             // Or if clock jumped back. We keep it.
             break;
        } else {
             break;
        }
    }
    if (changed) _saveLockouts();
    
    if (phase == BurnerPhase::PURGE) {
        purgeTimer += deltaTimeS;
        if (purgeTimer > config.ignitionTimeoutSec) {
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
    
    lastGasValves = inputs.gasValves;
    lastFan = inputs.fan;
    
    // N7: Discrepancy checks (must run after checkInterlocks sets permission)
    if (inputs.gasValves && !permission) {
        discTimer += deltaTimeS;
        if (discTimer > config.discGraceSec) {
            discGasNoPerm = true;
            discrepancy = true;
        }
    } else {
        discTimer = 0.0f;
    }
    
    if (inputs.gasValves && !inputs.fan) {
        noFanTimer += deltaTimeS;
        if (noFanTimer > config.noFanGraceSec) {
            discGasNoFan = true;
            discrepancy = true;
        }
    } else {
        noFanTimer = 0.0f;
    }
    
    // Check if discrepancy modifies permission (if it just triggered)
    if (discrepancy) {
        permission = false;
    }
}

void BurnerLogic::checkInterlocks(const HeaterInputs& inputs) {
    blockReasons.clear();
    
    if (!requested) {
        blockReasons.push_back("NOT_REQUESTED");
    }
    if (inputs.tankLowLevel) {
        blockReasons.push_back("TANK_LOW_LEVEL");
    }
    if (inputs.ioModuleFault) {
        blockReasons.push_back("IO_MODULE_FAULT");
    }
    if (!inputs.chainOk) {
        blockReasons.push_back("SAFETY_CHAIN_OPEN");
    }
    if (!inputs.estopOk) {
        requested = false;
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
    
    if (runHoursCont >= config.continuousRunMaxSec) {
        force24hStop = true;
    }
    
    if (force24hStop && phase == BurnerPhase::OFF) {
        force24hStop = false;
    }

    if (force24hStop) {
        blockReasons.push_back("24H_CONTINUOUS_STOP");
    }
    
    lastTentativePerm = blockReasons.empty();
    
    if (discGasNoPerm) {
        blockReasons.push_back("DISCREPANCY_GAS_WITHOUT_PERM");
    }
    if (discGasNoFan) {
        blockReasons.push_back("DISCREPANCY_GAS_WITHOUT_FAN");
    }
    if (ignitionTimeout) {
        blockReasons.push_back("IGNITION_TIMEOUT");
    }
    if (pumpFbTimer < config.pumpProofSec) {
        blockReasons.push_back("NO_PUMP_FLOW");
    }
    
    permission = blockReasons.empty();
}

void BurnerLogic::evaluatePhase(const HeaterInputs& inputs) {
    if (inputs.lockout) {
        phase = BurnerPhase::LOCKOUT;
        return;
    }
    
    if (inputs.gasValves && inputs.fan) {
        phase = BurnerPhase::RUNNING;
        return;
    }
    
    if (inputs.fan && !inputs.gasValves) {
        if (permission && phase != BurnerPhase::RUNNING && phase != BurnerPhase::POST_PURGE) {
            phase = BurnerPhase::PURGE;
        } else {
            phase = BurnerPhase::POST_PURGE;
        }
        return;
    }
    
    if (!inputs.fan && permission) {
        phase = BurnerPhase::STANDBY;
        return;
    }
    bool onlyPumpMissing = true;
    for (const auto& br : blockReasons) {
        if (br != "NO_PUMP_FLOW" && br != "NOT_REQUESTED") {
            onlyPumpMissing = false;
            break;
        }
    }
    
    if (requested && onlyPumpMissing) {
        phase = BurnerPhase::WAIT_PUMP;
        return;
    }
    
    phase = BurnerPhase::OFF;
}
