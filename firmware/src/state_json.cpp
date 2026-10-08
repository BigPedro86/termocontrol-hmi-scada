#include "state_json.h"
#include <ArduinoJson.h>
#include "command_handler.h"

std::string generateStateJson(unsigned long now,
                              bool isServerConnected,
                              BurnerLogic& burner1, PumpLogic& pump1, const HeaterInputs& in1,
                              BurnerLogic& burner2, PumpLogic& pump2, const HeaterInputs& in2,
                              TankLogic& tx01,
                              AlarmEngine& alarms,
                              HAL& hal) {
    JsonDocument doc;
    doc["type"] = "state";
    doc["seq"] = now;
    doc["uptime_s"] = now / 1000;
    doc["estopOk"] = in1.estopOk;
    
    JsonObject buzzer = doc["buzzer"].to<JsonObject>();
    buzzer["on"] = alarms.hasCriticalAlarms();
    buzzer["silenced"] = false;
    
    JsonArray heaters = doc["heaters"].to<JsonArray>();
    
    auto addHeater = [&](JsonObject& h, const char* id, BurnerLogic& burner, PumpLogic& pump, const HeaterInputs& in, int hwIndex) {
        h["id"] = id;
        h["name"] = id;
        
        JsonObject b = h["burner"].to<JsonObject>();
        switch(burner.getPhase()) {
            case BurnerPhase::OFF: b["phase"] = "OFF"; break;
            case BurnerPhase::WAIT_PUMP: b["phase"] = "WAIT_PUMP"; break;
            case BurnerPhase::STANDBY: b["phase"] = "STANDBY"; break;
            case BurnerPhase::PURGE: b["phase"] = "PURGE"; break;
            case BurnerPhase::RUNNING: b["phase"] = "RUNNING"; break;
            case BurnerPhase::POST_PURGE: b["phase"] = "POST_PURGE"; break;
            case BurnerPhase::LOCKOUT: b["phase"] = "LOCKOUT"; break;
        }
        b["phaseTime_s"] = burner.getPhaseTime();
        b["starts"] = burner.getStarts();
        b["permission"] = burner.getPermission();
        b["requested"] = burner.getRequested();
        b["lockout"] = in.lockout;
        b["lockoutCount24h"] = burner.getLockouts24h();
        b["runHours"] = burner.getRunHours();
        JsonArray reasons = b["blockReasons"].to<JsonArray>();
        for(const auto& r : burner.getBlockReasons()) {
            reasons.add(r);
        }
        
        JsonObject t = h["temp"].to<JsonObject>();
        if (in.temp.quality == Quality::OK) t["value"] = in.temp.value; else t["value"] = nullptr;
        t["quality"] = in.temp.quality == Quality::OK ? "OK" : (in.temp.quality == Quality::FAULT ? "FAULT" : "COMM_LOST");
        
        JsonObject p = h["press"].to<JsonObject>();
        if (in.press.quality == Quality::OK) p["value"] = in.press.value; else p["value"] = nullptr;
        p["quality"] = in.press.quality == Quality::OK ? "OK" : (in.press.quality == Quality::FAULT ? "FAULT" : "COMM_LOST");
        
        JsonObject n = h["novus"].to<JsonObject>();
        n["commOk"] = in.novus.commOk;
        if (in.novus.commOk) {
            n["pv"] = hal.getNovusPV(hwIndex).value;
            n["sp"] = hal.getNovusSV(hwIndex).value;
            n["mv"] = hal.getNovusMV(hwIndex).value;
        } else {
            n["pv"] = nullptr; n["sp"] = nullptr; n["mv"] = nullptr;
        }
        n["auto"] = true;
        n["alarms"] = nullptr; // TODO: Validar bits de alarme no equipamento Novus
        n["quality"] = in.novus.quality == Quality::OK ? "OK" : "COMM_LOST";
        
        JsonObject pObj = h["pump"].to<JsonObject>();
        pObj["cmd"] = pump.getCmd();
        pObj["fb"] = in.pumpFb;
        pObj["fault"] = pump.isFault();
        
        JsonObject io = h["io"].to<JsonObject>();
        io["lockoutS"] = in.lockout;
        io["gasValves"] = in.gasValves;
        io["fan"] = in.fan;
        io["chainOk"] = in.chainOk;
        io["pumpFb"] = in.pumpFb;
        io["permOut"] = burner.getPermission();
        io["pumpOut"] = pump.getCmd();
        io["pressmA"] = 12.0; // MOCK - VALIDAR NO EQUIPAMENTO
        
        h["chainOk"] = in.chainOk;
    };
    
    JsonObject h1 = heaters.add<JsonObject>();
    addHeater(h1, "AQ01", burner1, pump1, in1, 0);
    
    JsonObject h2 = heaters.add<JsonObject>();
    addHeater(h2, "AQ02", burner2, pump2, in2, 1);
    
    JsonObject tObj = doc["tank"].to<JsonObject>();
    TankState ts = tx01.getState();
    tObj["id"] = "TX01";
    tObj["levelNormal"] = ts.levelNormal;
    tObj["pressureLow"] = ts.pressureLow;
    tObj["pumpCmd"] = ts.pumpCmd;
    tObj["pumpFb"] = ts.pumpFb;
    tObj["isAuto"] = ts.isAuto;
    tObj["isLatched"] = ts.isLatched;
    tObj["lowLevelLatched"] = ts.lowLevelLatched;
    tObj["timeoutLatched"] = ts.timeoutLatched;
    tObj["pumpFault"] = ts.pumpFault;
    tObj["startsLastHour"] = ts.startsLastHour;
    
    JsonObject actions = doc["allowedActions"].to<JsonObject>();
    auto act1 = CommandHandler::getAllowedActions("AQ01", &burner1, &pump1, nullptr);
    JsonArray arr1 = actions["AQ01"].to<JsonArray>();
    for(const auto& a : act1) arr1.add(a);
    
    auto act2 = CommandHandler::getAllowedActions("AQ02", &burner2, &pump2, nullptr);
    JsonArray arr2 = actions["AQ02"].to<JsonArray>();
    for(const auto& a : act2) arr2.add(a);
    
    auto actT = CommandHandler::getAllowedActions("TX01", nullptr, nullptr, &tx01);
    JsonArray arrT = actions["TX01"].to<JsonArray>();
    for(const auto& a : actT) arrT.add(a);
    
    JsonArray arrS = actions["SYS"].to<JsonArray>();
    arrS.add("ALARM_SILENCE");
    arrS.add("ALARM_ACK");
    
    JsonArray alArr = doc["alarms"].to<JsonArray>();
    for (const auto& a : alarms.getAlarms()) {
        if (a.active || a.latched) {
            JsonObject alObj = alArr.add<JsonObject>();
            alObj["code"] = a.code;
            alObj["severity"] = std::string(1, a.severity);
            alObj["active"] = a.active;
            alObj["acked"] = false;
            alObj["since"] = a.since;
        }
    }
    
    std::string out;
    serializeJson(doc, out);
    return out;
}
