#ifndef CONFIG_H
#define CONFIG_H

#include <string>

enum BehaviorOnServerLoss {
    STOP_BURNERS,
    CONTINUE_LOCAL
};

struct SystemConfig {
    // PROVISÓRIO - responsável técnico define
    float tempSoftwareLimit = 90.0f; 
    float minPressure = 1.0f;
    float maxPressure = 6.0f;
    int pumpPostCirculationSec = 180;
    int pumpFeedbackTimeoutSec = 5;
    int ignitionTimeoutSec = 60;
    int maxLockouts24h = 3;
    float maxTempDivergence = 5.0f; // Diferença PT100 vs Modbus PV
    bool checkTempDivergence = false; // Desativado até confirmar medição
    int modbusTimeoutMs = 5000;
    BehaviorOnServerLoss onServerLoss = STOP_BURNERS;

    // SCADA Server config
    std::string serverIp = "";
    int serverPort = 3000;
    std::string deviceSecret = "";
};

extern SystemConfig config;

#endif // CONFIG_H
