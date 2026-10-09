#include "pump_logic.h"
#include "config.h"

PumpLogic::PumpLogic(float postPurgeTimeS) : cmd(false), requested(false), fault(false),
    noFbTimer(0), postPurgeTimer(0), postPurgeConfigS(postPurgeTimeS) {}

void PumpLogic::startPump() {
    requested = true;
}

void PumpLogic::stopPump() {
    requested = false;
    fault = false;
}

void PumpLogic::update(bool startCmd, bool stopCmd, bool forceStop, bool fb, float deltaTimeS) {
    if (stopCmd) {
        requested = false;
        fault = false; // reset fault on STOP
    }
    
    bool active = requested || startCmd;
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
        postPurgeTimer = postPurgeConfigS;
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
