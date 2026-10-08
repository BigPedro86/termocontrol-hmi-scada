import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Flame, ShieldCheck, User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';

const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Preencha o usuário e a senha.');
      return;
    }

    setLoading(true);
    const errMsg = await login(username.trim(), password);
    setLoading(false);

    if (errMsg) {
      setError(errMsg);
      setPassword('');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tc-bg px-4 fade-in">
      <div className="w-full max-w-md bg-tc-surface rounded-2xl p-10 shadow-2xl relative overflow-hidden border border-tc-border">
        
        <div className="relative z-10 flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-tc-action-fill rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <Flame className="text-white w-10 h-10" />
          </div>
          <h1 className="title-page m-0 text-tc-text">TermoControl HMI</h1>
          <p className="label text-tc-text-muted mt-2">Sistema de Supervisão Industrial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {error && (
            <div className="p-4 bg-tc-alarm-crit-fill border border-tc-alarm-crit rounded flex items-center gap-3 text-white font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="login-username" className="label text-tc-text-muted ml-1 block">Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tc-text-muted pointer-events-none" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ex: joao_silva"
                autoComplete="username"
                disabled={loading}
                className="w-full bg-tc-surface-2 border border-tc-border rounded py-4 pl-12 pr-4 text-tc-text font-bold focus:border-tc-action outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="label text-tc-text-muted ml-1 block">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tc-text-muted pointer-events-none" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-tc-surface-2 border border-tc-border rounded py-4 pl-12 pr-4 text-tc-text font-bold focus:border-tc-action outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-tc-action-fill text-white font-bold py-4 rounded cursor-pointer border-0 hover:opacity-90 flex items-center justify-center gap-3 disabled:opacity-50 transition-all mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando…
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                ENTRAR NO SISTEMA
              </>
            )}
          </button>
        </form>

        <div className="mt-8 p-3 bg-tc-surface-2 rounded border border-tc-border">
          <p className="text-center label text-tc-text-muted m-0">
            🔒 Acesso autenticado — perfil definido pelo administrador
          </p>
        </div>

        <p className="mt-4 text-center text-tc-text-dim label m-0">
          © {new Date().getFullYear()} Industrial Automation Labs
        </p>
      </div>
    </div>
  );
};

export default Login;
