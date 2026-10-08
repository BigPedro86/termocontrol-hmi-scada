#ifndef ALARM_ENGINE_H
#define ALARM_ENGINE_H

#include <vector>
#include <string>
#include "hal.h"

struct AlarmDef {
    std::string code;
    std::string description;
    char severity; // 'H' or 'C' (Critical/HH)
    bool active;
    bool latched;
    unsigned long since;
};

class AlarmEngine {
private:
    std::vector<AlarmDef> alarms;
    HAL* hal;

    void updateAlarm(const std::string& code, const std::string& desc, char sev, bool condition, bool isLatchable = true);
    bool isAlarmActive(const std::string& code) const;

public:
    AlarmEngine(HAL* hardware);

    void process(int heaterIndex, float temp, float press, bool tempFault, bool pressFault, 
                 bool lflLockout, bool pumpFault, bool discrepGasNoPerm, bool discrepGasNoFan, bool noFlame60s, bool novusCommLost);
                 
    void reportTankAlarms(bool lowLevel, bool timeout, bool freq, bool pumpFault);
    
    void ackAlarm(const std::string& code);
    void resetLatched(const std::string& code);

    const std::vector<AlarmDef>& getAlarms() const { return alarms; }
    bool hasActiveAlarms() const;
    bool hasCriticalAlarms() const;
};

#endif // ALARM_ENGINE_H
