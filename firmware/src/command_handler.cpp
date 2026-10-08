#include "command_handler.h"

CommandResult CommandHandler::handleCommand(const std::string& target, const std::string& command, const std::string& role, 
                                            BurnerLogic* bLogic, PumpLogic* pLogic, TankLogic* tLogic, AlarmEngine* alarms) {
    
    if (target == "TX01") {
        if (command == "TX01_PUMP_STOP") {
            if (tLogic) tLogic->stopCommand();
            return {true, "STOP_EXECUTED"};
        }
        if (command == "TX01_AUTO") {
            if (role == "Supervisor" || role == "Maintenance" || role == "Admin") {
                if (tLogic) tLogic->autoCommand();
                return {true, "AUTO_ACCEPTED"};
            }
            return {false, "UNAUTHORIZED_ROLE"};
        }
        if (command == "TANK_LEVEL_RESET") {
            if (role == "Supervisor" || role == "Maintenance" || role == "Admin") {
                if (tLogic) {
                    if (!tLogic->isLevelNormal()) {
                        return {false, "TANK_LEVEL_STILL_LOW"};
                    }
                    tLogic->resetCommand();
                }
                return {true, "RESET_ACCEPTED"};
            }
            return {false, "UNAUTHORIZED_ROLE"};
        }
        return {false, "UNKNOWN_COMMAND"};
    }

    // Validar Target
    if (target != "AQ01" && target != "AQ02") {
        return {false, "INVALID_TARGET"};
    }

    // Qualquer um logado pode parar
    if (command == "BURNER_STOP") {
        if (bLogic) bLogic->stopBurner();
        return {true, "STOP_EXECUTED"};
    }
    if (command == "PUMP_STOP") {
        if (pLogic) pLogic->stopPump();
        return {true, "STOP_EXECUTED"};
    }

    // Comandos de Partida
    if (command == "BURNER_START") {
        if (role == "Operator" || role == "Supervisor" || role == "Maintenance" || role == "Admin") {
            if (bLogic) bLogic->startBurner();
            return {true, "START_ACCEPTED"};
        }
        return {false, "UNAUTHORIZED_ROLE"};
    }
    if (command == "PUMP_START") {
        if (role == "Operator" || role == "Supervisor" || role == "Maintenance" || role == "Admin") {
            if (pLogic) pLogic->startPump();
            return {true, "START_ACCEPTED"};
        }
        return {false, "UNAUTHORIZED_ROLE"};
    }

    // Reset de Limite e Alarme
    if (command == "ALARM_ACK") {
        return {true, "ALARM_ACKNOWLEDGED"};
    }
    if (command == "SW_LIMIT_RESET") {
        if (role == "Supervisor" || role == "Maintenance" || role == "Admin") {
            if (bLogic) {
                if (!bLogic->canResetSwLimit()) {
                    return {false, "TEMP_STILL_HIGH"};
                }
                bLogic->resetSoftwareLimit();
                return {true, "LIMIT_RESET_ACCEPTED"};
            }
        }
        return {false, "UNAUTHORIZED_ROLE"};
    }
    if (command == "LOCKOUT_COUNT_RESET") {
        if (role == "Supervisor" || role == "Maintenance" || role == "Admin") {
            if (bLogic) bLogic->resetLockoutCount();
            return {true, "LOCKOUT_RESET_ACCEPTED"};
        }
        return {false, "UNAUTHORIZED_ROLE"};
    }

    // Configuração
    if (command == "SET_CONFIG") {
        if (role == "Admin" || role == "Maintenance") {
            return {true, "CONFIG_ACCEPTED"}; // O parser JSON lidará com os valores
        }
        return {false, "UNAUTHORIZED_ROLE"};
    }

    return {false, "UNKNOWN_COMMAND"};
}

std::vector<std::string> CommandHandler::getAllowedActions(const std::string& target, BurnerLogic* bLogic, PumpLogic* pLogic, TankLogic* tLogic) {
    std::vector<std::string> actions;
    if (target == "TX01") {
        actions.push_back("TX01_PUMP_STOP");
        actions.push_back("TX01_AUTO");
        actions.push_back("TANK_LEVEL_RESET");
        return actions;
    }
    
    if (target != "AQ01" && target != "AQ02") return actions;

    actions.push_back("BURNER_STOP");
    actions.push_back("PUMP_STOP");
    
    if (bLogic && bLogic->getBlockReasons().empty()) {
        actions.push_back("BURNER_START");
    }
    actions.push_back("PUMP_START");
    
    actions.push_back("ALARM_ACK");
    if (bLogic && bLogic->isSwLimitLatched()) {
        actions.push_back("SW_LIMIT_RESET");
    }
    // SET_CONFIG is global, not necessarily per target.
    return actions;
}
