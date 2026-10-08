const WebSocket = require('ws');

const DEVICE_SECRET = 'esp32_termocontrol_device_secret_2024';

async function runTest() {
    console.log("Iniciando mock ESP32...");
    const esp32 = new WebSocket(`ws://localhost:3000/?device=true&secret=${DEVICE_SECRET}`);
    
    esp32.on('open', () => {
        console.log("ESP32 conectado.");
        
        // Envia estado com alarme
        const state = {
            type: "state",
            seq: 1,
            uptime_s: 10,
            estopOk: true,
            heaters: [],
            alarms: [{
                code: "AQ01_TEMP_H",
                severity: "H",
                active: true,
                latched: true,
                since: 1000,
                description: "Temperatura Alta"
            }],
            allowedActions: {}
        };
        
        esp32.send(JSON.stringify(state));
        console.log("ESP32 enviou estado com alarme.");
        
        // Agora HMI conecta DEPOIS do alarme estar ativo
        setTimeout(() => {
            console.log("Iniciando conexão da IHM (modo visualização)...");
            const hmi = new WebSocket(`ws://localhost:3000/`);
            
            hmi.on('open', () => {
                console.log("HMI conectada.");
            });
            
            hmi.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'alarm_update') {
                    console.log("HMI recebeu alarm_update ao conectar:");
                    console.log(JSON.stringify(msg.alarms, null, 2));
                    
                    const found = msg.alarms.find(a => a.type === 'TEMP_H');
                    if (found && found.description === 'Temperatura Alta') {
                        console.log("✓ SUCESSO: Alarme ativo recebido pela IHM recém-conectada.");
                    } else {
                        console.error("✗ FALHA: Alarme não encontrado.");
                    }
                    
                    hmi.close();
                    esp32.close();
                    process.exit(0);
                }
            });
        }, 1000);
    });
}

runTest();
