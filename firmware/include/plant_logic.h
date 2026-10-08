#pragma once

#include "burner_logic.h"
#include "pump_logic.h"
#include "tank_logic.h"
#include "types.h"

class PlantLogic {
public:
    void update(BurnerLogic& b1, BurnerLogic& b2, 
                PumpLogic& p1, PumpLogic& p2, 
                TankLogic& tx01, 
                HeaterInputs& in1, HeaterInputs& in2, 
                float minPressure, float dt);
};
