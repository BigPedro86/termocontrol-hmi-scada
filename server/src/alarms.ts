/**
 * alarms.ts — Motor de Alarmes do Backend
 */

import { db } from './db';
import crypto from 'crypto';

export interface Alarm {
    id: string;
    equipment: string;
    type: string;
    description: string;
    severity: 'Warning' | 'Danger' | 'Info';
    timestamp: string;
    cleared: boolean;
    clearedAt?: string;
    acked: boolean;
    ackedBy?: string;
    ackedAt?: string;
}

// ─── SQL Statements ───────────────────────────────────────────────────────────

const getActiveStmt = db.prepare(`SELECT * FROM active_alarms ORDER BY timestamp DESC`);
const findActiveStmt = db.prepare(`SELECT id, cleared, acked FROM active_alarms WHERE equipment = ? AND type = ?`);
const insertActiveStmt = db.prepare(`
    INSERT INTO active_alarms (id, equipment, type, description, severity, timestamp)
    VALUES (@id, @equipment, @type, @description, @severity, @timestamp)
`);
const markClearedStmt = db.prepare(`UPDATE active_alarms SET cleared = 1, clearedAt = ? WHERE id = ?`);
const markAckedStmt = db.prepare(`UPDATE active_alarms SET acked = 1, ackedBy = ?, ackedAt = ? WHERE id = ?`);
const deleteActiveStmt = db.prepare(`DELETE FROM active_alarms WHERE id = ?`);
const insertHistoryStmt = db.prepare(`
    INSERT INTO alarm_history (id, equipment, type, description, severity, timestamp, clearedAt, ackedBy, ackedAt)
    VALUES (@id, @equipment, @type, @description, @severity, @timestamp, @clearedAt, @ackedBy, @ackedAt)
`);

// ─── Lógica Central ───────────────────────────────────────────────────────────

export function getActiveAlarms(): Alarm[] {
    try {
        const rows = getActiveStmt.all() as any[];
        return rows.map(r => ({
            ...r,
            cleared: r.cleared === 1,
            acked: r.acked === 1
        }));
    } catch (e) {
        console.error('[Alarms] Erro ao ler alarmes ativos:', e);
        return [];
    }
}

/** Levanta um alarme se ele já não estiver ativo */
export function raiseAlarm(equipment: string, type: string, description: string, severity: 'Warning'|'Danger'|'Info') {
    const existing = findActiveStmt.get(equipment, type) as any;
    if (!existing) {
        const newAlarm = {
            id: crypto.randomUUID(),
            equipment,
            type,
            description,
            severity,
            timestamp: new Date().toISOString()
        };
        insertActiveStmt.run(newAlarm);
        console.log(`[ALARM RAISED] ${equipment} - ${type}: ${description}`);
    } else if (existing.cleared === 1) {
        // Se já estava resolvido mas ainda não foi dado ACK, e o problema voltou a ocorrer,
        // vamos "des-resolver" o alarme.
        db.prepare('UPDATE active_alarms SET cleared = 0, clearedAt = NULL WHERE id = ?').run(existing.id);
        console.log(`[ALARM RE-RAISED] ${equipment} - ${type}`);
    }
}

/** Resolve um alarme ativo (problema acabou) */
export function clearAlarm(equipment: string, type: string) {
    const existing = findActiveStmt.get(equipment, type) as any;
    if (existing && existing.cleared === 0) {
        markClearedStmt.run(new Date().toISOString(), existing.id);
        console.log(`[ALARM CLEARED] ${equipment} - ${type}`);
        checkLifecycle(existing.id);
    }
}

/** Usuário clica em ACK na interface */
export function ackAlarm(id: string, username: string): boolean {
    const row = db.prepare('SELECT id, cleared, acked FROM active_alarms WHERE id = ?').get(id) as any;
    if (!row) return false;
    
    if (row.acked === 0) {
        markAckedStmt.run(username, new Date().toISOString(), id);
        console.log(`[ALARM ACKED] ID: ${id} by ${username}`);
        checkLifecycle(id);
    }
    return true;
}

/** Move para o histórico se estiver Cleared E Acked */
function checkLifecycle(id: string) {
    const row = db.prepare('SELECT * FROM active_alarms WHERE id = ?').get(id) as any;
    if (row && row.cleared === 1 && row.acked === 1) {
        db.transaction(() => {
            insertHistoryStmt.run(row);
            deleteActiveStmt.run(id);
        })();
        console.log(`[ALARM ARCHIVED] ID: ${id}`);
    }
}

// ─── Sincronização com o ESP32 (Fase 2) ───────────────────────────────────────

/**
 * Recebe o array de alarmes do ESP32 e sincroniza com o banco local.
 * O ESP32 é a fonte da verdade para o que está ativo no momento.
 */
export function syncAlarmsFromDevice(deviceAlarms: any[]) {
    if (!Array.isArray(deviceAlarms)) return;

    // Levanta os alarmes que vieram ativos do dispositivo
    for (const da of deviceAlarms) {
        if (da.active) {
            // No ESP32, "code" pode incluir o equipamento, ex: "AQ01_TEMP_H"
            // Vamos separar por heurística ou usar como tipo.
            // Para manter compatibilidade com raiseAlarm(equip, type, desc):
            const parts = da.code.split('_');
            const equip = parts[0]; // AQ01
            const type = parts.slice(1).join('_'); // TEMP_H
            raiseAlarm(equip, type, da.description || 'Alarme', da.severity === 'C' ? 'Danger' : (da.severity === 'H' ? 'Warning' : 'Info'));
        }
    }

    // Agora precisamos descobrir quais alarmes locais devemos normalizar.
    // Pegamos todos os ativos localmente:
    const activeLocal = getActiveAlarms();
    for (const local of activeLocal) {
        if (local.cleared) continue; // Já normalizado, só aguardando ACK

        // Se o alarme local não vier na lista do ESP32 (ou vier como active: false),
        // significa que o problema acabou.
        const code = `${local.equipment}_${local.type}`;
        const match = deviceAlarms.find(da => da.code === code);
        
        if (!match || !match.active) {
            clearAlarm(local.equipment, local.type);
        }
    }
}
