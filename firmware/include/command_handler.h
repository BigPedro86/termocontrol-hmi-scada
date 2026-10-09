#ifndef COMMAND_HANDLER_H
#define COMMAND_HANDLER_H

#include <string>
#include <vector>
#include "burner_logic.h"
#include "pump_logic.h"
#include "tank_logic.h"
#include "alarm_engine.h"

struct CommandResult {
    bool accepted;
    std::string reason;
};

class CommandHandler {
public:
    // Processa comandos validados pela Lista Branca
    static CommandResult handleCommand(const std::string& target, const std::string& command, const std::string& value, const std::string& role, 
                                       BurnerLogic* bLogic, PumpLogic* pLogic, TankLogic* tLogic, AlarmEngine* alarms);

    // Obtém as ações permitidas baseadas no estado atual
    static std::vector<std::string> getAllowedActions(const std::string& target, BurnerLogic* bLogic, PumpLogic* pLogic, TankLogic* tLogic);
};

#endif // COMMAND_HANDLER_H
