'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Settings,
  Lock,
  Menu,
  X,
  RefreshCw,
  Bell,
} from 'lucide-react';
import AuthView from '@/components/AuthView';
import DashboardView from '@/components/DashboardView';
import SettingsView from '@/components/SettingsView';
import WakeLockHandler from '@/components/WakeLockHandler';
import { ToastProvider } from '@/components/Toast';
import AlarmHandler from '@/components/AlarmHandler';
import QuickAlarmModal from '@/components/QuickAlarmModal';
import NotificationHandler from '@/components/NotificationHandler';
import NotificationsView from '@/components/NotificationsView';
import { ViewType } from '@/types';

export default function Home() {
  // 認証状態の管理
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isQuickAlarmOpen, setIsQuickAlarmOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({
    shrinkEmptyPastDays: true,
    syncInterval: 5,
    notificationInterval: 30,
    alarmTime: '',
  });
  const [hasUnread, setHasUnread] = useState(false);

  // ---------------- 認証チェック ----------------
  useEffect(() => {
    if (localStorage.getItem('gleis_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // ----------------  アプリ設定 ----------------
  useEffect(() => {
    const saved = localStorage.getItem('gleis_settings');
    if (saved) {
      setAppSettings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gleis_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // ---------------- データの更新 ----------------
  // 更新処理
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/tasks/sync', { method: 'POST' });
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  }, []);
  const handleTaskUpdate = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);
  const handleMarkAsRead = useCallback(() => {
    setHasUnread(false);
  }, []);

  // 自動更新タイマーを設置
  useEffect(() => {
    if (!isAuthenticated || appSettings.syncInterval <= 0) return;

    const intervalTime = appSettings.syncInterval * 60 * 1000;
    const interval = setInterval(() => {
      console.log('Auto syncing...');
      handleSync();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isAuthenticated, appSettings.syncInterval]);

  // ---------------- 時計の更新 ----------------
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------- 描画 ----------------
  if (isAuthChecking) return <div className="h-screen bg-black" />;
  if (!isAuthenticated)
    return (
      <AuthView
        onLogin={() => setIsAuthenticated(true)}
        loginError={loginError}
        setLoginError={setLoginError}
      />
    );

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden text-gray-200 relative bg-black">
        <WakeLockHandler />
        <AlarmHandler
          appSettings={appSettings}
          setAppSettings={setAppSettings}
        />
        <NotificationHandler
          appSettings={appSettings}
          onUnreadChange={setHasUnread}
          onTaskUpdate={handleTaskUpdate}
        />
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} sm:relative sm:translate-x-0 group w-64 sm:w-20 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-hidden`}
        >
          <div className="flex items-center gap-4 mb-8 px-2 mt-2">
            <div className="w-8 h-8 bg-[#0070f3] rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
              G
            </div>
            <div className="text-xl font-bold text-white whitespace-nowrap sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity duration-300">
              Gleis
            </div>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Dashboard
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('notifications');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-white"
            >
              <Bell className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Notifications
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('settings');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Settings
              </span>
            </button>
          </nav>
          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-white"
            >
              <RefreshCw
                className={`w-5 h-5 shrink-0 ${isSyncing ? 'animate-spin text-neon' : ''}`}
              />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                SyncNotion
              </span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('gleis_auth');
                setIsAuthenticated(false);
              }}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400"
            >
              <Lock className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Lock
              </span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col m-2 md:m-4 md:ml-0 min-w-0">
          <header className="h-14 mb-4 flex items-center justify-between px-2 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="sm:hidden p-2 text-gray-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold tracking-wide">
                {currentView}
              </h1>
            </div>
            {/* 未読がある場合のアラートアイコン */}
            {hasUnread && (
              <div className="flex items-center justify-center animate-bounce">
                <Bell className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
              </div>
            )}
            {/* 時計 */}
            <div className="relative">
              <button
                onClick={() => setIsQuickAlarmOpen(!isQuickAlarmOpen)}
                className="group flex flex-col items-end transition-all active:scale-95"
              >
                <div className="text-lg text-white font-bold font-mono tracking-widest group-hover:text-neon transition-colors">
                  {currentTime?.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }) || '--:--'}
                </div>
                {/* アラームがある場合ドットで表示 */}
                <div className="h-1 mt-0.5">
                  {appSettings.alarmTime && (
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}
                </div>
              </button>

              {/* クイックアラームモーダル */}
              <QuickAlarmModal
                isOpen={isQuickAlarmOpen}
                onClose={() => setIsQuickAlarmOpen(false)}
                appSettings={appSettings}
                setAppSettings={setAppSettings}
              />
            </div>
          </header>
          {currentView === 'dashboard' && (
            <DashboardView
              appSettings={appSettings}
              isAuthenticated={isAuthenticated}
              refreshTrigger={refreshKey}
            />
          )}
          {currentView === 'notifications' && (
            <NotificationsView onRead={handleMarkAsRead} />
          )}
          {currentView === 'settings' && (
            <SettingsView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
            />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
