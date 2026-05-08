'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
}

// 💡 簡易パスワードの設定
const CORRECT_PASSWORD = 'yyyuyy';

export default function AuthView({ onLogin }: AuthViewProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === CORRECT_PASSWORD) {
      localStorage.setItem('gleis_auth', 'true');
      setLoginError(false);
      onLogin(); // 親（page.tsx）のステートを更新
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white relative overflow-hidden">
      {/* 背景の装飾的なネオングロウ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon rounded-full blur-[150px] opacity-20 pointer-events-none" />

      <div className="noir-glass p-8 rounded-3xl border border-white/10 w-full max-w-sm flex flex-col items-center z-10 relative">
        {/* ロゴデザイン */}
        <div className="w-16 h-16 bg-[#0070f3] rounded-2xl flex items-center justify-center text-white font-bold text-4xl mb-6 shadow-[0_0_30px_rgba(0,112,243,0.6)]">
          G
        </div>

        <h1 className="text-2xl font-bold tracking-widest mb-2">Gleis</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">
          Personal WorkOS
        </p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className={`w-full bg-black/50 border rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none transition-colors ${
                loginError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-white/10 focus:border-neon'
              }`}
              autoFocus
            />
          </div>

          {loginError && (
            <p className="text-xs text-red-500 text-center">
              Incorrect password.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
