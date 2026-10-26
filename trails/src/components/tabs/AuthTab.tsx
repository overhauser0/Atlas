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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: passwordInput }),
        },
      );

      if (response.ok) {
        setLoginError(false);
        setIsUnlocking(true);

        setTimeout(() => {
          localStorage.setItem('atlas_auth', 'true');
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
    <div className="flex items-center justify-center min-h-screen bg-white relative overflow-hidden">
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex items-center justify-center">
          <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-sm shrink-0 mb-16">
            <img
              src="/icon.png"
              alt="Trails Icon"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              disabled={isUnlocking}
              className={`w-full bg-gray-200 text-gray-600 hover:bg-gray-300 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition-all duration-300 ${
                loginError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-white/10 focus:border-white'
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
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl transition-all duration-300"
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock Trails'}
          </button>
        </form>
      </div>
    </div>
  );
}
