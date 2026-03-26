import React, { useState } from 'react';
import { login } from '../api';
import { Lock, User, Terminal } from 'lucide-react';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      onLogin(data.token);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] font-sans">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-400/10 blur-[120px] rounded-full" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-400 rounded-3xl mx-auto flex items-center justify-center text-black font-black text-3xl shadow-2xl shadow-green-400/40 mb-6">P</div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">PingPongClub CRM</h1>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">Administrative Access Terminal</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3 px-1">Identifier</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-green-400/50 transition-all font-bold"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3 px-1">Passkey</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-green-400/50 transition-all font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center uppercase tracking-widest animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-400 text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-green-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Authorize Login'}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-[9px] text-white/10 font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-2">
           <Terminal size={10} /> Secure Connection Established
        </p>
      </div>
    </div>
  );
};
