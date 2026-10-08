#pragma once

#include <string>
#include "burner_logic.h"
#include "pump_logic.h"
#include "tank_logic.h"
#include "alarm_engine.h"
#include "types.h"
#include "hal.h"

std::string generateStateJson(unsigned long now,
                              bool isServerConnected,
                              BurnerLogic& burner1, PumpLogic& pump1, const HeaterInputs& in1,
                              BurnerLogic& burner2, PumpLogic& pump2, const HeaterInputs& in2,
                              TankLogic& tx01,
                              AlarmEngine& alarms,
                              HAL& hal);
