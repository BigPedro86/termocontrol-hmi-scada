/**
 * persist.ts — Utilitário genérico de persistência JSON
 *
 * Salva e carrega qualquer objeto em server/data/<filename>.json
 * de forma síncrona (adequado para dados pequenos em contexto SCADA).
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function loadJson<T>(filename: string, defaultValue: T): T {
    ensureDataDir();
    const file = path.join(DATA_DIR, filename);
    if (!fs.existsSync(file)) return defaultValue;
    try {
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw) as T;
    } catch (e) {
        console.warn(`[Persist] Erro ao ler ${filename}:`, e);
        return defaultValue;
    }
}

export function saveJson<T>(filename: string, data: T): void {
    ensureDataDir();
    const file = path.join(DATA_DIR, filename);
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error(`[Persist] Erro ao salvar ${filename}:`, e);
    }
}
