#include "pump_logic.h"
#include "config.h"

PumpLogic::PumpLogic() : cmd(false), requested(false), fault(false),
    noFbTimer(0), postPurgeTimer(0) {}

void PumpLogic::startPump() {
    requested = true;
}

void PumpLogic::stopPump() {
    requested = false;
    fault = false;
    postPurgeTimer = 0.0f;
}

void PumpLogic::update(bool burnerReq, bool stopCmd, bool forceStop, bool lockStart, bool fb, float deltaTimeS) {
    if (stopCmd) {
        requested = false;
        fault = false; // reset fault on STOP
    }
    
    bool active = (requested || burnerReq) && !lockStart;
    if (stopCmd) {
        active = false; // STOP overrides all
    }
    
    if (fault) {
        cmd = false;
        return;
    }
    
    if (forceStop) {
        cmd = false;
        postPurgeTimer = 0.0f;
        return;
    }
    
    if (active) {
        cmd = true;
        postPurgeTimer = (float)config.pumpPostCirculationSec;
    } else {
        postPurgeTimer -= deltaTimeS;
        if (postPurgeTimer > 0.0f) {
            cmd = true;
        } else {
            cmd = false;
            postPurgeTimer = 0.0f;
        }
    }
    
    if (cmd && !fb) {
        noFbTimer += deltaTimeS;
        if (noFbTimer > config.pumpFeedbackTimeoutSec) {
            fault = true;
            cmd = false;
        }
    } else {
        noFbTimer = 0.0f;
    }
}
