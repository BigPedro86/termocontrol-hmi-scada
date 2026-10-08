#pragma once
#include <string>

class PumpLogic {
public:
    PumpLogic(float postPurgeTimeS = 180.0f);
    
    void update(bool startCmd, bool stopCmd, bool forceStop, bool fb, float deltaTimeS);
    
    bool getCmd() const { return cmd; }
    bool isFault() const { return fault; }
    
    void startPump();
    void stopPump();
    
private:
    bool cmd;
    bool requested;
    bool fault;
    float noFbTimer;
    float postPurgeTimer;
    float postPurgeConfigS;
};
