'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
}

// Gleisと同じ環境変数（またはTrails専用のもの）を参照
const CORRECT_PASSWORD =
  process.env.NEXT_PUBLIC_GLEIS_PASSWORD || 'UNSET_PASSWORD_ERROR';

export default function AuthView({ onLogin }: AuthViewProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === CORRECT_PASSWORD) {
      // gleis_auth キーを共有することでWorkOSとLifeOSのログイン状態を同期可能
      localStorage.setItem('gleis_auth', 'true');
      setLoginError(false);
      onLogin();
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 relative overflow-hidden">
      {/* 背景の柔らかいアンバーグロウ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-200 rounded-full blur-[150px] opacity-50 pointer-events-none" />

      <div className="bg-white p-8 rounded-3xl border border-gray-200 w-full max-w-sm flex flex-col items-center z-10 relative shadow-xl">
        {/* ロゴデザイン */}
        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-md">
          T
        </div>

        <h1 className="text-2xl font-bold tracking-widest mb-2 text-gray-900">
          Trails
        </h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-8">
          Personal LifeOS
        </p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className={`w-full bg-gray-50 border rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm focus:outline-none transition-colors ${
                loginError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-amber-500'
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
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
