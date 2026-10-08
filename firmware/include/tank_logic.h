#pragma once

#include "types.h"
#include <string>
#include <vector>

class AlarmEngine; // Forward declaration

class TankLogic {
public:
    TankLogic();

    void update(const TankInputs& in, float dt, AlarmEngine* alarms);

    bool isLowLevel() const { return lowLevelLatched; }
    TankState getState() const;

    void resetCommand();
    void autoCommand();
    void stopCommand();

private:
    bool isAuto;
    bool pumpCmd;
    bool lowLevelLatched;
    bool timeoutLatched;
    
    float lowLevelTimer;
    float pumpOffTimer;
    float pumpOnTimer;
    float fbTimer;
    
    // Starts per hour
    std::vector<float> startsHistory;
    float timeSinceBoot;

    bool lastPumpCmd;
};
