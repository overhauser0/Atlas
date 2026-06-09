'use client';

import { useState } from 'react';
import { Lock, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
  currentTime: Date | null;
}

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_ATLAS_PASSWORD;

export default function AuthView({ onLogin, currentTime }: AuthViewProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [isUnlocking, setIsUnlocking] = useState(false);

  const isEnvMissing = !CORRECT_PASSWORD;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEnvMissing) return;

    if (passwordInput === CORRECT_PASSWORD) {
      setLoginError(false);
      setIsUnlocking(true);

      setTimeout(() => {
        localStorage.setItem('atlas_auth', 'true');
        onLogin();
      }, 700);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning,';
    if (hour >= 12 && hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  return (
    <div className="h-screen w-full bg-black text-white relative overflow-hidden">
      <div
        className={`flex h-full w-full relative transition-all duration-700 ease-in-out ${
          isUnlocking
            ? 'opacity-0 scale-110 blur-xl'
            : 'opacity-100 scale-100 blur-0'
        }`}
      >
        {/* 背景の装飾的なネオングロウ */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-neon rounded-full blur-[200px] pointer-events-none transition-opacity duration-700 ${
            isUnlocking ? 'opacity-40' : 'opacity-10'
          }`}
        />

        {/* 左側：時計 ＆ ウィジェット（PCのみ表示） */}
        <div className="hidden md:flex w-1/2 flex-col justify-center pl-16 lg:pl-32 z-10 relative">
          {currentTime && (
            <div className="animate-in fade-in duration-1000 slide-in-from-left-8">
              <p className="text-neon tracking-[0.3em] uppercase text-sm font-bold mb-6 drop-shadow-[0_0_10px_rgba(0,112,243,0.5)]">
                {getGreeting(currentTime)}
              </p>
              <h2 className="text-8xl lg:text-[10rem] font-light tracking-tighter leading-none mb-4 text-white/90">
                {currentTime.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </h2>
              <div className="flex items-center gap-4 text-xl text-gray-400 font-medium tracking-widest mb-12">
                <p>
                  {currentTime.toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 右側：ログインモーダル */}
        <div className="w-full md:w-1/2 flex items-center justify-center z-10 relative px-4">
          <div
            className={`noir-glass p-8 rounded-3xl border border-white/10 w-full max-w-sm flex flex-col items-center transition-all duration-500 ${
              isUnlocking ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            <div className="w-16 h-16 bg-neon rounded-2xl flex items-center justify-center text-white font-bold text-4xl mb-6 shadow-[0_0_30px_rgba(0,112,243,0.6)]">
              G
            </div>

            <h1 className="text-2xl font-bold tracking-widest mb-2">Gleis</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">
              Personal WorkOS
            </p>

            {isEnvMissing ? (
              <div className="w-full bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-500 font-bold text-sm">System Locked</p>
                <p className="text-red-400/80 text-xs">
                  Authentication disabled.
                  <br />
                  Please configure{' '}
                  <code className="bg-black/50 px-1 rounded">
                    NEXT_PUBLIC_ATLAS_PASSWORD
                  </code>
                  .
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleLogin}
                className="w-full flex flex-col gap-4"
              >
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password"
                    disabled={isUnlocking}
                    className={`w-full bg-black/50 border rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none transition-all duration-300 ${
                      loginError
                        ? 'border-red-500 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-white/10 focus:border-neon focus:shadow-[0_0_20px_rgba(0,112,243,0.3)]'
                    }`}
                    autoFocus
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 text-center animate-pulse">
                    Incorrect password.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="w-full bg-neon text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isUnlocking ? 'Unlocking...' : 'Unlock'}{' '}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
