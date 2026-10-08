#include "tank_logic.h"
#include "alarm_engine.h"

TankLogic::TankLogic() 
    : isAuto(true), pumpCmd(false), lowLevelLatched(false), timeoutLatched(false),
      lowLevelTimer(0.0f), pumpOffTimer(30.0f), pumpOnTimer(0.0f), fbTimer(0.0f), 
      timeSinceBoot(0.0f), lastPumpCmd(false) {}

void TankLogic::update(const TankInputs& in, float dt, AlarmEngine* alarms) {
    timeSinceBoot += dt;

    // Nível Baixo (com atraso de 2s)
    if (!in.levelNormal) {
        lowLevelTimer += dt;
        if (lowLevelTimer >= 2.0f) {
            lowLevelLatched = true;
        }
    } else {
        lowLevelTimer = 0.0f;
    }

    // Se houver trava de nível baixo ou tempo máximo
    if (lowLevelLatched || timeoutLatched) {
        pumpCmd = false;
    }

    // Lógica Automática
    if (isAuto && !lowLevelLatched && !timeoutLatched) {
        if (in.pressureLow) {
            if (!pumpCmd && pumpOffTimer >= 30.0f) {
                pumpCmd = true;
            }
        } else {
            pumpCmd = false;
        }
    }

    if (!isAuto) {
        pumpCmd = false; // "Não existe ligar manual"
    }

    // Timers da Bomba
    if (pumpCmd) {
        pumpOffTimer = 0.0f;
        pumpOnTimer += dt;
        if (pumpOnTimer > 600.0f) { // 10 minutos
            pumpCmd = false;
            timeoutLatched = true; // Trava
        }
    } else {
        pumpOnTimer = 0.0f;
        pumpOffTimer += dt;
    }

    // Start limits (max 10 / hour)
    if (pumpCmd && !lastPumpCmd) {
        startsHistory.push_back(timeSinceBoot);
    }
    
    // Clean old history (> 3600s)
    while (!startsHistory.empty() && (timeSinceBoot - startsHistory.front() > 3600.0f)) {
        startsHistory.erase(startsHistory.begin());
    }

    // Feedback Timer
    if (pumpCmd && !in.pumpFb) {
        fbTimer += dt;
    } else {
        fbTimer = 0.0f;
    }

    lastPumpCmd = pumpCmd;

    // Report Alarms
    if (alarms) {
        alarms->reportTankAlarms(lowLevelLatched, timeoutLatched, startsHistory.size() > 10, fbTimer > 5.0f);
    }
}

TankState TankLogic::getState() const {
    TankState s;
    s.levelNormal = !lowLevelLatched; // Publica como state
    s.pressureLow = pumpCmd; // Simplified for state, actually we publish pumpCmd
    s.pumpCmd = pumpCmd;
    s.pumpFb = lastPumpCmd; // This will be overriden by actual input in main
    s.isAuto = isAuto;
    s.isLatched = lowLevelLatched || timeoutLatched;
    return s;
}

void TankLogic::resetCommand() {
    lowLevelLatched = false;
    timeoutLatched = false;
}

void TankLogic::autoCommand() {
    isAuto = true;
}

void TankLogic::stopCommand() {
    isAuto = false;
    pumpCmd = false;
}
