import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import { URL } from 'url';
import path from 'path';

import {
    seedAdminIfNeeded,
    authenticate,
    verifyToken,
    createUser,
    listUsers,
    deleteUser,
    TokenPayload,
    UserRole,
} from './auth';
import { writeAudit, readAudit } from './audit';
import { loadJson, saveJson } from './persist';
import { pushPoint, queryHistory, cleanOldHistory, bufferSize, flushHistory } from './history';
import { db } from './db';
import { getActiveAlarms, ackAlarm, clearAlarm, raiseAlarm } from './alarms';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[Server] FATAL: JWT_SECRET não definido ou com menos de 32 caracteres no .env. Gere uma chave segura.');
    process.exit(1);
}
if (!process.env.DEVICE_SECRET || process.env.DEVICE_SECRET.length < 32) {
    console.error('[Server] FATAL: DEVICE_SECRET não definido ou com menos de 32 caracteres no .env. Gere uma chave segura.');
    process.exit(1);
}
if (process.env.ADMIN_PASS_HASH === '$2b$10$Aeo.jQnsQ1JNXJlWf/pK1ezerx0AB6pCcsj7NN4h0nLK3lDlELmx2') {
    console.error('[Server] FATAL: ADMIN_PASS_HASH corresponde à senha padrão "admin123". Gere um novo hash bcrypt e atualize o .env.');
    process.exit(1);
}

function dropUserSessions(username: string) {
    wss.clients.forEach(c => {
        const aws = c as AuthenticatedWS;
        if (!aws.isDevice && aws.user?.username === username) {
            aws.close(1008, 'Sessão invalidada');
        }
    });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

seedAdminIfNeeded();

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// ─── Types ───────────────────────────────────────────────────────────────────

export type MeasurementQuality = 'OK' | 'FAULT' | 'NOT_MEASURED' | 'COMM_LOST';

export interface BurnerState {
    phase: string;
    permission: boolean;
    requested: boolean;
    blockReasons: string[];
    lockout: boolean;
    lockoutCount24h: number;
    runHours: number;
}
export interface NovusState {
    commOk: boolean;
    pv: number;
    sp: number;
    mv: number;
    auto: boolean;
    alarms: boolean[];
    quality: MeasurementQuality;
}
export interface Measurement {
    value: number;
    quality: MeasurementQuality;
}
export interface HeaterState {
    id: string;
    name: string;
    burner: BurnerState;
    temp: Measurement;
    press: Measurement;
    novus: NovusState;
    pump: { cmd: boolean; fb: boolean };
    chainOk: boolean;
}
export interface TankState {
    id: string;
    levelNormal: boolean;
    pressureLow: boolean;
    pumpCmd: boolean;
    pumpFb: boolean;
    isAuto: boolean;
    isLatched: boolean;
    name?: string;
}
export interface GLPState {
    currentLevelKg: number; capacityKg: number; dailyConsumption: number;
    readings: { date: string; level: number }[];
    refills: { date: string; quantity: number }[];
}
interface SystemState { 
    seq?: number;
    uptime_s?: number;
    estopOk?: boolean;
    heaters: HeaterState[]; 
    tank: TankState; 
    glp: GLPState; 
    allowedActions?: Record<string, string[]>;
}

interface AuthenticatedWS extends WebSocket {
    isDevice: boolean;
    user: TokenPayload | null;
    ip: string;
}

// ─── P1: GLP persistido em disco ─────────────────────────────────────────────

const GLP_DEFAULT: GLPState = {
    currentLevelKg: 3500, capacityKg: 8000, dailyConsumption: 120, readings: [], refills: [],
};
let glpState: GLPState = loadJson<GLPState>('glp.json', GLP_DEFAULT);
console.log(`[Server] GLP carregado do disco: ${glpState.currentLevelKg.toFixed(0)} kg`);

function persistGLP() {
    saveJson('glp.json', glpState);
}

// ─── Estado do sistema ────────────────────────────────────────────────────────

const baseHeaters: Record<string, Partial<HeaterState>> = {
    AQ01: { id: 'AQ01', name: 'Aquecedor 01' },
    AQ02: { id: 'AQ02', name: 'Aquecedor 02' },
};
const baseTank: Partial<TankState> = {
    id: 'TX01', name: 'Tanque de Expansão',
};
let currentState: SystemState = {
    seq: 0,
    uptime_s: 0,
    estopOk: true,
    heaters: Object.values(baseHeaters).map(b => ({
        id: b.id!, name: b.name!,
        burner: { phase: 'OFF', permission: false, requested: false, blockReasons: [], lockout: false, lockoutCount24h: 0, runHours: 0 },
        temp: { value: 0, quality: 'OK' },
        press: { value: 0, quality: 'OK' },
        novus: { commOk: false, pv: 0, sp: 0, mv: 0, auto: false, alarms: [false, false], quality: 'OK' },
        pump: { cmd: false, fb: false },
        chainOk: false,
    })),
    tank: {
        id: baseTank.id!, name: baseTank.name!, levelNormal: true, pressureLow: false,
        pumpCmd: false, pumpFb: false, isAuto: true, isLatched: false
    },
    glp: glpState,
    allowedActions: {},
};

// ─── P2: Coleta de histórico (1 ponto/min) ────────────────────────────────────

setInterval(() => {
    const heatersMap: Record<string, any> = {};
    currentState.heaters.forEach((h: any) => {
        heatersMap[h.id] = {
            temp: h.temp?.quality === 'OK' ? h.temp.value : null,
            tempQuality: h.temp?.quality || 'OK',
            pressure: h.press?.quality === 'OK' ? h.press.value : null,
            pressureQuality: h.press?.quality || 'OK',
            pumpStatus: h.pump?.fb ? 'On' : 'Off',
            burnerPhase: h.burner?.phase || 'OFF',
            modulation: h.novus?.quality === 'OK' ? h.novus.mv : null,
            modulationQuality: h.novus?.quality || 'OK',
            setpoint: h.novus?.quality === 'OK' ? h.novus.sp : null,
            setpointQuality: h.novus?.quality || 'OK',
        };
    });
    pushPoint({
        ts: Date.now(),
        heaters: heatersMap,
        tank: {
            levelNormal: currentState.tank.levelNormal,
            pressureLow: currentState.tank.pressureLow,
            pumpCmd: currentState.tank.pumpCmd,
            isLatched: currentState.tank.isLatched,
        },
        glp: { currentLevelKg: glpState.currentLevelKg },
    });
}, 10_000); // 10 segundos

// Limpeza diária de retenção de telemetria (7 dias)
setInterval(() => {
    cleanOldHistory(7 * 24 * 60 * 60 * 1000);
}, 24 * 60 * 60 * 1000);

// ─── Watchdog (B1) ────────────────────────────────────────────────────────────

const DEVICE_TIMEOUT_MS = 6000;
let lastDeviceUpdate = 0;
let deviceIsOnline = false;

setInterval(() => {
    if (lastDeviceUpdate === 0) return;
    if (Date.now() - lastDeviceUpdate > DEVICE_TIMEOUT_MS && deviceIsOnline) {
        deviceIsOnline = false;
        console.warn('[Server] ⚠ Dispositivo offline');
        
        raiseAlarm('SYS', 'COMM_LOST', 'Perda de Comunicação com ESP32 (>6s)', 'Danger');
        broadcastAlarms();
        
        broadcastToHMI(JSON.stringify({ type: 'device_offline' }));
    }
}, 2000);

// ─── Rate Limiting (S2) ───────────────────────────────────────────────────────

const commandCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = commandCounts.get(ip);
    if (!entry || now > entry.resetAt) {
        commandCounts.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 10) return false;
    entry.count++;
    return true;
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function buildPayload(): SystemState {
    return { ...currentState, glp: glpState };
}
function broadcastToHMI(message: string) {
    wss.clients.forEach(c => {
        const ws = c as AuthenticatedWS;
        if (!ws.isDevice && ws.readyState === WebSocket.OPEN) ws.send(message);
    });
}
function broadcastState() {
    broadcastToHMI(JSON.stringify({ type: 'state', payload: buildPayload() }));
}
let lastAlarmsHash = '';
function broadcastAlarms() {
    const alarms = getActiveAlarms();
    const hash = JSON.stringify(alarms.map(a => a.id + a.cleared + a.acked));
    if (hash === lastAlarmsHash) return;
    lastAlarmsHash = hash;
    broadcastToHMI(JSON.stringify({ type: 'alarm_update', alarms }));
}

// ─── Merge helpers (B4) ───────────────────────────────────────────────────────

function mergeHeaters(incoming: Partial<HeaterState>[]): HeaterState[] {
    return currentState.heaters.map(known => {
        const update = incoming.find(h => h.id === known.id);
        return update ? { ...known, ...update } : known;
    });
}
function mergeTank(incoming: Partial<TankState>): TankState {
    return { ...currentState.tank, ...incoming };
}

// ─── GLP Commands (B3) ────────────────────────────────────────────────────────

function handleGLPCommand(cmd: { command: string; value: unknown }) {
    if (cmd.command === 'addReading') {
        const pct = Number(cmd.value);
        if (isNaN(pct) || pct < 0 || pct > 100) return;
        const kg = (pct / 100) * glpState.capacityKg;
        glpState = {
            ...glpState, currentLevelKg: kg,
            readings: [{ date: new Date().toLocaleString('pt-BR'), level: kg }, ...glpState.readings].slice(0, 50),
        };
    } else if (cmd.command === 'addRefill') {
        const qty = Number(cmd.value);
        if (isNaN(qty) || qty <= 0) return;
        glpState = {
            ...glpState,
            currentLevelKg: Math.min(glpState.capacityKg, glpState.currentLevelKg + qty),
            refills: [{ date: new Date().toLocaleDateString('pt-BR'), quantity: qty }, ...glpState.refills].slice(0, 50),
        };
    }
    // P1: Persiste GLP imediatamente após mutação
    persistGLP();
}

// ─── WebSocket upgrade com autenticação (S1) ──────────────────────────────────

const DEVICE_SECRET = process.env.DEVICE_SECRET || '';

server.on('upgrade', (request, socket, head) => {
    const baseUrl = `http://localhost${request.url ?? '/'}`;
    const params = new URL(baseUrl).searchParams;

    if (params.get('device') === 'true') {
        const secret = params.get('secret') || '';
        if (!DEVICE_SECRET || secret !== DEVICE_SECRET) {
            console.warn('[Server] ESP32 rejeitado: DEVICE_SECRET inválido');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Derruba dispositivo antigo se houver
        wss.clients.forEach(c => {
            const cws = c as AuthenticatedWS;
            if (cws.isDevice) {
                console.warn('[Server] Derrubando conexão ESP32 antiga em favor de nova.');
                cws.close(1008, 'Nova conexão substituiu a atual');
            }
        });

        wss.handleUpgrade(request, socket, head, ws => {
            const aws = ws as AuthenticatedWS;
            aws.isDevice = true; aws.user = null;
            aws.ip = request.socket.remoteAddress ?? 'unknown';
            wss.emit('connection', aws, request);
        });
        return;
    }

    const token = params.get('token');
    let payload = null;
    if (token) {
        payload = verifyToken(token);
        if (payload) {
            const { getUserById } = require('./auth');
            const dbUser = getUserById(payload.sub);
            if (!dbUser || dbUser.role !== payload.role) {
                payload = null;
            }
        }
        if (!payload) {
            console.warn('[Server] HMI rejeitado: token inválido, expirado ou usuário excluído');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
    }

    wss.handleUpgrade(request, socket, head, ws => {
        const aws = ws as AuthenticatedWS;
        aws.isDevice = false; aws.user = payload; // null == View-Only
        aws.ip = request.socket.remoteAddress ?? 'unknown';
        wss.emit('connection', aws, request);
    });
});

// ─── WebSocket connection handler ─────────────────────────────────────────────

wss.on('connection', (ws: WebSocket) => {
    const aws = ws as AuthenticatedWS;
    const who = aws.isDevice ? 'ESP32' : `HMI(${aws.user?.username})`;
    console.log(`[Server] Conectado: ${who} de ${aws.ip}`);

    const closeHandler = () => console.log(`[Server] Desconectado: ${who}`);

    if (!aws.isDevice) {
        aws.send(JSON.stringify({ type: 'state', payload: buildPayload() }));
        aws.send(JSON.stringify({ type: deviceIsOnline ? 'device_online' : 'device_offline' }));
        aws.on('close', closeHandler);
    } else {
        const pingInterval = setInterval(() => {
            if (aws.readyState === WebSocket.OPEN) aws.send(JSON.stringify({ type: 'ping' }));
        }, 2000);
        aws.on('close', () => { clearInterval(pingInterval); closeHandler(); });
    }

    aws.on('message', (message: Buffer | string) => {
        try {
            const data = JSON.parse(message.toString());
            if (!data || typeof data.type !== 'string') return;

            if (data.type === 'state') {
                if (!aws.isDevice) {
                    console.warn(`[Server] ⛔ HMI(${aws.user?.username || 'View-Only'}) tentou enviar state — IGNORADO`);
                    return;
                }
                if (!data) return; // O payload agora é o próprio data (sem "payload" em volta segundo o protocolo)
                
                // O estado novo é a base, fazemos o merge sobre ele (a rigor o protocolo diz q o ESP32 manda tudo)
                if (Array.isArray(data.heaters)) currentState.heaters = mergeHeaters(data.heaters);
                if (data.tank) currentState.tank = mergeTank(data.tank);

                lastDeviceUpdate = Date.now();
                if (!deviceIsOnline) {
                    deviceIsOnline = true;
                    console.log('[Server] ✓ ESP32 online');
                    const { clearAlarm } = require('./alarms');
                    clearAlarm('SYS', 'COMM_LOST');
                    broadcastAlarms();
                    broadcastToHMI(JSON.stringify({ type: 'device_online' }));
                }
                
                // Sincroniza alarmes direto do ESP32
                const { syncAlarmsFromDevice } = require('./alarms');
                syncAlarmsFromDevice(data.alarms || []);
                broadcastAlarms();
                
                // Agora enviamos o estado completo para os HMIs
                broadcastToHMI(JSON.stringify({ type: 'state', ...data, glp: glpState }));
                return;
            }

            if (data.type === 'ack') {
                if (!aws.isDevice) return;
                
                // Repassa o ack para as telas e registra na auditoria
                writeAudit({ timestamp: new Date().toISOString(), username: 'ESP32', role: 'Device', ip: aws.ip, target: data.id || 'N/A', command: 'ACK', value: data.accepted ? 'ACCEPTED' : 'REJECTED', result: data.reason });
                
                const ackMsg = JSON.stringify(data);
                wss.clients.forEach(c => {
                    const cws = c as AuthenticatedWS;
                    if (!cws.isDevice && cws.readyState === WebSocket.OPEN) cws.send(ackMsg);
                });
                return;
            }

            if (data.type === 'command') {
                if (aws.isDevice) return;
                if (!aws.user) {
                    aws.send(JSON.stringify({ type: 'error', message: 'Modo visualização. Faça login para comandar.' }));
                    return;
                }
                const user = aws.user;
                if (typeof data.target !== 'string' || typeof data.command !== 'string') return;

                if (data.command !== 'BURNER_STOP' && data.command !== 'PUMP_STOP' && data.command !== 'TX01_PUMP_STOP' && !checkRateLimit(user.username)) { // Bloqueio por user em vez de IP
                    aws.send(JSON.stringify({ type: 'error', message: 'Rate limit atingido. Aguarde 1 minuto.' }));
                    writeAudit({ timestamp: new Date().toISOString(), username: user.username, role: user.role, ip: aws.ip, target: data.target, command: data.command, value: data.value, result: 'rate_limited' });
                    return;
                }

                writeAudit({ timestamp: new Date().toISOString(), username: user.username, role: user.role, ip: aws.ip, target: data.target, command: data.command, value: data.value, result: data.target === 'GLP' ? 'glp_ok' : 'sent' });
                console.log(`[Server] Cmd de ${user.username}(${user.role}): ${data.target}.${data.command}=${data.value}`);

                if (data.target === 'GLP') {
                    handleGLPCommand(data);
                    // Como não disparamos o broadcast state do hardware, mandamos só o glp:
                    broadcastState();
                    return;
                }

                // Prepara a mensagem para o ESP32 carimbando o user e role
                const commandToDevice = {
                    type: 'command',
                    id: data.id || crypto.randomUUID(),
                    target: data.target,
                    command: data.command,
                    value: data.value,
                    user: user.username,
                    role: user.role,
                    reason: data.reason || 'S/N'
                };

                const commandMsg = JSON.stringify(commandToDevice);
                wss.clients.forEach(c => {
                    const cws = c as AuthenticatedWS;
                    if (cws.isDevice && cws.readyState === WebSocket.OPEN) cws.send(commandMsg);
                });
            }
        } catch (e) {
            console.error('[Server] Erro JSON:', e);
        }
    });

    // close handler attached earlier
});

// ─── REST: Autenticação ───────────────────────────────────────────────────────

const loginAttempts = new Map<string, { count: number, resetAt: number }>();

app.post('/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) { res.status(400).json({ error: 'username e password são obrigatórios.' }); return; }

    const now = Date.now();
    const attempt = loginAttempts.get(username);
    
    if (attempt && now < attempt.resetAt && attempt.count >= 5) {
        res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
        return;
    }

    const token = authenticate(username, password);
    if (!token) {
        if (attempt && now < attempt.resetAt) {
            attempt.count++;
        } else {
            loginAttempts.set(username, { count: 1, resetAt: now + 60000 });
        }
        res.status(401).json({ error: 'Credenciais inválidas.' }); return;
    }
    
    loginAttempts.delete(username);
    const payload = verifyToken(token)!;
    console.log(`[Auth] Login: ${username} (${payload.role})`);
    writeAudit({ timestamp: new Date().toISOString(), username, role: payload.role, ip: req.socket.remoteAddress ?? 'unknown', target: 'AUTH', command: 'LOGIN', value: null, result: 'success' });
    res.json({ token, user: { name: payload.username, role: payload.role } });
});

// ─── Middlewares REST ─────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Token não fornecido.' }); return; }
    const payload = verifyToken(auth.slice(7));
    if (!payload) { res.status(401).json({ error: 'Token inválido ou expirado.' }); return; }
    
    // Confere no banco se o usuário ainda existe e se a role mudou
    const { getUserById } = require('./auth');
    const dbUser = getUserById(payload.sub);
    if (!dbUser || dbUser.role !== payload.role) {
        res.status(401).json({ error: 'Sessão invalidada (usuário alterado ou excluído).' });
        return;
    }

    (req as any).user = payload;
    next();
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if ((req as any).user?.role !== 'Admin') { res.status(403).json({ error: 'Acesso restrito a administradores.' }); return; }
    next();
}

// ─── REST: Usuários ───────────────────────────────────────────────────────────

app.get('/users', requireAuth, requireAdmin, (_req, res) => res.json(listUsers()));

app.post('/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const { username, password, role } = req.body ?? {};
    const validRoles: UserRole[] = ['Operator', 'Supervisor', 'Maintenance', 'Admin'];
    if (!username || !password || !validRoles.includes(role)) { res.status(400).json({ error: 'username, password e role são obrigatórios.' }); return; }
    try { const u = createUser(username, password, role as UserRole); res.status(201).json({ id: u.id, username: u.username, role: u.role }); }
    catch (e: any) { res.status(409).json({ error: e.message }); }
});

app.delete('/users/:username', requireAuth, requireAdmin, (req: Request, res: Response) => {
    if (!deleteUser(req.params.username)) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
    dropUserSessions(req.params.username);
    res.json({ ok: true });
});

// ─── REST: Configurações do Sistema ───────────────────────────────────────────

function getSettings(): Record<string, any> {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string, value: string }[];
    const settings: Record<string, any> = {};
    for (const row of rows) {
        settings[row.key] = JSON.parse(row.value);
    }
    return settings;
}

app.get('/settings', requireAuth, (_req, res) => {
    try {
        res.json(getSettings());
    } catch (e) {
        res.status(500).json({ error: 'Erro ao ler configurações.' });
    }
});

app.put('/settings', requireAuth, requireAdmin, (req: Request, res: Response) => {
    const newSettings = req.body;
    if (!newSettings || typeof newSettings !== 'object') {
        res.status(400).json({ error: 'Body inválido.' });
        return;
    }
    
    try {
        const updateStmt = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        db.transaction(() => {
            for (const [key, value] of Object.entries(newSettings)) {
                updateStmt.run(key, JSON.stringify(value));
            }
        })();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

// ─── REST: Estado ─────────────────────────────────────────────────────────────

app.get('/state', requireAuth, (_req, res) => res.json({ deviceIsOnline, state: buildPayload() }));

// ─── REST: P3 — Histórico de telemetria ──────────────────────────────────────
//
// GET /history?equipment=AQ01&from=<ISO>&to=<ISO>&limit=<N>
//
// Retorna array de pontos projetados para o equipamento pedido.
// Se equipment não for especificado, retorna o ponto completo.

app.get('/history', requireAuth, (req: Request, res: Response) => {
    const equipment = (req.query.equipment as string | undefined)?.toUpperCase();
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    
    if (!equipment) {
        res.status(400).json({ error: 'Parâmetro equipment é obrigatório.' });
        return;
    }

    const now = Date.now();
    const from = fromStr ? new Date(fromStr).getTime() : now - 24 * 60 * 60 * 1000;
    const to = toStr ? new Date(toStr).getTime() : now;

    if (isNaN(from) || isNaN(to)) {
        res.status(400).json({ error: 'from/to inválidos. Use ISO 8601.' });
        return;
    }

    const points = queryHistory(equipment, from, to);
    res.json(points);
});

// ─── REST: P5 — Exportação CSV ────────────────────────────────────────────────
//
// GET /history/export?equipment=AQ01&from=<ISO>&to=<ISO>

app.get('/history/export', requireAuth, (req: Request, res: Response) => {
    const equipment = (req.query.equipment as string | undefined)?.toUpperCase() || 'AQ01';
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;

    const now = Date.now();
    const from = fromStr ? new Date(fromStr).getTime() : now - 24 * 60 * 60 * 1000;
    const to = toStr ? new Date(toStr).getTime() : now;

    const points = queryHistory(equipment, from, to);

    let header = '';
    let rows = '';

    if (equipment === 'TX01') {
        header = 'timestamp,levelNormal,pressureLow,pumpCmd,isLatched\n';
        rows = points.map(p => `${new Date(p.ts).toISOString()},${p.levelNormal},${p.pressureLow},${p.pumpCmd},${p.isLatched}`).join('\n');
    } else if (equipment === 'GLP') {
        header = 'timestamp,currentLevelKg\n';
        rows = points.map(p => `${new Date(p.ts).toISOString()},${p.currentLevelKg.toFixed(2)}`).join('\n');
    } else {
        header = 'timestamp,temperature_C,pressure_bar,pumpStatus,burnerPhase,modulation_%,setpoint_C\n';
        rows = points.map(p => `${new Date(p.ts).toISOString()},${p.temp},${p.pressure},${p.pumpStatus},${p.burnerPhase},${p.modulation},${p.setpoint}`).join('\n');
    }

    const csv = header + rows;
    const filename = `termocontrol_${equipment}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
});

// ─── REST: Alarmes (Fase 5) ───────────────────────────────────────────────────

app.get('/alarms', (_req, res) => {
    res.json(getActiveAlarms());
});

app.post('/alarms/:id/ack', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).user?.username || 'unknown';
    const ok = ackAlarm(req.params.id, user);
    if (ok) {
        broadcastAlarms();
        res.json({ ok: true });
    } else {
        res.status(404).json({ error: 'Alarme não encontrado ou já reconhecido' });
    }
});

// duplicate route removed

// ─── REST: Auditoria ─────────────────────────────────────────────────────────

app.get('/audit', requireAuth, requireAdmin, (_req, res) => res.json(readAudit(200)));

// ─── REST: Logs do servidor ───────────────────────────────────────────────────
// Info rápida sobre o estado do histórico (sem auth de admin)

app.get('/history/stats', requireAuth, (_req, res) => {
    const total = bufferSize();
    res.json({
        totalPoints: total,
        maxPoints: 1440,
        coveredHours: +(total / 1440).toFixed(1),
    });
});

// ─── Front-end Estático ───────────────────────────────────────────────────────
// Servir arquivos estáticos do frontend (diretório raiz /dist)
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Fallback para o React Router (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
server.listen(PORT, () => {
    console.log(`[Server] Backend SCADA → http://localhost:${PORT}`);
    console.log(`[Server] GET  /history?equipment=AQ01&from=<ISO>&to=<ISO>`);
    console.log(`[Server] GET  /history/export?equipment=AQ01`);
});

// Flush graceful ao encerrar
process.on('SIGINT', () => { flushHistory(); persistGLP(); process.exit(0); });
process.on('SIGTERM', () => { flushHistory(); persistGLP(); process.exit(0); });
