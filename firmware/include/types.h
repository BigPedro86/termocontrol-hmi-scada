#pragma once
#include <string>
#include <vector>
#include <cstdint>

enum class BurnerPhase {
    OFF,
    WAIT_PUMP,
    STANDBY,
    PURGE,
    RUNNING,
    POST_PURGE,
    LOCKOUT
};

enum class Quality {
    OK,
    FAULT,
    NOT_MEASURED,
    COMM_LOST
};

struct SensorValue {
    float value;
    Quality quality;
    float raw_mA;
};

inline SensorValue convert4_20mA(float mA, float minScale, float maxScale) {
    // NAMUR NE43 compliant fault detection
    if (mA < 3.6f || mA > 21.0f) {
        return {0.0f, Quality::FAULT, mA};
    }
    float clamped_mA = mA;
    if (clamped_mA < 4.0f) clamped_mA = 4.0f;
    if (clamped_mA > 20.0f) clamped_mA = 20.0f;
    float value = minScale + ((clamped_mA - 4.0f) / 16.0f) * (maxScale - minScale);
    return {value, Quality::OK, mA};
}

struct AlarmsState {
    bool aq01_temp_h;
    bool aq01_temp_hh;
    bool aq02_temp_h;
    bool aq02_temp_hh;
    // ... we will manage alarms via a map in AlarmEngine
};

struct NovusState {
    bool commOk;
    float pv;
    float sp;
    float mv;
    bool autoMode;
    bool alarms[2];
    Quality quality;
};

struct HeaterInputs {
    bool cmd_start;
    bool cmd_stop;
    bool chainOk;
    bool estopOk;
    bool pumpFb;
    bool lockout;
    bool gasValves;
    bool fan;
    SensorValue temp;
    SensorValue press;
    NovusState novus;
    float swLimit;
    bool swLimitResetCmd;
    uint32_t uptime_s;
    bool tankLowLevel; // Adicionado para intertravamento
    bool ioModuleFault;
};

struct TankState {
    bool levelNormal;
    bool pressureLow;
    bool pumpCmd;
    bool pumpFb;
    bool isAuto;
    bool isLatched;
    bool lowLevelLatched;
    bool timeoutLatched;
    bool pumpFault;
    int startsLastHour;
};

struct TankInputs {
    bool levelNormal;
    bool pressureLow;
    bool pumpFb;
    bool autoCmd;
    bool stopCmd;
    bool resetCmd;
};
