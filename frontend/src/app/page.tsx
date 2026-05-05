"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Lock,
  Menu,
  X,
  RefreshCw,
  Bell,
} from "lucide-react";
import AuthView from "@/components/AuthView";
import DashboardView from "@/components/DashboardView";
import SettingsView from "@/components/SettingsView";
import WakeLockHandler from "@/components/WakeLockHandler";
import { ToastProvider } from "@/components/Toast";
import AlarmHandler from "@/components/AlarmHandler";
import QuickAlarmModal from "@/components/QuickAlarmModal";
import NotificationHandler from "@/components/NotificationHandler";
import { ViewType } from "@/types";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({ shrinkEmptyPastDays: true });
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuickAlarmOpen, setIsQuickAlarmOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gleis_auth") === "true") setIsAuthenticated(true);
    setIsAuthChecking(false);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/sync/notion", { method: "POST" });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

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
        <AlarmHandler />
        <NotificationHandler />
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-[120%]"} sm:relative sm:translate-x-0 group w-64 sm:w-20 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-hidden`}
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
                setCurrentView("dashboard");
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === "dashboard" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Dashboard
              </span>
            </button>
            <button className="flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-white">
              <Bell className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Notifications
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView("settings");
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === "settings" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
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
                className={`w-5 h-5 shrink-0 ${isSyncing ? "animate-spin text-neon" : ""}`}
              />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                SyncNotion
              </span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("gleis_auth");
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
                {currentView === "dashboard" ? "Weekly" : "Settings"}
              </h1>
            </div>

            {/* 💡 時計部分を修正 */}
            <div className="relative">
              <button
                onClick={() => setIsQuickAlarmOpen(!isQuickAlarmOpen)}
                className="group flex flex-col items-end transition-all active:scale-95"
              >
                <div className="text-lg text-white font-bold font-mono tracking-widest group-hover:text-neon transition-colors">
                  {currentTime?.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) || "--:--"}
                </div>
                {/* 
                  アラームがセットされている場合のみ、
                  小さなドット（bg-red-500）を時計の下に出すと「状態」がわかって便利です
                */}
                <div className="h-1 mt-0.5">
                  {typeof window !== "undefined" &&
                    localStorage.getItem("gleis_alarm_time") && (
                      <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                    )}
                </div>
              </button>

              {/* クイックアラームモーダル */}
              <QuickAlarmModal
                isOpen={isQuickAlarmOpen}
                onClose={() => setIsQuickAlarmOpen(false)}
              />
            </div>
          </header>
          {currentView === "dashboard" ? (
            <DashboardView
              appSettings={appSettings}
              isAuthenticated={isAuthenticated}
            />
          ) : (
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
