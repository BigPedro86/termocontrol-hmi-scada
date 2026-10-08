import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import crypto from 'crypto';

export type UserRole = 'Operator' | 'Supervisor' | 'Maintenance' | 'Admin';

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt: string;
    lastLogin?: string;
}

export interface TokenPayload {
    sub: string;
    username: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_CHANGE_IN_PRODUCTION';
const JWT_EXPIRES_IN = '8h';

const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export function seedAdminIfNeeded() {
    // Migration from users.json
    if (fs.existsSync(USERS_FILE)) {
        try {
            const oldUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) as User[];
            const stmt = db.prepare('INSERT OR IGNORE INTO users (id, username, passwordHash, role, createdAt, lastLogin) VALUES (?, ?, ?, ?, ?, ?)');
            db.transaction(() => {
                for (const u of oldUsers) {
                    stmt.run(u.id, u.username, u.passwordHash, u.role, u.createdAt, u.lastLogin || null);
                }
            })();
            fs.renameSync(USERS_FILE, USERS_FILE + '.bak');
            console.log('[Auth] Migracao de users.json para SQLite concluida.');
        } catch (e) {
            console.error('[Auth] Erro na migracao de users.json:', e);
        }
    }

    const adminUsername = process.env.ADMIN_USER || 'admin';
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

    if (existing) {
        console.log(`[Auth] Usuario admin '${adminUsername}' ja existe.`);
        return;
    }

    const passHash = process.env.ADMIN_PASS_HASH;
    if (!passHash) {
        console.warn('[Auth] ADMIN_PASS_HASH nao definido no .env. Admin NAO sera criado.');
        return;
    }

    db.prepare('INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)').run(
        crypto.randomUUID(),
        adminUsername,
        passHash,
        'Admin',
        new Date().toISOString()
    );
    console.log(`[Auth] Usuario admin '${adminUsername}' inserido com sucesso.`);
}

export function getAllUsers(): User[] {
    return db.prepare('SELECT id, username, role, createdAt, lastLogin FROM users').all() as User[];
}

export function listUsers() {
    return getAllUsers().map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin }));
}

export function getUserById(id: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function createUser(username: string, plain: string, role: UserRole): User {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(plain);
    
    db.prepare('INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)').run(
        id, username, passwordHash, role, createdAt
    );
    
    return { id, username, passwordHash, role, createdAt };
}

export function updateUser(id: string, updates: Partial<User>): User | null {
    const user = getUserById(id);
    if (!user) return null;

    if (updates.passwordHash) user.passwordHash = updates.passwordHash;
    if (updates.role) user.role = updates.role;
    
    db.prepare('UPDATE users SET passwordHash = ?, role = ? WHERE id = ?').run(
        user.passwordHash, user.role, id
    );
    return user;
}

export function deleteUser(username: string): boolean {
    const info = db.prepare('DELETE FROM users WHERE username = ?').run(username);
    return info.changes > 0;
}

export function updateLastLogin(id: string) {
    db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function verifyPassword(plain: string, hash: string): boolean {
    return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
    return bcrypt.hashSync(plain, 10);
}

export function authenticate(username: string, plain: string): string | null {
    const user = getUserByUsername(username);
    if (!user || !verifyPassword(plain, user.passwordHash)) return null;
    return generateToken(user);
}

export function generateToken(user: User): string {
    const payload: TokenPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}
