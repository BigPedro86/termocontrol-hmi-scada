#ifndef PIO_UNIT_TESTING
#include <Arduino.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include <Preferences.h>

#include "hal_esp32.h"
#include "burner_logic.h"
#include "pump_logic.h"
#include "tank_logic.h"
#include "plant_logic.h"
#include "alarm_engine.h"
#include "command_handler.h"
#include "state_json.h"
#include "config.h"

#define WDT_TIMEOUT 5 // 5 seconds watchdog

HAL_ESP32 hal;
BurnerLogic burner1(0, &hal);
BurnerLogic burner2(1, &hal);
PumpLogic pump1(300.0f); // 5 mins post-purge as example
PumpLogic pump2(300.0f);
TankLogic tx01;
PlantLogic plant;
AlarmEngine alarms(&hal);

WebSocketsClient webSocket;
Preferences preferences;
bool isServerConnected = false;
unsigned long lastStateSent = 0;
unsigned long lastLogicUpdate = 0;

void sendAck(const std::string& id, bool accepted, const std::string& reason) {
    JsonDocument doc;
    doc["type"] = "ack";
    doc["id"] = id;
    doc["accepted"] = accepted;
    doc["reason"] = reason;
    
    std::string out;
    serializeJson(doc, out);
    webSocket.sendTXT(out.c_str());
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    if (type == WStype_DISCONNECTED) {
        isServerConnected = false;
    } else if (type == WStype_CONNECTED) {
        isServerConnected = true;
    } else if (type == WStype_TEXT) {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) return;
        
        if (doc["type"] == "ping") {
            JsonDocument pongDoc;
            pongDoc["type"] = "pong";
            std::string out;
            serializeJson(pongDoc, out);
            webSocket.sendTXT(out.c_str());
            return;
        }

        if (doc["type"] == "command") {
            std::string id = doc["id"] | "";
            std::string target = doc["target"] | "";
            std::string command = doc["command"] | "";
            std::string user = doc["user"] | "";
            std::string role = doc["role"] | "";
            std::string reason = doc["reason"] | "";
            
            CommandResult r = {false, "UNKNOWN_TARGET"};
            if (target == "AQ01") {
                r = CommandHandler::handleCommand(target, command, role, &burner1, &pump1, nullptr, &alarms);
            } else if (target == "AQ02") {
                r = CommandHandler::handleCommand(target, command, role, &burner2, &pump2, nullptr, &alarms);
            } else if (target == "TX01") {
                r = CommandHandler::handleCommand(target, command, role, nullptr, nullptr, &tx01, &alarms);
            } else {
                r = CommandHandler::handleCommand(target, command, role, nullptr, nullptr, nullptr, &alarms);
            }
            sendAck(id, r.accepted, r.reason);
        }
    }
}

void setup() {
    Serial.begin(115200);
    hal.begin(); // Ensures safe boot (relays off)
    
    esp_task_wdt_init(WDT_TIMEOUT, true);
    esp_task_wdt_add(NULL);
    
    preferences.begin("termocontrol", false);
    config.serverIp = preferences.getString("serverIp", "").c_str();
    config.serverPort = preferences.getInt("serverPort", 3000);
    config.deviceSecret = preferences.getString("deviceSecret", "").c_str();

    WiFiManagerParameter custom_server_ip("server", "SCADA Server IP", config.serverIp.c_str(), 40);
    char port_str[6];
    itoa(config.serverPort, port_str, 10);
    WiFiManagerParameter custom_server_port("port", "SCADA Server Port", port_str, 6);
    WiFiManagerParameter custom_device_secret("secret", "Device Secret", config.deviceSecret.c_str(), 64);

    WiFiManager wm;
    wm.addParameter(&custom_server_ip);
    wm.addParameter(&custom_server_port);
    wm.addParameter(&custom_device_secret);

    wm.setSaveParamsCallback([&]() {
        config.serverIp = custom_server_ip.getValue();
        config.serverPort = atoi(custom_server_port.getValue());
        config.deviceSecret = custom_device_secret.getValue();
        preferences.putString("serverIp", config.serverIp.c_str());
        preferences.putInt("serverPort", config.serverPort);
        preferences.putString("deviceSecret", config.deviceSecret.c_str());
    });

    wm.autoConnect("TermoControl_AP");
    
    std::string url = "/?device=true&secret=" + config.deviceSecret;
    webSocket.begin(config.serverIp.c_str(), config.serverPort, url.c_str());
    webSocket.onEvent(webSocketEvent);
    
    lastLogicUpdate = hal.millis();
}

void loop() {
    esp_task_wdt_reset();
    webSocket.loop();
    hal.pollModbus();
    
    unsigned long now = hal.millis();
    float dt = (now - lastLogicUpdate) / 1000.0f;
    lastLogicUpdate = now;
    
    // Read Tank Inputs
    TankInputs tIn = {};
    tIn.levelNormal = hal.getTx01LevelSw();
    tIn.pressureLow = hal.getTx01PressSw();
    tIn.pumpFb = hal.getTx01PumpFb();
    tx01.update(tIn, dt, &alarms);

    // Read inputs
    HeaterInputs in1 = {};
    in1.chainOk = hal.getSafetyChainOk(0);
    in1.estopOk = hal.getEStopOk();
    in1.pumpFb = hal.getPumpFb(0);
    in1.lockout = hal.getLflLockout(0);
    in1.gasValves = hal.getLflGasValves(0);
    in1.fan = hal.getLflFan(0);
    
    AnalogValue t1 = hal.getTemperature(0);
    in1.temp.value = t1.value;
    in1.temp.quality = (Quality)t1.quality;
    
    AnalogValue p1 = hal.getPressure(0);
    in1.press.value = p1.value;
    in1.press.quality = (Quality)p1.quality;
    
    in1.novus.commOk = hal.isNovusCommOk(0);
    in1.novus.quality = in1.novus.commOk ? Quality::OK : Quality::COMM_LOST;
    in1.swLimit = config.tempSoftwareLimit;
    
    // Same for AQ2
    HeaterInputs in2 = in1;
    in2.chainOk = hal.getSafetyChainOk(1);
    in2.pumpFb = hal.getPumpFb(1);
    in2.lockout = hal.getLflLockout(1);
    in2.gasValves = hal.getLflGasValves(1);
    in2.fan = hal.getLflFan(1);
    
    AnalogValue t2 = hal.getTemperature(1);
    in2.temp.value = t2.value;
    in2.temp.quality = (Quality)t2.quality;
    AnalogValue p2 = hal.getPressure(1);
    in2.press.value = p2.value;
    in2.press.quality = (Quality)p2.quality;
    in2.novus.commOk = hal.isNovusCommOk(1);
    in2.novus.quality = in2.novus.commOk ? Quality::OK : Quality::COMM_LOST;
    
    // Command edges are handled in command_handler via methods on burner1/2
    // PlantLogic coordinates tank, burners and pumps
    plant.update(burner1, burner2, pump1, pump2, tx01, in1, in2, config.minPressure, dt);
    
    // Alarms process
    alarms.process(0, in1.temp.value, in1.press.value, in1.temp.quality != Quality::OK, in1.press.quality != Quality::OK,
                   in1.lockout, pump1.isFault(), burner1.hasDiscrepancy(), false, burner1.isIgnitionTimeout(), !in1.novus.commOk);
                   
    alarms.process(1, in2.temp.value, in2.press.value, in2.temp.quality != Quality::OK, in2.press.quality != Quality::OK,
                   in2.lockout, pump2.isFault(), burner2.hasDiscrepancy(), false, burner2.isIgnitionTimeout(), !in2.novus.commOk);

    // Apply outputs
    hal.setBurnerCmd(0, burner1.getPermission());
    hal.setBurnerCmd(1, burner2.getPermission());
    hal.setPumpCmd(0, pump1.getCmd());
    hal.setPumpCmd(1, pump2.getCmd());
    hal.setTx01PumpCmd(tx01.getState().pumpCmd);
    hal.setBuzzer(alarms.hasCriticalAlarms());

    static bool wasServerConnected = false;
    if (wasServerConnected && !isServerConnected && config.onServerLoss == STOP_BURNERS) {
        burner1.stopBurner();
        burner2.stopBurner();
    }
    wasServerConnected = isServerConnected;

    // Send state every 1s
    if (now - lastStateSent >= 1000) {
        lastStateSent = now;
        
        std::string out = generateStateJson(now, isServerConnected, burner1, pump1, in1, burner2, pump2, in2, tx01, alarms, hal);
        
        if (isServerConnected) {
            webSocket.sendTXT(out.c_str());
        }
    }
}
#endif
