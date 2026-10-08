#pragma once
#include <stdint.h>

class MCPFilter {
private:
    uint32_t lastLowTime[16];
    uint32_t filterMs;
    bool ioFault;

public:
    MCPFilter(uint32_t ms = 40) : filterMs(ms), ioFault(false) {
        for(int i = 0; i < 16; i++) {
            lastLowTime[i] = (uint32_t)(-((int)ms + 1));
        }
    }

    void setFilterMs(uint32_t ms) {
        filterMs = ms;
    }

    void setIoFault(bool fault) {
        ioFault = fault;
    }

    // Called every 5ms by the task
    void updateRaw(uint16_t mcpReadVals, uint32_t now) {
        if (ioFault) return;
        for(int i = 0; i < 16; i++) {
            if ((mcpReadVals & (1 << i)) == 0) { // Nível BAIXO (ativo)
                lastLowTime[i] = now;
            }
        }
    }

    // Called by the application to check if input is active
    bool getFilteredInput(int pin, uint32_t now) {
        if (ioFault) return false;
        return (now - lastLowTime[pin] <= filterMs);
    }

    bool isIoFault() const {
        return ioFault;
    }
};
