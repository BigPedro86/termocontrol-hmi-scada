#ifndef CONFIG_H
#define CONFIG_H

#include <string>

enum BehaviorOnServerLoss {
    STOP_BURNERS,
    CONTINUE_LOCAL
};

struct SystemConfig {
    // PROVISÓRIO - responsável técnico define
    float tempSoftwareLimit = 90.0f; // PROVISÓRIO — responsável técnico define
    float tempWarnC = 85.0f;
    float swLimitResetMarginC = 5.0f;
    float minPressure = 1.0f; // PROVISÓRIO — responsável técnico define
    float maxPressure = 6.0f;
    int pumpPostCirculationSec = 180; // PROVISÓRIO — responsável técnico define
    int pumpFeedbackTimeoutSec = 5;
    int ignitionTimeoutSec = 60;
    int maxLockouts24h = 3; // PROVISÓRIO — responsável técnico define
    float maxTempDivergence = 5.0f; // Diferença PT100 vs Modbus PV
    bool checkTempDivergence = false; // Desativado até confirmar medição
    int modbusTimeoutMs = 5000;
    
    // N13: Parâmetros centralizados
    float discGraceSec = 3.0f;
    float noFanGraceSec = 2.0f;
    float pumpProofSec = 10.0f;
    float continuousRunMaxSec = 86400.0f;
    float tankLevelGraceSec = 2.0f;
    float tankPumpRunDelaySec = 30.0f;
    float tankPumpMaxRunSec = 600.0f;
    int tankPumpMaxStartsHour = 10;
    
    BehaviorOnServerLoss onServerLoss = STOP_BURNERS; // PROVISÓRIO — responsável técnico define

    // SCADA Server config
    std::string serverIp = "";
    int serverPort = 3000;
    std::string deviceSecret = "";
};

extern SystemConfig config;

#endif // CONFIG_H
