#include "tank_logic.h"
#include "alarm_engine.h"
#include "config.h"

TankLogic::TankLogic() 
    : isAuto(true), pumpCmd(false), lowLevelLatched(false), timeoutLatched(false), pumpFaultLatched(false),
      currentLevelNormal(true), currentPressureLow(false), currentPumpFb(false),
      lowLevelTimer(0.0f), pumpOffTimer(9999.0f), pumpOnTimer(0.0f), fbTimer(0.0f), 
      timeSinceBoot(0.0f), lastPumpCmd(false) {}

void TankLogic::update(const TankInputs& in, float dt, AlarmEngine* alarms) {
    timeSinceBoot += dt;
    currentLevelNormal = in.levelNormal;
    currentPressureLow = in.pressureLow;
    currentPumpFb = in.pumpFb;

    // Nível Baixo
    if (!in.levelNormal) {
        lowLevelTimer += dt;
        if (lowLevelTimer >= config.tankLevelGraceSec) {
            lowLevelLatched = true;
        }
    } else {
        lowLevelTimer = 0.0f;
    }

    // Se houver trava de nível baixo, tempo máximo, ou falha de retorno da bomba
    if (lowLevelLatched || timeoutLatched || pumpFaultLatched) {
        pumpCmd = false;
    }

    // Lógica Automática
    if (isAuto && !lowLevelLatched && !timeoutLatched && !pumpFaultLatched) {
        if (in.pressureLow) {
            if (!pumpCmd && pumpOffTimer >= config.tankPumpRunDelaySec) {
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
        if (pumpOnTimer > config.tankPumpMaxRunSec) {
            pumpCmd = false;
            timeoutLatched = true; // Trava
        }
    } else {
        pumpOnTimer = 0.0f;
        pumpOffTimer += dt;
    }

    // Start limits
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
        if (fbTimer > config.pumpFeedbackTimeoutSec) {
            pumpFaultLatched = true;
            pumpCmd = false;
        }
    } else {
        fbTimer = 0.0f;
    }

    lastPumpCmd = pumpCmd;

    // Report Alarms
    if (alarms) {
        alarms->reportTankAlarms(lowLevelLatched, timeoutLatched, startsHistory.size() > (size_t)config.tankPumpMaxStartsHour, pumpFaultLatched);
    }
}

TankState TankLogic::getState() const {
    TankState s;
    s.levelNormal = currentLevelNormal;
    s.pressureLow = currentPressureLow;
    s.pumpCmd = pumpCmd;
    s.pumpFb = currentPumpFb;
    s.isAuto = isAuto;
    s.isLatched = lowLevelLatched || timeoutLatched || pumpFaultLatched;
    s.lowLevelLatched = lowLevelLatched;
    s.timeoutLatched = timeoutLatched;
    s.pumpFault = pumpFaultLatched;
    return s;
}

void TankLogic::resetCommand() {
    lowLevelLatched = false;
    timeoutLatched = false;
    // pumpFaultLatched is not reset here (it is reset in autoCommand)
}

void TankLogic::autoCommand() {
    isAuto = true;
    pumpFaultLatched = false; // TX01_AUTO limpa pumpFault
}

void TankLogic::stopCommand() {
    isAuto = false;
    pumpCmd = false;
}
