#include "alarm_engine.h"
#include "config.h"

AlarmEngine::AlarmEngine(HAL* hardware) : hal(hardware), silenced(false) {
    // 5. No boot, um alarme momentâneo "Controlador ESP32 reiniciado" (severidade H), que fica até ser reconhecido.
    updateAlarm("SYS_ESP32_RESTART", "Controlador ESP32 reiniciado", 'H', true, false);
    // make it inactive immediately so it clears when acked
    for (auto& a : alarms) {
        if (a.code == "SYS_ESP32_RESTART") {
            a.active = false;
            break;
        }
    }
}

void AlarmEngine::updateAlarm(const std::string& code, const std::string& desc, char sev, bool condition, bool isLatchable) {
    for (auto& a : alarms) {
        if (a.code == code) {
            if (condition && !a.active) {
                a.active = true;
                a.since = hal->millis();
                a.acked = false;
                if (sev == 'C') silenced = false;
                if (isLatchable) a.latched = true;
            } else if (!condition && a.active) {
                a.active = false;
            }
            return;
        }
    }
    if (condition) {
        alarms.push_back({code, desc, sev, true, isLatchable, false, hal->millis()});
        if (sev == 'C') silenced = false;
    }
}

bool AlarmEngine::isAlarmActive(const std::string& code) const {
    for (const auto& a : alarms) {
        if (a.code == code && a.active) return true;
    }
    return false;
}

void AlarmEngine::process(int heaterIndex, float temp, float press, bool tempFault, bool pressFault, 
                 bool lflLockout, bool pumpFault, bool discrepGasNoPerm, bool discrepGasNoFan, bool noFlame60s, bool novusCommLost) {
    
    std::string prefix = "AQ0" + std::to_string(heaterIndex + 1) + "_";

    float limitH = config.tempWarnC;
    float limitHH = config.tempSoftwareLimit;
    bool tempH_cond = isAlarmActive(prefix + "TEMP_H") ? temp > (limitH - 1.0f) : temp >= limitH;
    bool tempHH_cond = isAlarmActive(prefix + "TEMP_HH") ? temp > (limitHH - 1.0f) : temp >= limitHH;

    updateAlarm(prefix + "TEMP_H", "Temperatura alta (Pré-aviso)", 'H', !tempFault && tempH_cond, false);
    updateAlarm(prefix + "TEMP_HH", "Temperatura alta (Corte)", 'C', !tempFault && tempHH_cond, true);
    updateAlarm(prefix + "TEMP_SENSOR_FAULT", "Falha no sensor de temperatura", 'C', tempFault, false);

    float press_L = config.minPressure + 0.5f;
    float press_LL = config.minPressure;
    float press_H = config.maxPressure - 0.5f;
    float press_HH = config.maxPressure;

    bool pL_cond = isAlarmActive(prefix + "PRESS_L") ? press < (press_L + 0.1f) : press <= press_L;
    bool pLL_cond = isAlarmActive(prefix + "PRESS_LL") ? press < (press_LL + 0.1f) : press <= press_LL;
    bool pH_cond = isAlarmActive(prefix + "PRESS_H") ? press > (press_H - 0.1f) : press >= press_H;
    bool pHH_cond = isAlarmActive(prefix + "PRESS_HH") ? press > (press_HH - 0.1f) : press >= press_HH;

    updateAlarm(prefix + "PRESS_L", "Pressão baixa", 'H', !pressFault && pL_cond, false);
    updateAlarm(prefix + "PRESS_LL", "Pressão muito baixa", 'C', !pressFault && pLL_cond, true);
    updateAlarm(prefix + "PRESS_H", "Pressão alta", 'H', !pressFault && pH_cond, false);
    updateAlarm(prefix + "PRESS_HH", "Pressão muito alta", 'C', !pressFault && pHH_cond, true);
    updateAlarm(prefix + "PRESS_SENSOR_FAULT", "Falha no sensor de pressão", 'C', pressFault, false);

    updateAlarm(prefix + "LFL_LOCKOUT", "Bloqueio do programador de chama", 'C', lflLockout, false);
    updateAlarm(prefix + "PUMP_FAULT", "Falha no retorno da bomba", 'C', pumpFault, true);
    updateAlarm(prefix + "NOVUS_COMM_LOST", "Perda de comunicação com Modbus", 'H', novusCommLost, false);
    
    if (hal->isIoFault()) {
        updateAlarm("SYS_IO_MODULE_FAULT", "Falha de comunicação com módulo de E/S", 'C', true, false);
    } else {
        updateAlarm("SYS_IO_MODULE_FAULT", "Falha de comunicação com módulo de E/S", 'C', false, false);
    }

    updateAlarm(prefix + "START_FAIL", "Falha na partida (Sem chama em 60s)", 'C', noFlame60s, true);
    updateAlarm(prefix + "DISCREP_GAS_NO_PERM", "DISCREPÂNCIA: Gás aberto sem permissão (CRÍTICO)", 'C', discrepGasNoPerm, true);
    updateAlarm(prefix + "DISCREP_GAS_NO_FAN", "DISCREPÂNCIA: Gás aberto sem vento (CRÍTICO)", 'C', discrepGasNoFan, true);
    
    cleanup();
}

void AlarmEngine::reportTankAlarms(bool lowLevel, bool timeout, bool freq, bool pumpFault) {
    updateAlarm("TX01_LOW_LEVEL", "Nível baixo no tanque de expansão — sistema parado", 'C', lowLevel, true);
    updateAlarm("TX01_PUMP_TIMEOUT", "Reposição prolongada — possível vazamento", 'C', timeout, true);
    updateAlarm("TX01_PUMP_FREQ", "Reposição frequente — possível vazamento", 'H', freq, false);
    updateAlarm("TX01_PUMP_FAULT", "Falha na bomba de reposição", 'C', pumpFault, true);
    
    cleanup();
}

void AlarmEngine::ackAlarm(const std::string& code) {
    for (auto& a : alarms) {
        if (code == "ALL" || a.code == code) {
            a.acked = true;
        }
    }
}

void AlarmEngine::silenceSiren() {
    silenced = true;
}

void AlarmEngine::resetLatched(const std::string& code) {
    for (auto& a : alarms) {
        if (a.code == code && !a.active) {
            a.latched = false;
        }
    }
}

void AlarmEngine::cleanup() {
    for (auto it = alarms.begin(); it != alarms.end(); ) {
        if (!it->active && !it->latched && it->acked) {
            it = alarms.erase(it);
        } else {
            ++it;
        }
    }
}

bool AlarmEngine::hasCriticalAlarms() const {
    for (const auto& a : alarms) {
        if (a.severity == 'C' && (!a.acked || a.active)) return true;
    }
    return false;
}

bool AlarmEngine::isSirenOn() const {
    if (silenced) return false;
    for (const auto& a : alarms) {
        if (a.severity == 'C' && !a.acked) return true;
    }
    return false;
}
