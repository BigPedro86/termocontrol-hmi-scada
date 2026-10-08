import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Users, UserPlus, Trash2, ShieldCheck, Loader2,
  AlertCircle, CheckCircle2, Key, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';

interface RemoteUser {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

const ROLE_LABELS: Record<string, string> = {
  Operator: 'Operador',
  Supervisor: 'Supervisor',
  Maintenance: 'Manutenção',
  Admin: 'Admin',
};

const UserManagement: React.FC = () => {
  const { currentUser, settings } = useApp();
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('Operator');
  const [creating, setCreating] = useState(false);

  const httpBase = settings.endpoint
    .replace(/^ws:\/\//, 'http://')
    .replace(/^wss:\/\//, 'https://')
    .replace(/\/+$/, '');

  const authHeaders = { Authorization: `Bearer ${currentUser?.token ?? ''}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get<RemoteUser[]>(`${httpBase}/users`, { headers: authHeaders });
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpBase, currentUser?.token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || !newRole) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await axios.post(`${httpBase}/users`, {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      }, { headers: authHeaders });
      setSuccess(`Usuário '${newUsername.trim()}' criado com sucesso.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('Operator');
      fetchUsers();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao criar usuário.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (username: string) => {
    if (username === currentUser?.name) {
      setError('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (!window.confirm(`Excluir o usuário '${username}'? Esta ação não pode ser desfeita.`)) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${httpBase}/users/${username}`, { headers: authHeaders });
      setSuccess(`Usuário '${username}' excluído.`);
      fetchUsers();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao excluir usuário.');
    }
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-tc-text-muted gap-3 fade-in">
        <ShieldCheck className="w-12 h-12" />
        <p className="title-page m-0">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div>
        <h1 className="title-page m-0 text-tc-text uppercase">Gerenciamento de Usuários</h1>
        <p className="body text-tc-text-muted mt-1">Crie, liste e remova contas de acesso ao sistema.</p>
      </div>

      {error && (
        <div className="p-4 bg-tc-alarm-crit-fill border border-tc-alarm-crit rounded flex items-center gap-3 text-white font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-tc-equip-on border border-tc-border rounded flex items-center gap-3 text-tc-bg font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      <Card title="NOVO USUÁRIO" icon={<UserPlus className="w-5 h-5 text-tc-text-muted" />}>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="label text-tc-text-muted">LOGIN</label>
            <input
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="ex: joao_silva"
              disabled={creating}
              className="w-full bg-tc-surface-2 border border-tc-border rounded px-4 py-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
            />
          </div>

          <div className="space-y-1">
            <label className="label text-tc-text-muted">SENHA</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tc-text-muted" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={creating}
                className="w-full bg-tc-surface-2 border border-tc-border rounded pl-9 pr-4 py-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label text-tc-text-muted">PERFIL</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              disabled={creating}
              className="w-full bg-tc-surface-2 border border-tc-border rounded px-4 py-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={creating || !newUsername.trim() || !newPassword}
            className="flex items-center justify-center gap-2 bg-tc-action-fill text-white font-bold py-3 px-6 rounded cursor-pointer border-0 hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            CRIAR
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-tc-text-muted" />
            <h2 className="title-card m-0 uppercase tracking-tight">USUÁRIOS CADASTRADOS</h2>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-1 border-0 bg-transparent text-tc-text-muted cursor-pointer hover:text-tc-text transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <DataTable
          data={users}
          keyExtractor={(u) => u.username}
          columns={[
            {
              header: 'LOGIN',
              accessor: (u) => <span className="font-bold text-tc-text">{u.username}</span>
            },
            {
              header: 'PERFIL',
              accessor: (u) => <span className="label bg-tc-surface-2 px-2 py-1 rounded border border-tc-border">{ROLE_LABELS[u.role] || u.role}</span>
            },
            {
              header: 'CRIADO EM',
              accessor: (u) => <span className="body">{new Date(u.createdAt).toLocaleString('pt-BR')}</span>
            },
            {
              header: 'ÚLTIMO ACESSO',
              accessor: (u) => <span className="body">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : '-'}</span>
            },
            {
              header: '',
              accessor: (u) => (
                <button
                  onClick={() => handleDelete(u.username)}
                  disabled={u.username === currentUser?.name}
                  className="p-2 border-0 bg-transparent text-tc-alarm-crit cursor-pointer hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ),
              width: '50px'
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default UserManagement;
