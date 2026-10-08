import { server, wss } from '../index';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';
import { generateToken } from '../auth';


describe('Protocolo Flat (N1, N2, N14, N15)', () => {
    let port: number;
    let deviceWs: WebSocket;
    let hmiWs: WebSocket;
    let authHmiWs: WebSocket;

    beforeAll((done) => {
        server.listen(0, () => {
            port = (server.address() as AddressInfo).port;
            done();
        });
    });

    afterAll((done) => {
        if (deviceWs) deviceWs.close();
        if (hmiWs) hmiWs.close();
        if (authHmiWs) authHmiWs.close();
        wss.close(() => {
            server.close(done);
        });
    });

    it('HMI recebe estado inicial com COMM_LOST antes do primeiro state do ESP32', (done) => {
        hmiWs = new WebSocket(`ws://localhost:${port}/?token=`);
        
        hmiWs.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'state') {
                const payload = msg.payload || msg;
                const aq01 = payload.heaters.find((h: any) => h.id === 'AQ01');
                expect(aq01.temp.quality).toBe('COMM_LOST');
                expect(aq01.temp.value).toBeNull();
                expect(aq01.novus.quality).toBe('COMM_LOST');
                done();
            }
        });
    });

    it('ESP32 envia state plano e HMI recebe o estado mesclado atualizado', (done) => {
        deviceWs = new WebSocket(`ws://localhost:${port}/?device=true&secret=esp32_termocontrol_device_secret_2024`);
        
        deviceWs.on('open', () => {
            const stateStr = fs.readFileSync('c:/Projetos/termocontrol-hmi_scada/docs/protocolo/state.exemplo.json', 'utf-8');
            deviceWs.send(stateStr);
        });

        hmiWs.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'state') {
                const payload = msg.payload || msg;
                const aq01 = payload.heaters?.find((h: any) => h.id === 'AQ01');
                if (aq01 && aq01.temp.value === 60.5) {
                    expect(aq01.temp.quality).toBe('OK');
                    expect(aq01.burner.phase).toBe('STANDBY');
                    expect(payload.glp).toBeDefined(); // Verifica merge
                    done();
                }
            }
        });
    });

    it('Servidor repassa comandos planos da HMI para o ESP32, mesmo que não estejam em allowedActions', (done) => {
        const { getUserByUsername } = require('../auth');
        const adminUser = getUserByUsername('admin');
        const token = generateToken(adminUser);
        authHmiWs = new WebSocket(`ws://localhost:${port}/?token=${token}`);

        const handler = (data: WebSocket.Data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'command' && msg.command === 'UNKNOWN_COMMAND') {
                expect(msg.target).toBe('AQ01');
                expect(msg.user).toBe('admin');
                deviceWs.off('message', handler);
                done();
            }
        };
        deviceWs.on('message', handler);

        authHmiWs.on('open', () => {
            authHmiWs.send(JSON.stringify({
                type: 'command',
                id: 'test-1',
                target: 'AQ01',
                command: 'UNKNOWN_COMMAND',
                value: null
            }));
        });
    });

    it('Comandos de parada ignoram rate limit (ex: TX01_PUMP_STOP)', (done) => {
        // Enviar 11 comandos normais para esgotar rate limit
        for (let i = 0; i < 11; i++) {
            authHmiWs.send(JSON.stringify({
                type: 'command',
                id: `flood-${i}`,
                target: 'AQ01',
                command: 'PUMP_START',
                value: null
            }));
        }

        const handler = (data: WebSocket.Data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'command' && msg.command === 'TX01_PUMP_STOP') {
                expect(msg.target).toBe('TX01');
                deviceWs.off('message', handler);
                done();
            }
        };
        deviceWs.on('message', handler);

        setTimeout(() => {
            // Este comando deve passar, mesmo com rate limit estourado
            authHmiWs.send(JSON.stringify({
                type: 'command',
                id: 'stop-bypass',
                target: 'TX01',
                command: 'TX01_PUMP_STOP',
                value: null
            }));
        }, 100);
    });
});
