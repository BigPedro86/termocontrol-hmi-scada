/**
 * history.ts — Histórico de telemetria persistido no SQLite
 */

import { db } from './db';

export interface HeaterPoint {
    temp: number;
    pressure: number;
    pumpStatus: string;
    burnerStatus: string;
    modulation: number;
    setpoint: number;
}

export interface TankPoint {
    levelNormal: boolean;
    pressureLow: boolean;
    pumpCmd: boolean;
    isLatched: boolean;
}

export interface GlpPoint {
    currentLevelKg: number;
}

export interface HistoryPoint {
    ts: number;                             
    heaters: Record<string, HeaterPoint>;   
    tank: TankPoint;
    glp: GlpPoint;
}

// ─── SQL Statements ───────────────────────────────────────────────────────────

const insertStmt = db.prepare(`
    INSERT INTO telemetry_history (ts, equipment, payload)
    VALUES (@ts, @equipment, @payload)
`);

const deleteOldStmt = db.prepare(`
    DELETE FROM telemetry_history WHERE ts < ?
`);

const selectStmt = db.prepare(`
    SELECT ts, payload FROM telemetry_history
    WHERE equipment = ? AND ts >= ? AND ts <= ?
    ORDER BY ts ASC
`);

const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM telemetry_history
`);

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Adiciona um ponto ao banco SQLite.
 */
export function pushPoint(point: HistoryPoint): void {
    try {
        db.transaction(() => {
            // Separa os pontos por equipamento (AQ01, AQ02, TX01, GLP)
            Object.entries(point.heaters).forEach(([id, data]) => {
                insertStmt.run({ ts: point.ts, equipment: id, payload: JSON.stringify(data) });
            });
            insertStmt.run({ ts: point.ts, equipment: 'TX01', payload: JSON.stringify(point.tank) });
            insertStmt.run({ ts: point.ts, equipment: 'GLP', payload: JSON.stringify(point.glp) });
        })();
    } catch (e) {
        console.error('[History] Erro ao gravar telemetria:', e);
    }
}

/**
 * Retorna os pontos para um equipamento específico.
 */
export function queryHistory(equipment: string, from: number, to: number): any[] {
    try {
        const rows = selectStmt.all(equipment, from, to) as any[];
        return rows.map(r => ({
            ts: r.ts,
            ...JSON.parse(r.payload)
        }));
    } catch (e) {
        console.error('[History] Erro ao consultar telemetria:', e);
        return [];
    }
}

/**
 * Limpa dados mais antigos que N milissegundos a partir de agora.
 */
export function cleanOldHistory(retentionMs: number): void {
    try {
        const threshold = Date.now() - retentionMs;
        const result = deleteOldStmt.run(threshold);
        if (result.changes > 0) {
            console.log(`[History] Limpeza: removidos ${result.changes} pontos de telemetria antigos.`);
        }
    } catch (e) {
        console.error('[History] Erro na limpeza:', e);
    }
}

/** Retorna o número total de pontos no buffer (tabela de telemetria) */
export function bufferSize(): number {
    try {
        const r = countStmt.get() as { count: number };
        return r.count;
    } catch {
        return 0;
    }
}

/** Não é mais necessário flush manual. */
export function flushHistory(): void {}
