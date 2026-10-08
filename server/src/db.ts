/**
 * db.ts — Configuração do SQLite no servidor
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DATA_DIR = path.resolve(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'scada.db');

export const db = new Database(DB_PATH, {
    // verbose: console.log
});

// Ativar restrições de chaves estrangeiras e performance WAL
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Criação das Tabelas ──────────────────────────────────────────────────────

// Configurações Globais do App
db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`);

// Auditoria
db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        ip TEXT NOT NULL,
        target TEXT NOT NULL,
        command TEXT NOT NULL,
        value TEXT,
        result TEXT NOT NULL
    );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);');

// Histórico de Telemetria
db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        equipment TEXT NOT NULL,
        payload TEXT NOT NULL
    );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_history(ts);');
db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_equipment ON telemetry_history(equipment);');

// Alarmes
db.exec(`
    CREATE TABLE IF NOT EXISTS active_alarms (
        id TEXT PRIMARY KEY,
        equipment TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        cleared INTEGER NOT NULL DEFAULT 0,
        clearedAt TEXT,
        acked INTEGER NOT NULL DEFAULT 0,
        ackedBy TEXT,
        ackedAt TEXT
    );
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS alarm_history (
        id TEXT PRIMARY KEY,
        equipment TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        clearedAt TEXT,
        ackedBy TEXT,
        ackedAt TEXT
    );
`);

// Usuários
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastLogin TEXT
    );
`);

// Inicializa com configurações padrão se estiver vazio
const countSettings = db.prepare('SELECT count(*) as count FROM app_settings').get() as { count: number };
if (countSettings.count === 0) {
    const defaultSettings = {
        protocol: 'WebSocket',
        endpoint: 'ws://localhost:3001',
        updateInterval: 2000,
        minSetpoint: 20,
        maxSetpoint: 95,
        supervisorOnly: true,
        useSimulation: false,
        theme: 'light',
        alarmTempHiHi: 95,
        alarmPresLoLo: 0.5,
    };
    const stmt = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
        for (const [key, value] of Object.entries(defaultSettings)) {
            stmt.run(key, JSON.stringify(value));
        }
    })();
}
