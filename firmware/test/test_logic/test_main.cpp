#include <unity.h>
#include "burner_logic.h"
#include "pump_logic.h"
#include "command_handler.h"
#include "alarm_engine.h"
#include "plant_logic.h"
#include "hal.h"
#include "config.h"

#include "state_json.h"
#include <ArduinoJson.h>
#include <fstream>
#include <sstream>

class HALMockTest : public HAL {
public:
    unsigned long timeMs = 0;
    std::string config_store_AQ01_LCK = "";
    
    void setBurnerCmd(int h, bool s) override {}
    void setPumpCmd(int h, bool s) override {}
    void setBuzzer(bool s) override {}
    bool getLflLockout(int h) override { return false; }
    bool getLflGasValves(int h) override { return false; }
    bool getLflFan(int h) override { return false; }
    bool getSafetyChainOk(int h) override { return true; }
    bool getPumpFb(int h) override { return true; }
    bool getTx01LevelSw() override { return true; }
    bool getTx01PressSw() override { return false; }
    bool getTx01PumpFb() override { return true; }
    void setTx01PumpCmd(bool s) override {}
    bool getNovusA1(int h) override { return false; }
    bool getNovusA2(int h) override { return false; }
    bool getEStopOk() override { return true; }
    AnalogValue getTemperature(int h) override { return {50.0f, SensorQuality::OK}; }
    AnalogValue getPressure(int h) override { return {2.0f, SensorQuality::OK}; }
    AnalogValue getNovusPV(int h) override { return {50.0f, SensorQuality::OK}; }
    AnalogValue getNovusSV(int h) override { return {50.0f, SensorQuality::OK}; }
    AnalogValue getNovusMV(int h) override { return {50.0f, SensorQuality::OK}; }
    bool isNovusCommOk(int h) override { return true; }
    unsigned long millis() override { return timeMs; }
    void saveConfig(const std::string& k, const std::string& v) override {
        if (k == "AQ01_LCK") config_store_AQ01_LCK = v;
    }
    std::string loadConfig(const std::string& k, const std::string& d) override { 
        if (k == "AQ01_LCK" && !config_store_AQ01_LCK.empty()) return config_store_AQ01_LCK;
        return d; 
    }
};

void setUp(void) {}
void tearDown(void) {}

HeaterInputs get_default_inputs() {
    HeaterInputs in = {};
    in.cmd_start = true;
    in.chainOk = true;
    in.estopOk = true;
    in.pumpFb = true;
    in.temp.quality = Quality::OK;
    in.temp.value = 50.0f;
    in.swLimit = 90.0f;
    in.press.quality = Quality::OK;
    in.press.value = 2.0f;
    in.novus.quality = Quality::OK;
    return in;
}

void apply_permission(BurnerLogic& b, HeaterInputs& in) {
    in.cmd_start = false;
    b.update(in, 1.0f);
    in.cmd_start = true;
    b.update(in, 10.0f);
}

void test_partida_normal() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 1.0f); // initial
    
    in.cmd_start = true;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission()); // needs 10s pump
    
    b.update(in, 9.0f); // 10s total
    TEST_ASSERT_TRUE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b.getPhase());
    
    in.fan = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::PURGE, b.getPhase());
    
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
}

void test_off_qualquer_fase() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    in.fan = true;
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.getPermission());
    
    in.cmd_start = false;
    in.cmd_stop = true;
    in.gasValves = false; // LFL response
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::POST_PURGE, b.getPhase());
    
    in.fan = false;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b.getPhase());
}

void test_bomba_sem_retorno() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.pumpFb = false; // falha de fluxo
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b.getPhase());
}

void test_sensor_pt100_em_falha() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.temp.quality = Quality::FAULT;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
}

void test_4_20ma_abaixo_3_6ma() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.press.quality = Quality::FAULT; // O HAL vai marcar FAULT se < 3.6mA
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
}

void test_bloqueio_lfl() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.lockout = true;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::LOCKOUT, b.getPhase());
}

void test_3_bloqueios_24h() {
    HALMockTest hal;
    BurnerLogic b(0, &hal);
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 1.0f);
    in.cmd_start = true;
    b.update(in, 10.0f);
    
    for (int i=0; i<3; i++) {
        in.lockout = true;
        b.update(in, 1.0f);
        in.lockout = false;
        b.update(in, 1.0f); // goes to OFF
    }
    
    TEST_ASSERT_FALSE(b.getPermission());
    
    // Agora simula "reiniciar" carregando da NVS
    BurnerLogic b2(0, &hal);
    b2.update(in, 1.0f);
    TEST_ASSERT_FALSE(b2.getPermission());
    bool found = false;
    for(auto &r : b2.getBlockReasons()) if(r == "MAX_LOCKOUTS_24H") found = true;
    TEST_ASSERT_TRUE(found);
    
    // Reset via Command Handler no b2
    CommandHandler::handleCommand("AQ01", "LOCKOUT_COUNT_RESET", "Maintenance", &b2, nullptr, nullptr, nullptr);
    
    apply_permission(b2, in);
    TEST_ASSERT_TRUE(b2.getPermission());
}

void test_gas_valves_sem_permissao() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; // No permission
    in.gasValves = true; // Gas active!!
    
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_TRUE(b.hasDiscrepancy());
}

void test_partida_sem_chama_60s() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    in.fan = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::PURGE, b.getPhase());
    
    b.update(in, 61.0f); // Wait > 60s
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_TRUE(b.isIgnitionTimeout());
}

void test_reinicio_seguro() {
    BurnerLogic b; // Initial state
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b.getPhase());
}

void test_limite_software_travamento() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    in.temp.value = 95.0f;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_TRUE(b.isSwLimitLatched());
    
    // Temperature drops, but stays latched
    in.temp.value = 80.0f;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    
    // Reset by user
    in.swLimitResetCmd = true;
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.getPermission());
}

void test_parada_24h() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; b.update(in, 1.0f);
    in.cmd_start = true; b.update(in, 10.0f);
    in.fan = true;
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
    
    b.update(in, 86400.0f);
    TEST_ASSERT_FALSE(b.getPermission());
}

void test_modbus_sem_resposta() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; b.update(in, 1.0f);
    in.cmd_start = true; b.update(in, 10.0f);
    TEST_ASSERT_TRUE(b.getPermission());
    
    in.novus.quality = Quality::COMM_LOST;
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.getPermission()); // Does NOT block
}

void test_paradas_comportamentos() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; b.update(in, 1.0f);
    
    in.cmd_start = true; b.update(in, 10.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b.getPhase());
    
    in.cmd_stop = true; b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    
    in.cmd_stop = false; b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission()); // Start is still level, needs edge
    
    in.cmd_start = false; b.update(in, 1.0f);
    in.cmd_start = true; b.update(in, 10.0f);
    TEST_ASSERT_TRUE(b.getPermission());
    
    in.cmd_stop = true; b.update(in, 1.0f); // both true
    TEST_ASSERT_FALSE(b.getPermission()); // Stop priority
}

void test_conversao_4_20ma() {
    SensorValue v = convert4_20mA(3.5f, 0.0f, 10.0f);
    TEST_ASSERT_EQUAL(Quality::FAULT, v.quality);
    
    v = convert4_20mA(21.5f, 0.0f, 10.0f);
    TEST_ASSERT_EQUAL(Quality::FAULT, v.quality);
    
    v = convert4_20mA(4.0f, 0.0f, 10.0f);
    TEST_ASSERT_EQUAL(Quality::OK, v.quality);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, v.value);
    
    v = convert4_20mA(20.0f, 0.0f, 10.0f);
    TEST_ASSERT_EQUAL(Quality::OK, v.quality);
    TEST_ASSERT_EQUAL_FLOAT(10.0f, v.value);
}

void test_reset_limite_invalido() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    in.temp.value = 95.0f; 
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.isSwLimitLatched());
    
    // Reset by user, but temp still high (CommandHandler returns TEMP_STILL_HIGH)
    CommandResult r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "Supervisor", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("TEMP_STILL_HIGH", r.reason.c_str());
    
    in.temp.value = 80.0f;
    b.update(in, 1.0f);
    
    r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "Supervisor", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("LIMIT_RESET_ACCEPTED", r.reason.c_str());
    
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.isSwLimitLatched());
}

void test_bomba_pos_purga() {
    PumpLogic p(3.0f); // 3 seconds post-purge
    p.update(true, false, false, true, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    
    p.update(false, false, false, true, 1.0f); // remove start cmd
    TEST_ASSERT_TRUE(p.getCmd()); // still true because of timer
    
    p.update(false, false, false, true, 3.0f); // wait
    TEST_ASSERT_FALSE(p.getCmd()); // false now
}

void test_bomba_falha_sem_fb() {
    PumpLogic p(3.0f);
    p.update(true, false, false, false, 1.0f); // start cmd, no fb
    TEST_ASSERT_TRUE(p.getCmd());
    
    p.update(true, false, false, false, 6.0f); // >5s
    TEST_ASSERT_FALSE(p.getCmd());
    TEST_ASSERT_TRUE(p.isFault());
}

void test_comando_stop_aceito() {
    BurnerLogic b; PumpLogic p;
    CommandResult r = CommandHandler::handleCommand("AQ01", "BURNER_STOP", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "PUMP_STOP", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
}

void test_comando_desconhecido() {
    CommandResult r = CommandHandler::handleCommand("AQ01", "HACK_SYSTEM", "Admin", nullptr, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("UNKNOWN_COMMAND", r.reason.c_str());
}

void test_alvo_invalido() {
    CommandResult r = CommandHandler::handleCommand("ZZ99", "BURNER_STOP", "Operator", nullptr, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("INVALID_TARGET", r.reason.c_str());
}

void test_perfis_servidor() {
    BurnerLogic b; PumpLogic p;
    CommandResult r = CommandHandler::handleCommand("AQ01", "SET_CONFIG", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "SET_CONFIG", "Maintenance", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "Supervisor", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "BURNER_START", "Admin", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
}

void test_acoes_permitidas_bloqueio() {
    BurnerLogic b; 
    HeaterInputs in = get_default_inputs();
    in.estopOk = false; 
    b.update(in, 1.0f);
    
    auto actions = CommandHandler::getAllowedActions("AQ01", &b, nullptr, nullptr);
    bool hasStart = false;
    for (auto& a : actions) if (a == "BURNER_START") hasStart = true;
    
    TEST_ASSERT_FALSE(hasStart);
}

void test_aquecedores_independentes() {
    BurnerLogic aq1, aq2;
    HeaterInputs in = get_default_inputs();
    in.lockout = true;
    aq1.update(in, 1.0f);
    aq2.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::LOCKOUT, aq1.getPhase());
    TEST_ASSERT_EQUAL(BurnerPhase::LOCKOUT, aq2.getPhase());
}

void test_alarme_gas_sem_vento() {
    HALMockTest hal;
    AlarmEngine ae(&hal);
    ae.process(0, 50.0f, 2.0f, false, false, false, false, false, true, false, false);
    
    bool found = false;
    for (auto& a : ae.getAlarms()) {
        if (a.code == "AQ01_DISCREP_GAS_NO_FAN" && a.active && a.severity == 'C') found = true;
    }
    TEST_ASSERT_TRUE(found);
}

void test_sensor_fault_sem_limites() {
    HALMockTest hal;
    AlarmEngine ae(&hal);
    ae.process(0, 100.0f, 2.0f, true, false, false, false, false, false, false, false);
    
    bool limitFound = false;
    bool faultFound = false;
    for (auto& a : ae.getAlarms()) {
        if ((a.code == "AQ01_TEMP_H" || a.code == "AQ01_TEMP_HH") && a.active) limitFound = true;
        if (a.code == "AQ01_TEMP_SENSOR_FAULT" && a.active) faultFound = true;
    }
    TEST_ASSERT_FALSE(limitFound);
    TEST_ASSERT_TRUE(faultFound);
}

void test_parada_24h_religa() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    in.fan = true;
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
    
    b.update(in, 86400.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    
    in.gasValves = false; 
    b.update(in, 1.0f); 
    TEST_ASSERT_EQUAL(BurnerPhase::POST_PURGE, b.getPhase());
    TEST_ASSERT_FALSE(b.getPermission());
    
    in.fan = false; 
    b.update(in, 1.0f); 
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b.getPhase());
    
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b.getPhase());
}

void test_chain_estop() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.chainOk = false;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    bool foundChain = false;
    for(auto &r : b.getBlockReasons()) if(r == "SAFETY_CHAIN_OPEN") foundChain = true;
    TEST_ASSERT_TRUE(foundChain);
    
    in.chainOk = true;
    in.estopOk = false;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    bool foundEstop = false;
    for(auto &r : b.getBlockReasons()) if(r == "ESTOP_PRESSED") foundEstop = true;
    TEST_ASSERT_TRUE(foundEstop);
}

void test_tx01_nivel_baixo() {
    TankLogic t;
    TankInputs in = {false, false, true, false, false, false};
    t.update(in, 2.1f, nullptr);
    TEST_ASSERT_TRUE(t.isLowLevel());
    TEST_ASSERT_FALSE(t.getState().pumpCmd);
}

void test_tx01_fio_rompido() {
    // Fio rompido = nível baixo (in.levelNormal = false)
    TankLogic t;
    TankInputs in = {false, false, true, false, false, false};
    t.update(in, 2.1f, nullptr);
    TEST_ASSERT_TRUE(t.isLowLevel());
}

void test_tx01_nivel_volta_sem_rearme() {
    TankLogic t;
    TankInputs in = {false, false, true, false, false, false};
    t.update(in, 2.1f, nullptr);
    in.levelNormal = true;
    t.update(in, 1.0f, nullptr);
    TEST_ASSERT_TRUE(t.isLowLevel());
    TEST_ASSERT_FALSE(t.getState().pumpCmd);
}

void test_tx01_rearme_operator_recusado() {
    TankLogic t;
    CommandResult r = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "Operator", nullptr, nullptr, &t, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
}

void test_tx01_rearme_com_nivel_ainda_baixo() {
    TankLogic t;
    TankInputs in = {false, false, true, false, false, false}; // level normal = false
    t.update(in, 2.1f, nullptr); // latched
    
    CommandResult r = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "Supervisor", nullptr, nullptr, &t, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("TANK_LEVEL_STILL_LOW", r.reason.c_str());
}

void test_tx01_reposicao_liga_desliga() {
    TankLogic t;
    TankInputs in = {true, true, true, false, false, false}; // level normal, press low
    t.update(in, 31.0f, nullptr); // Wait 30s
    TEST_ASSERT_TRUE(t.getState().pumpCmd);
    
    in.pressureLow = false;
    t.update(in, 1.0f, nullptr);
    TEST_ASSERT_FALSE(t.getState().pumpCmd);
}

void test_tx01_bomba_nao_liga_nivel_baixo() {
    TankLogic t;
    TankInputs in = {false, true, true, false, false, false};
    t.update(in, 31.0f, nullptr);
    TEST_ASSERT_FALSE(t.getState().pumpCmd);
}

void test_tx01_tempo_maximo_trava() {
    TankLogic t;
    TankInputs in = {true, true, true, false, false, false};
    t.update(in, 31.0f, nullptr); // Ligar
    TEST_ASSERT_TRUE(t.getState().pumpCmd);
    t.update(in, 601.0f, nullptr); // > 10m
    TEST_ASSERT_FALSE(t.getState().pumpCmd);
    TEST_ASSERT_TRUE(t.getState().isLatched);
}

void test_tx01_partidas_demais() {
    TankLogic t;
    TankInputs in = {true, false, true, false, false, false};
    t.update(in, 1.0f, nullptr);
    
    for (int i=0; i<11; i++) {
        in.pressureLow = true;
        t.update(in, 31.0f, nullptr); // Ligar (pumpOffTimer is >= 30s)
        in.pressureLow = false;
        t.update(in, 31.0f, nullptr); // Desligar, acumula pumpOffTimer
    }
    
    HALMockTest hal; AlarmEngine ae(&hal);
    t.update(in, 1.0f, &ae);
    
    bool found = false;
    for (auto& a : ae.getAlarms()) {
        if (a.code == "TX01_PUMP_FREQ" && a.active) found = true;
    }
    TEST_ASSERT_TRUE(found);
}

void test_tx01_bomba_sem_retorno() {
    TankLogic t;
    TankInputs in = {true, true, false, false, false, false}; // pumpFb = false
    t.update(in, 31.0f, nullptr); // Ligar
    t.update(in, 6.0f, nullptr); // fbTimer > 5s
    
    HALMockTest hal; AlarmEngine ae(&hal);
    t.update(in, 1.0f, &ae);
    
    bool found = false;
    for (auto& a : ae.getAlarms()) {
        if (a.code == "TX01_PUMP_FAULT" && a.active) found = true;
    }
    TEST_ASSERT_TRUE(found);
}

void test_plant_nivel_baixo_perde_permissao() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1, b2; PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs(); in1.cmd_start = false;
    HeaterInputs in2 = get_default_inputs(); in2.cmd_start = false;
    
    // Initial state
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    // Start burners
    in1.cmd_start = true; in2.cmd_start = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    TEST_ASSERT_TRUE(b1.getPermission());
    TEST_ASSERT_TRUE(b2.getPermission());
    
    // Trigger tank low level
    TankInputs tin = {false, false, true, false, false, false}; // levelNormal = false
    tx.update(tin, 2.1f, nullptr);
    
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_FALSE(b1.getPermission());
    TEST_ASSERT_FALSE(b2.getPermission());
    
    bool reasonFound = false;
    for (auto& r : b1.getBlockReasons()) {
        if (r == "TANK_LOW_LEVEL") reasonFound = true;
    }
    TEST_ASSERT_TRUE(reasonFound);
}

void test_plant_bomba_pos_circulacao() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1, b2; PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs(); in1.cmd_start = false;
    HeaterInputs in2 = get_default_inputs(); in2.cmd_start = false;
    
    in1.cmd_start = true; in2.cmd_start = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    in1.fan = true; in1.gasValves = true;
    in2.fan = true; in2.gasValves = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b1.getPhase());
    TEST_ASSERT_TRUE(p1.getCmd()); // Pump is on
    
    // Low level
    TankInputs tin = {false, false, true, false, false, false};
    tx.update(tin, 2.1f, nullptr);
    
    // Update plant
    in1.gasValves = false; in2.gasValves = false; // LFL response
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    // Burners should be in POST_PURGE
    TEST_ASSERT_EQUAL(BurnerPhase::POST_PURGE, b1.getPhase());
    // Pump should still be on because of BurnerPhase != OFF
    TEST_ASSERT_TRUE(p1.getCmd());
    
    // Advance to OFF phase
    in1.fan = false; in2.fan = false;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b1.getPhase());
    
    // Pump should still be on because of its own post-purge timer
    TEST_ASSERT_TRUE(p1.getCmd());
    
    // Advance past pump timer (180s default)
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 181.0f);
    
    // Pump should turn off
    TEST_ASSERT_FALSE(p1.getCmd());
}

void test_plant_nivel_baixo_pressao_ll_bomba_desliga_na_hora() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1, b2; PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs(); in1.cmd_start = false;
    HeaterInputs in2 = get_default_inputs(); in2.cmd_start = false;
    
    in1.cmd_start = true; in2.cmd_start = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    in1.fan = true; in1.gasValves = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_TRUE(p1.getCmd());
    
    // Low level + Pressure below LL (0.5)
    TankInputs tin = {false, false, true, false, false, false};
    tx.update(tin, 2.1f, nullptr);
    in1.press.value = 0.4f; // LL
    in2.press.value = 2.0f; // Normal
    
    in1.gasValves = false; // LFL
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    // Pump 1 should stop immediately because of forceStop = true
    TEST_ASSERT_FALSE(p1.getCmd());
    // Pump 2 should continue running (forceStop = false)
    TEST_ASSERT_TRUE(p2.getCmd());
}

void test_plant_nivel_normaliza_rearme() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1(0, nullptr), b2(1, nullptr); PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs();
    HeaterInputs in2 = get_default_inputs();
    
    CommandHandler::handleCommand("AQ01", "PUMP_START", "Operator", &b1, &p1, nullptr, nullptr);
    CommandHandler::handleCommand("AQ02", "PUMP_START", "Operator", &b2, &p2, nullptr, nullptr);
    CommandHandler::handleCommand("AQ01", "BURNER_START", "Operator", &b1, &p1, nullptr, nullptr);
    CommandHandler::handleCommand("AQ02", "BURNER_START", "Operator", &b2, &p2, nullptr, nullptr);
    
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    TankInputs tin = {false, false, true, false, false, false};
    tx.update(tin, 2.1f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_FALSE(b1.getPermission());
    
    // Tentativa de rearme com nível ainda baixo
    CommandResult res = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "Maintenance", nullptr, nullptr, &tx, nullptr);
    TEST_ASSERT_FALSE(res.accepted);
    TEST_ASSERT_EQUAL_STRING("TANK_LEVEL_STILL_LOW", res.reason.c_str());
    
    // Nível normaliza, mas sem rearme
    tin.levelNormal = true;
    in1.press.value = 2.0f; // Restore pressure!
    tx.update(tin, 1.0f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_FALSE(b1.getPermission()); // Nothing restarts
    
    // Rearme
    CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "Maintenance", nullptr, nullptr, &tx, nullptr);
    tx.update(tin, 1.0f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    // After reset, it still needs cmd_start edge (BURNER_START)
    TEST_ASSERT_FALSE(b1.getPermission());
    
    // Trigger start edge
    CommandHandler::handleCommand("AQ01", "BURNER_START", "Operator", &b1, &p1, nullptr, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    in1.pumpFb = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b1.getPhase());
}

void check_json_types(JsonObject expected, JsonObject actual, const std::string& path) {
    for (JsonPair kv : expected) {
        TEST_ASSERT_TRUE_MESSAGE(actual.containsKey(kv.key()), (path + "." + kv.key().c_str() + " missing").c_str());
        JsonVariant vExpected = kv.value();
        JsonVariant vActual = actual[kv.key()];
        
        if (vExpected.is<JsonObject>()) {
            TEST_ASSERT_TRUE_MESSAGE(vActual.is<JsonObject>(), (path + "." + kv.key().c_str() + " should be object").c_str());
            check_json_types(vExpected.as<JsonObject>(), vActual.as<JsonObject>(), path + "." + kv.key().c_str());
        } else if (vExpected.is<JsonArray>()) {
            TEST_ASSERT_TRUE_MESSAGE(vActual.is<JsonArray>(), (path + "." + kv.key().c_str() + " should be array").c_str());
            if (vExpected.as<JsonArray>().size() > 0 && vExpected.as<JsonArray>()[0].is<JsonObject>()) {
                if (vActual.as<JsonArray>().size() > 0) {
                     check_json_types(vExpected.as<JsonArray>()[0].as<JsonObject>(), vActual.as<JsonArray>()[0].as<JsonObject>(), path + "." + kv.key().c_str() + "[0]");
                }
            }
        } else if (vExpected.is<bool>()) {
            TEST_ASSERT_TRUE_MESSAGE(vActual.is<bool>(), (path + "." + kv.key().c_str() + " should be bool").c_str());
        } else if (vExpected.is<int>() || vExpected.is<float>()) {
            TEST_ASSERT_TRUE_MESSAGE(vActual.is<int>() || vActual.is<float>(), (path + "." + kv.key().c_str() + " should be number").c_str());
        } else if (vExpected.is<const char*>()) {
            TEST_ASSERT_TRUE_MESSAGE(vActual.is<const char*>(), (path + "." + kv.key().c_str() + " should be string").c_str());
        }
    }
}

void test_state_json_contrato() {
    BurnerLogic b1, b2; PumpLogic p1, p2; TankLogic tx;
    HALMockTest hal;
    AlarmEngine alarms(&hal);
    HeaterInputs in1 = get_default_inputs();
    in1.novus.commOk = true;
    in1.temp.quality = Quality::OK;
    in1.press.quality = Quality::OK;
    HeaterInputs in2 = get_default_inputs();
    in2.novus.commOk = true;
    in2.temp.quality = Quality::OK;
    in2.press.quality = Quality::OK;
    std::string jsonStr = generateStateJson(1000, true, b1, p1, in1, b2, p2, in2, tx, alarms, hal);
    
    JsonDocument genDoc;
    deserializeJson(genDoc, jsonStr);
    
    std::ifstream t("../docs/protocolo/state.exemplo.json");
    TEST_ASSERT_TRUE_MESSAGE(t.is_open(), "Could not open state.exemplo.json");
    std::stringstream buffer;
    buffer << t.rdbuf();
    JsonDocument exDoc;
    deserializeJson(exDoc, buffer.str());
    
    check_json_types(exDoc.as<JsonObject>(), genDoc.as<JsonObject>(), "root");
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_partida_normal);
    RUN_TEST(test_off_qualquer_fase);
    RUN_TEST(test_bomba_sem_retorno);
    RUN_TEST(test_sensor_pt100_em_falha);
    RUN_TEST(test_4_20ma_abaixo_3_6ma);
    RUN_TEST(test_bloqueio_lfl);
    RUN_TEST(test_3_bloqueios_24h);
    RUN_TEST(test_gas_valves_sem_permissao);
    RUN_TEST(test_partida_sem_chama_60s);
    RUN_TEST(test_reinicio_seguro);
    RUN_TEST(test_limite_software_travamento);
    RUN_TEST(test_parada_24h);
    RUN_TEST(test_modbus_sem_resposta);
    RUN_TEST(test_bomba_pos_purga);
    RUN_TEST(test_bomba_falha_sem_fb);
    RUN_TEST(test_comando_stop_aceito);
    RUN_TEST(test_comando_desconhecido);
    RUN_TEST(test_alvo_invalido);
    RUN_TEST(test_perfis_servidor);
    RUN_TEST(test_acoes_permitidas_bloqueio);
    RUN_TEST(test_aquecedores_independentes);
    RUN_TEST(test_alarme_gas_sem_vento);
    RUN_TEST(test_sensor_fault_sem_limites);
    RUN_TEST(test_parada_24h_religa);
    RUN_TEST(test_paradas_comportamentos);
    RUN_TEST(test_conversao_4_20ma);
    RUN_TEST(test_reset_limite_invalido);
    RUN_TEST(test_chain_estop);
    RUN_TEST(test_tx01_nivel_baixo);
    RUN_TEST(test_tx01_fio_rompido);
    RUN_TEST(test_tx01_nivel_volta_sem_rearme);
    RUN_TEST(test_tx01_rearme_operator_recusado);
    RUN_TEST(test_tx01_rearme_com_nivel_ainda_baixo);
    RUN_TEST(test_tx01_reposicao_liga_desliga);
    RUN_TEST(test_tx01_bomba_nao_liga_nivel_baixo);
    RUN_TEST(test_tx01_tempo_maximo_trava);
    RUN_TEST(test_tx01_partidas_demais);
    RUN_TEST(test_tx01_bomba_sem_retorno);
    RUN_TEST(test_plant_nivel_baixo_perde_permissao);
    RUN_TEST(test_plant_bomba_pos_circulacao);
    RUN_TEST(test_plant_nivel_baixo_pressao_ll_bomba_desliga_na_hora);
    RUN_TEST(test_plant_nivel_normaliza_rearme);
    RUN_TEST(test_state_json_contrato);
    return UNITY_END();
}
