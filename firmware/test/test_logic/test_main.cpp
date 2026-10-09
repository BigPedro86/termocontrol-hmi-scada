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
    AnalogValue getTemperature(int h) override { return {50.0f, SensorQuality::OK, 0.0f}; }
    AnalogValue mockPress = {2.0f, SensorQuality::OK, 12.0f};
    AnalogValue getPressure(int h) override { return mockPress; }
    AnalogValue getNovusPV(int h) override { return {50.0f, SensorQuality::OK, 0.0f}; }
    AnalogValue getNovusSV(int h) override { return {50.0f, SensorQuality::OK, 0.0f}; }
    AnalogValue getNovusMV(int h) override { return {50.0f, SensorQuality::OK, 0.0f}; }
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
    TEST_ASSERT_EQUAL(BurnerPhase::STANDBY, b.getPhase());
    
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
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b.getPhase());
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
    CommandHandler::handleCommand("AQ01", "LOCKOUT_COUNT_RESET", "", "Maintenance", &b2, nullptr, nullptr, nullptr);
    
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
    TEST_ASSERT_FALSE(b.hasDiscrepancy()); // 1s < 3s grace period
    
    b.update(in, 3.0f);
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

void test_n8_lockout_initialized_on_boot() {
    HALMockTest hal;
    BurnerLogic b(0, &hal);
    TEST_ASSERT_EQUAL(0, b.getLockouts24h());
}

void test_n8_lockout_count_reset_command() {
    HALMockTest hal;
    BurnerLogic b(0, &hal);
    HeaterInputs in = get_default_inputs();
    
    in.lockout = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(1, b.getLockouts24h());
    
    CommandHandler::handleCommand("AQ01", "LOCKOUT_COUNT_RESET", "", "Admin", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_EQUAL(0, b.getLockouts24h());
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

void test_n9_start_liga_bomba_e_sequencia() {
    BurnerLogic b;
    PumpLogic p;
    HeaterInputs in = get_default_inputs();
    
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, &p, nullptr, nullptr);
    p.update(b.getRequested(), false, false, false, in.pumpFb, 1.0f);
    TEST_ASSERT_TRUE(b.getRequested());
    TEST_ASSERT_TRUE(p.getCmd());
    
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::WAIT_PUMP, b.getPhase());
    
    in.pumpFb = true;
    b.update(in, 10.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::STANDBY, b.getPhase());
    
    in.fan = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::PURGE, b.getPhase());
    
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
}

void test_n9_running_sem_permissao() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.fan = true;
    in.gasValves = true;
    in.lockout = false;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
}

void test_n9_pos_purga_apos_running() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    in.fan = true;
    in.gasValves = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::RUNNING, b.getPhase());
    
    in.gasValves = false;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::POST_PURGE, b.getPhase());
}

void test_n9_timer_ignicao_so_em_purge() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    apply_permission(b, in);
    
    b.update(in, 65.0f);
    TEST_ASSERT_FALSE(b.isIgnitionTimeout());
    
    in.fan = true;
    b.update(in, 1.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::PURGE, b.getPhase());
    
    b.update(in, 65.0f);
    TEST_ASSERT_TRUE(b.isIgnitionTimeout());
}

void test_paradas_comportamentos() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; b.update(in, 1.0f);
    
    in.cmd_start = true; b.update(in, 10.0f);
    TEST_ASSERT_EQUAL(BurnerPhase::STANDBY, b.getPhase());
    
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
    CommandResult r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "", "Supervisor", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("TEMP_STILL_HIGH", r.reason.c_str());
    
    in.temp.value = 80.0f;
    b.update(in, 1.0f);
    
    r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "", "Supervisor", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("LIMIT_RESET_ACCEPTED", r.reason.c_str());
    
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.isSwLimitLatched());
}

void test_bomba_pos_purga() {
    int oldConfig = config.pumpPostCirculationSec;
    config.pumpPostCirculationSec = 3;
    PumpLogic p;
    p.update(true, false, false, false, true, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    
    p.update(false, false, false, false, true, 1.0f); // remove start cmd
    TEST_ASSERT_TRUE(p.getCmd()); // still true because of timer
    
    p.update(false, false, false, false, true, 3.0f); // wait
    TEST_ASSERT_FALSE(p.getCmd()); // false now
    config.pumpPostCirculationSec = oldConfig;
}

void test_bomba_falha_sem_fb() {
    PumpLogic p;
    p.update(true, false, false, false, false, 1.0f); // start cmd, no fb
    TEST_ASSERT_TRUE(p.getCmd());
    
    p.update(true, false, false, false, false, 6.0f); // >5s
    TEST_ASSERT_FALSE(p.getCmd());
    TEST_ASSERT_TRUE(p.isFault());
}

void test_comando_stop_aceito() {
    BurnerLogic b; PumpLogic p;
    CommandResult r = CommandHandler::handleCommand("AQ01", "BURNER_STOP", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "PUMP_STOP", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
}

void test_comando_desconhecido() {
    CommandResult r = CommandHandler::handleCommand("AQ01", "HACK_SYSTEM", "", "Admin", nullptr, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("UNKNOWN_COMMAND", r.reason.c_str());
}

void test_alvo_invalido() {
    CommandResult r = CommandHandler::handleCommand("ZZ99", "BURNER_STOP", "", "Operator", nullptr, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    TEST_ASSERT_EQUAL_STRING("INVALID_TARGET", r.reason.c_str());
}

void test_perfis_servidor() {
    BurnerLogic b; PumpLogic p;
    CommandResult r = CommandHandler::handleCommand("AQ01", "SET_CONFIG", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "SET_CONFIG", "", "Maintenance", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "SW_LIMIT_RESET", "", "Supervisor", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(r.accepted);
    r = CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Admin", &b, &p, nullptr, nullptr);
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
    
    b.update(in, 86399.0f);
    TEST_ASSERT_TRUE(b.getPermission());
    
    b.update(in, 1.0f);
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
    TEST_ASSERT_EQUAL(BurnerPhase::STANDBY, b.getPhase());
}

void test_n10_start_recusado_nao_liga_bomba() {
    BurnerLogic b;
    PumpLogic p;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false; // Add this!
    in.estopOk = false;
    b.update(in, 1.0f);
    
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_FALSE(b.getRequested());
    
    p.update(b.getRequested(), false, false, false, false, 1.0f);
    TEST_ASSERT_FALSE(p.getCmd());
}

void test_n10_stop_queimador_bomba_pos_circulacao() {
    BurnerLogic b;
    PumpLogic p;
    
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_TRUE(b.getRequested());
    
    p.update(b.getRequested(), false, false, false, false, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    
    CommandHandler::handleCommand("AQ01", "BURNER_STOP", "", "Operator", &b, &p, nullptr, nullptr);
    TEST_ASSERT_FALSE(b.getRequested());
    
    p.update(b.getRequested(), false, false, false, false, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd()); 
    
    p.update(b.getRequested(), false, false, false, false, 35.0f);
    TEST_ASSERT_FALSE(p.getCmd());
}

void test_n10_bomba_manual_independente() {
    BurnerLogic b;
    PumpLogic p;
    
    CommandHandler::handleCommand("AQ01", "PUMP_START", "", "Operator", &b, &p, nullptr, nullptr);
    p.update(false, false, false, false, false, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    
    CommandHandler::handleCommand("AQ01", "PUMP_STOP", "", "Operator", &b, &p, nullptr, nullptr);
    p.update(false, false, false, false, false, 1.0f);
    TEST_ASSERT_FALSE(p.getCmd());
}

void test_n7_discrepancy_persists_after_stop() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    
    in.gasValves = true; 
    b.update(in, 4.0f); 
    TEST_ASSERT_TRUE(b.hasDiscrepancy());
    
    CommandHandler::handleCommand("AQ01", "BURNER_STOP", "", "Operator", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_TRUE(b.hasDiscrepancy());
}

void test_n7_parada_normal_sem_discrepancia() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 1.0f);
    
    in.fan = true; in.gasValves = true;
    b.update(in, 1.0f);
    
    CommandHandler::handleCommand("AQ01", "BURNER_STOP", "", "Operator", &b, nullptr, nullptr, nullptr);
    b.update(in, 1.0f);
    
    TEST_ASSERT_FALSE(b.hasDiscrepancy());
}

void test_n7_fault_reset_recusado_com_condicao() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    in.gasValves = true;
    b.update(in, 4.0f);
    
    CommandResult r = CommandHandler::handleCommand("AQ01", "FAULT_RESET", "", "Supervisor", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
}

void test_n7_fault_reset_operador_recusado() {
    BurnerLogic b;
    CommandResult r = CommandHandler::handleCommand("AQ01", "FAULT_RESET", "", "Operator", &b, nullptr, nullptr, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
}

void test_n10_stop_abre_rele_mesmo_ciclo() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 10.0f);
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, nullptr, nullptr, nullptr);
    b.update(in, 10.0f); 
    TEST_ASSERT_TRUE(b.getPermission());
    
    CommandHandler::handleCommand("AQ01", "BURNER_STOP", "", "Operator", &b, nullptr, nullptr, nullptr);
    b.update(in, 0.1f);
    TEST_ASSERT_FALSE(b.getPermission());
}

void test_n10_pump_stop_derruba_queimador() {
    BurnerLogic b; PumpLogic p;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    b.update(in, 10.0f);
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, &p, nullptr, nullptr);
    b.update(in, 10.0f); 
    TEST_ASSERT_TRUE(b.getPermission());
    
    CommandHandler::handleCommand("AQ01", "PUMP_STOP", "", "Operator", &b, &p, nullptr, nullptr);
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getPermission());
}

void test_n10_emergencia_exige_nova_partida() {
    BurnerLogic b;
    HeaterInputs in = get_default_inputs();
    in.cmd_start = false;
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b, nullptr, nullptr, nullptr);
    b.update(in, 1.0f);
    TEST_ASSERT_TRUE(b.getRequested());
    
    in.estopOk = false;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getRequested());
    
    in.estopOk = true;
    b.update(in, 1.0f);
    TEST_ASSERT_FALSE(b.getRequested());
}

void test_n10_pos_circulacao_da_config() {
    int oldConfig = config.pumpPostCirculationSec;
    config.pumpPostCirculationSec = 45;
    PumpLogic p;
    p.update(true, false, false, false, true, 1.0f);
    p.update(false, false, false, false, true, 1.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    p.update(false, false, false, false, true, 43.0f);
    TEST_ASSERT_TRUE(p.getCmd());
    p.update(false, false, false, false, true, 2.0f);
    TEST_ASSERT_FALSE(p.getCmd());
    config.pumpPostCirculationSec = oldConfig;
}

void test_n10_cadeia_aberta_bomba_continua() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1, b2; PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs(); in1.cmd_start = false;
    HeaterInputs in2 = get_default_inputs(); in2.cmd_start = false;
    
    in1.cmd_start = true; in2.cmd_start = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    in1.fan = true; in1.gasValves = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_TRUE(p1.getCmd()); 
    
    in1.chainOk = false;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_FALSE(b1.getPermission()); 
    
    in1.fan = false; in1.gasValves = false;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_EQUAL(BurnerPhase::OFF, b1.getPhase());
    TEST_ASSERT_TRUE(p1.getCmd());
}

void test_n10_sensor_pressao_falha_nao_corta_bomba() {
    PlantLogic plant; TankLogic tx; BurnerLogic b1, b2; PumpLogic p1, p2;
    HeaterInputs in1 = get_default_inputs(); in1.cmd_start = false;
    HeaterInputs in2 = get_default_inputs(); in2.cmd_start = false;
    
    in1.cmd_start = true; in2.cmd_start = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    in1.press.value = 0.0f;
    in1.press.quality = Quality::COMM_LOST;
    
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_FALSE(b1.getPermission());
    
    in1.fan = false; in1.gasValves = false;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    TEST_ASSERT_TRUE(p1.getCmd());
}

void test_n11_state_publica_retorno_real() {
    TankLogic tx;
    TankInputs in = {true, true, true, false, false, false};
    tx.update(in, 1.0f, nullptr);
    
    TankState st = tx.getState();
    TEST_ASSERT_TRUE(st.levelNormal);
    TEST_ASSERT_TRUE(st.pressureLow);
    TEST_ASSERT_TRUE(st.pumpFb);
}

void test_n11_auto_limpa_falha() {
    TankLogic tx;
    TankInputs in = {true, true, false, false, false, false};
    tx.update(in, 10.0f, nullptr); 
    
    TankState st = tx.getState();
    TEST_ASSERT_TRUE(st.pumpFault);
    
    CommandHandler::handleCommand("TX01", "TX01_AUTO", "", "Supervisor", nullptr, nullptr, &tx, nullptr);
    
    st = tx.getState();
    TEST_ASSERT_FALSE(st.pumpFault);
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
    CommandResult r = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "", "Operator", nullptr, nullptr, &t, nullptr);
    TEST_ASSERT_FALSE(r.accepted);
}

void test_tx01_rearme_com_nivel_ainda_baixo() {
    TankLogic t;
    TankInputs in = {false, false, true, false, false, false}; // level normal = false
    t.update(in, 2.1f, nullptr); // latched
    
    CommandResult r = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "", "Supervisor", nullptr, nullptr, &t, nullptr);
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
    
    CommandHandler::handleCommand("AQ01", "PUMP_START", "", "Operator", &b1, &p1, nullptr, nullptr);
    CommandHandler::handleCommand("AQ02", "PUMP_START", "", "Operator", &b2, &p2, nullptr, nullptr);
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b1, &p1, nullptr, nullptr);
    CommandHandler::handleCommand("AQ02", "BURNER_START", "", "Operator", &b2, &p2, nullptr, nullptr);
    
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    TankInputs tin = {false, false, true, false, false, false};
    tx.update(tin, 2.1f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_FALSE(b1.getPermission());
    
    // Tentativa de rearme com nível ainda baixo
    CommandResult res = CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "", "Maintenance", nullptr, nullptr, &tx, nullptr);
    TEST_ASSERT_FALSE(res.accepted);
    TEST_ASSERT_EQUAL_STRING("TANK_LEVEL_STILL_LOW", res.reason.c_str());
    
    // Nível normaliza, mas sem rearme
    tin.levelNormal = true;
    in1.press.value = 2.0f; // Restore pressure!
    tx.update(tin, 1.0f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    TEST_ASSERT_FALSE(b1.getPermission()); // Nothing restarts
    
    // Rearme
    CommandHandler::handleCommand("TX01", "TANK_LEVEL_RESET", "", "Maintenance", nullptr, nullptr, &tx, nullptr);
    tx.update(tin, 1.0f, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    // After reset, it still needs cmd_start edge (BURNER_START)
    TEST_ASSERT_FALSE(b1.getPermission());
    
    // Trigger start edge
    CommandHandler::handleCommand("AQ01", "BURNER_START", "", "Operator", &b1, &p1, nullptr, nullptr);
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 1.0f);
    
    in1.pumpFb = true;
    plant.update(b1, b2, p1, p2, tx, in1, in2, 0.5f, 10.0f);
    
    TEST_ASSERT_EQUAL(BurnerPhase::STANDBY, b1.getPhase());
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

#include "mcp_filter.h"

void test_filtro_mcp() {
    MCPFilter f(40);
    f.setIoFault(false); // test assumes normal operation initially
    uint32_t now = 100;
    
    // Nível alto contínuo = INATIVO (false)
    f.updateRaw(0xFFFF, now);
    now += 5;
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now));
    
    // Nível baixo (0) lido -> ATIVO (true)
    f.updateRaw(0xFFFE, now); // Pino 0 em 0
    now += 5;
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now));
    
    // Pulsando a 100 Hz = período 10ms (10ms baixo, 10ms alto)
    // T = 0ms: BAIXO
    now = 200;
    f.updateRaw(0xFFFE, now);
    
    // T = 5ms: BAIXO
    now = 205;
    f.updateRaw(0xFFFE, now);
    
    // T = 10ms: ALTO
    now = 210;
    f.updateRaw(0xFFFF, now);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now)); // lastLow foi em 205. 210-205 = 5ms <= 40ms. Ativo!
    
    // T = 15ms: ALTO
    now = 215;
    f.updateRaw(0xFFFF, now);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now)); // lastLow foi em 205. 215-205 = 10ms <= 40ms. Ativo!
    
    // T = 20ms: BAIXO (fecha ciclo 100Hz)
    now = 220;
    f.updateRaw(0xFFFE, now);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now)); // lastLow atualizado para 220. Ativo!
    
    // Fio rompido (alto contínuo)
    now = 230;
    f.updateRaw(0xFFFF, now); // ALTO
    
    // Em 260 (260 - 220 = 40)
    now = 260;
    f.updateRaw(0xFFFF, now);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now)); // Ainda ativo (<= 40)
    
    // Em 261
    now = 261;
    f.updateRaw(0xFFFF, now);
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now)); // Inativo (> 40)
}

void test_mcp_falha_i2c() {
    MCPFilter f(40);
    f.setIoFault(false);
    uint32_t now = 100;
    
    // Normal: leitura de opto conduzindo (nível BAIXO = 0 em tudo para simplificar)
    f.updateRaw(0x0000, now);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now));
    TEST_ASSERT_TRUE(f.getFilteredInput(3, now));
    
    // Falha I2C: setIoFault chamado
    f.setIoFault(true);
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now)); // Tudo inativo no mesmo instante
    TEST_ASSERT_FALSE(f.getFilteredInput(3, now));
    
    // Zero recebido durante a falha não engana
    f.updateRaw(0x0000, now); // Se a rotina por engano chamar com 0
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now));
    
    // Restaura falha: lastLowTime devem ser 0
    f.setIoFault(false);
    f.resetFilter();
    now = 110;
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now)); // Não tem tempo para estar ativo
    f.updateRaw(0x0000, now); // Agora lê ativo
    TEST_ASSERT_TRUE(f.getFilteredInput(0, now));
}

void test_mcp_falha_config() {
    MCPFilter f(40);
    f.setIoFault(false);
    // Simula as checagens (mesma lógica que colocamos no hal_esp32.cpp)
    int goodReads = 0;
    
    // Gppu = 0x0000 detectado (errado)
    bool ok = false; 
    if (!ok) {
        f.setIoFault(true);
        goodReads = 0;
    }
    TEST_ASSERT_TRUE(f.isIoFault());
    
    // IODIR = 0xFFFF detectado (errado)
    ok = false;
    if (!ok) {
        f.setIoFault(true);
        goodReads = 0;
    }
    TEST_ASSERT_TRUE(f.isIoFault());
    
    // Voltou ao normal
    ok = true;
    for(int i=0; i<3; i++) {
        if(ok) {
            if(goodReads < 3) goodReads++;
            if(goodReads >= 3 && f.isIoFault()) {
                f.setIoFault(false);
                f.resetFilter();
            }
        }
        if (i < 2) TEST_ASSERT_TRUE(f.isIoFault()); // Ainda não deu 3
    }
    TEST_ASSERT_FALSE(f.isIoFault()); // Após 3 leituras boas
}

void test_mcp_corrida() {
    MCPFilter f(40);
    f.setIoFault(false);
    uint32_t now = 100;
    f.updateRaw(0x0000, 105); // lastLow = 105
    
    // Simula o loop tentando ler em now=100 mas a task atualizou pra 105 entre a atribuição do now e a verificação
    // O getFilteredInput deve retornar true (corrida contornada)
    TEST_ASSERT_TRUE(f.getFilteredInput(0, 100)); 
}

void test_mcp_rollover() {
    MCPFilter f(40);
    f.setIoFault(false);
    
    uint32_t t = 0xFFFFFF00;
    f.updateRaw(0x0000, t); // Lida no fim do millis
    
    // Avança logo antes de virar
    TEST_ASSERT_TRUE(f.getFilteredInput(0, 0xFFFFFF10)); // d = 16 (<=40) -> ativo
    
    // Avança para virar, input some (update com 0xFFFF)
    uint32_t now = 0x00000100;
    f.updateRaw(0xFFFF, now); 
    
    // 0x100 - 0xFFFFFF00 = 0x200 = 512ms. Deve ser inativo!
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now));
}

void test_mcp_boot() {
    MCPFilter f(40);
    
    // No boot, ioFault começa true. 
    TEST_ASSERT_TRUE(f.isIoFault());
    
    // Even if we clear ioFault, seen is false, so it's inactive
    f.setIoFault(false);
    uint32_t now = 10;
    TEST_ASSERT_FALSE(f.getFilteredInput(0, now)); 
    
    // Once we read, it becomes active
    f.updateRaw(0x0000, 15);
    TEST_ASSERT_TRUE(f.getFilteredInput(0, 15));
}

void test_n12_alarm_ack_condicao_normalizada() {
    HALMockTest hal;
    AlarmEngine eng(&hal);
    eng.process(0, 50.0f, 1.0f, false, false, true, false, false, false, false, false); // LFL_LOCKOUT
    
    bool found = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "AQ01_LFL_LOCKOUT" && a.active && !a.acked) found = true;
    }
    TEST_ASSERT_TRUE(found);
    
    eng.process(0, 50.0f, 1.0f, false, false, false, false, false, false, false, false); // normalized
    found = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "AQ01_LFL_LOCKOUT" && !a.active && !a.acked) found = true;
    }
    TEST_ASSERT_TRUE(found);
    
    eng.ackAlarm("AQ01_LFL_LOCKOUT");
    eng.process(0, 50.0f, 1.0f, false, false, false, false, false, false, false, false); // cleanup
    found = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "AQ01_LFL_LOCKOUT") found = true;
    }
    TEST_ASSERT_FALSE(found);
}

void test_n12_alarm_silence_sirene() {
    HALMockTest hal;
    AlarmEngine eng(&hal);
    eng.process(0, 50.0f, 1.0f, false, false, true, false, false, false, false, false); // Critical
    TEST_ASSERT_TRUE(eng.hasCriticalAlarms());
    TEST_ASSERT_TRUE(eng.isSirenOn());
    
    eng.silenceSiren();
    TEST_ASSERT_TRUE(eng.hasCriticalAlarms());
    TEST_ASSERT_FALSE(eng.isSirenOn());
    
    eng.process(1, 50.0f, 1.0f, false, false, true, false, false, false, false, false); // New Critical
    TEST_ASSERT_TRUE(eng.hasCriticalAlarms());
    TEST_ASSERT_TRUE(eng.isSirenOn());
}

void test_n12_alarm_ack_all() {
    HALMockTest hal;
    AlarmEngine eng(&hal);
    eng.process(0, 50.0f, 1.0f, false, false, true, false, false, false, false, false); 
    eng.process(1, 50.0f, 1.0f, false, false, true, false, false, false, false, false); 
    
    eng.process(0, 50.0f, 1.0f, false, false, false, false, false, false, false, false); 
    eng.process(1, 50.0f, 1.0f, false, false, false, false, false, false, false, false); 
    
    eng.ackAlarm("ALL");
    eng.process(0, 50.0f, 1.0f, false, false, false, false, false, false, false, false); 
    
    bool foundAny = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "AQ01_LFL_LOCKOUT" || a.code == "AQ02_LFL_LOCKOUT") foundAny = true;
    }
    TEST_ASSERT_FALSE(foundAny);
}

void test_n12_alarme_boot_esp32_reiniciado() {
    HALMockTest hal;
    AlarmEngine eng(&hal);
    
    bool found = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "SYS_ESP32_RESTART" && !a.active && !a.acked && a.severity == 'H') found = true;
    }
    TEST_ASSERT_TRUE(found);
    
    eng.ackAlarm("SYS_ESP32_RESTART");
    eng.process(0, 50.0f, 1.0f, false, false, false, false, false, false, false, false);
    
    found = false;
    for(auto &a : eng.getAlarms()) {
        if(a.code == "SYS_ESP32_RESTART") found = true;
    }
    TEST_ASSERT_FALSE(found);
}

void test_n2_pressma_real() {
    BurnerLogic b1(0, nullptr), b2(1, nullptr);
    PumpLogic p1, p2;
    TankLogic tx;
    HALMockTest hal;
    AlarmEngine alarms(&hal);
    HeaterInputs in1 = get_default_inputs(), in2 = get_default_inputs();
    
    in1.press.raw_mA = 7.3f;
    in1.press.quality = Quality::OK;
    std::string jsonStr = generateStateJson(1000, true, b1, p1, in1, b2, p2, in2, tx, alarms, hal);
    TEST_ASSERT_TRUE(jsonStr.find("\"pressmA\":7.3") != std::string::npos);
    
    in1.press.quality = Quality::COMM_LOST;
    jsonStr = generateStateJson(1000, true, b1, p1, in1, b2, p2, in2, tx, alarms, hal);
    TEST_ASSERT_TRUE(jsonStr.find("\"pressmA\":null") != std::string::npos);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_partida_normal);
    RUN_TEST(test_filtro_mcp);
    RUN_TEST(test_mcp_falha_i2c);
    RUN_TEST(test_mcp_falha_config);
    RUN_TEST(test_mcp_corrida);
    RUN_TEST(test_mcp_rollover);
    RUN_TEST(test_mcp_boot);
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
    RUN_TEST(test_n8_lockout_initialized_on_boot);
    RUN_TEST(test_n8_lockout_count_reset_command);
    RUN_TEST(test_modbus_sem_resposta);
    RUN_TEST(test_n9_start_liga_bomba_e_sequencia);
    RUN_TEST(test_n9_running_sem_permissao);
    RUN_TEST(test_n9_pos_purga_apos_running);
    RUN_TEST(test_n9_timer_ignicao_so_em_purge);
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
    RUN_TEST(test_n7_discrepancy_persists_after_stop);
    RUN_TEST(test_n10_start_recusado_nao_liga_bomba);
    RUN_TEST(test_n10_stop_queimador_bomba_pos_circulacao);
    RUN_TEST(test_n10_bomba_manual_independente);
    RUN_TEST(test_n7_parada_normal_sem_discrepancia);
    RUN_TEST(test_n7_fault_reset_recusado_com_condicao);
    RUN_TEST(test_n7_fault_reset_operador_recusado);
    RUN_TEST(test_n10_stop_abre_rele_mesmo_ciclo);
    RUN_TEST(test_n10_pump_stop_derruba_queimador);
    RUN_TEST(test_n10_emergencia_exige_nova_partida);
    RUN_TEST(test_n10_pos_circulacao_da_config);
    RUN_TEST(test_n10_cadeia_aberta_bomba_continua);
    RUN_TEST(test_n10_sensor_pressao_falha_nao_corta_bomba);
    RUN_TEST(test_n11_state_publica_retorno_real);
    RUN_TEST(test_n11_auto_limpa_falha);
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
    RUN_TEST(test_n12_alarm_ack_condicao_normalizada);
    RUN_TEST(test_n12_alarm_silence_sirene);
    RUN_TEST(test_n12_alarm_ack_all);
    RUN_TEST(test_n12_alarme_boot_esp32_reiniciado);
    RUN_TEST(test_n2_pressma_real);
    return UNITY_END();
}
