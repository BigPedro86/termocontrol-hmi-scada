#include "plant_logic.h"

void PlantLogic::update(BurnerLogic& b1, BurnerLogic& b2, 
                        PumpLogic& p1, PumpLogic& p2, 
                        TankLogic& tx01, 
                        HeaterInputs& in1, HeaterInputs& in2, 
                        float minPressure, float dt) {
    
    in1.tankLowLevel = tx01.isLowLevel();
    in2.tankLowLevel = tx01.isLowLevel();
    
    if (tx01.isLowLevel()) {
        b1.stopBurner();
        b2.stopBurner();
    }
    
    b1.update(in1, dt);
    b2.update(in2, dt);
    
    bool forceStop1 = in1.press.value < minPressure;
    bool forceStop2 = in2.press.value < minPressure;
    
    p1.update(b1.getRequested(), false, forceStop1, in1.pumpFb, dt);
    p2.update(b2.getRequested(), false, forceStop2, in2.pumpFb, dt);
}
