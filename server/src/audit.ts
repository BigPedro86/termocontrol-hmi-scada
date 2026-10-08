/**
 * audit.ts — Auditoria de comandos persistida no SQLite
 */

import { db } from './db';

export interface AuditEntry {
    timestamp: string;
    username: string;
    role: string;
    ip: string;
    target: string;
    command: string;
    value: unknown;
    result: string;
}

const insertStmt = db.prepare(`
    INSERT INTO audit_logs (timestamp, username, role, ip, target, command, value, result)
    VALUES (@timestamp, @username, @role, @ip, @target, @command, @value, @result)
`);

export function writeAudit(entry: AuditEntry) {
    try {
        insertStmt.run({
            ...entry,
            value: entry.value !== undefined ? JSON.stringify(entry.value) : null
        });
    } catch (e) {
        console.error('[Audit] Erro ao gravar no banco:', e);
    }
}

const selectStmt = db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT ?
`);

export function readAudit(limit = 200): AuditEntry[] {
    try {
        const rows = selectStmt.all(limit) as any[];
        return rows.map(r => ({
            timestamp: r.timestamp,
            username: r.username,
            role: r.role,
            ip: r.ip,
            target: r.target,
            command: r.command,
            value: r.value ? JSON.parse(r.value) : null,
            result: r.result,
        }));
    } catch (e) {
        console.error('[Audit] Erro ao ler banco:', e);
        return [];
    }
}
