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
            lastLowTime[i] = 0;
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

    // Called by application
    bool getFilteredInput(int pin, uint32_t now) {
        if (ioFault) return false;
        uint32_t t = lastLowTime[pin];
        if (t > now) return true; // Race condition: updated after 'now' was captured
        return (now - t <= filterMs);
    }

    bool isIoFault() const {
        return ioFault;
    }

    void resetFilter() {
        for(int i = 0; i < 16; i++) {
            lastLowTime[i] = 0; // Vai garantir que pareça inativo até a primeira leitura de nível baixo
        }
    }
};
