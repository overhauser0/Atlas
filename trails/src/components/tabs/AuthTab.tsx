'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

interface AuthTabProps {
  onLogin: () => void;
}

export default function AuthTab({ onLogin }: AuthTabProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (response.ok) {
        setLoginError(false);
        setIsUnlocking(true);

        setTimeout(() => {
          onLogin();
        }, 800);
      } else {
        setLoginError(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 px-4">
      <div className="trails-card relative z-10 w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 h-28 w-28 shrink-0 overflow-hidden rounded-3xl shadow-sm">
            <img
              src="/icon.png"
              alt="Trails Icon"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Trails
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            パスワードを入力してロックを解除
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              disabled={isUnlocking}
              className={`trails-input py-3 pl-10 pr-4 ${
                loginError
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }`}
              autoFocus
            />
          </div>
          {loginError && (
            <p className="text-center text-xs font-medium text-red-500">
              Incorrect password.
            </p>
          )}

          <button
            type="submit"
            disabled={isUnlocking}
            className="trails-btn-primary w-full py-3"
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock Trails'}
          </button>
        </form>
      </div>
    </div>
  );
}
