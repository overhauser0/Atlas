'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Columns2,
  Settings,
  Lock,
  RefreshCw,
  Bell,
  Kanban,
  CalendarDays,
  ClipboardPenLine,
} from 'lucide-react';

// --- Components ---
import AuthView from '@/components/AuthView';
import HomeView from '@/components/HomeView';
import WeeklyView from '@/components/WeeklyView';
import KanbanView from '@/components/KanbanView';
import CalendarView from '@/components/CalendarView';
import ReviewView from '@/components/ReviewView';
import SettingsView from '@/components/SettingsView';
import WakeLockHandler from '@/components/WakeLockHandler';
import { ToastProvider } from '@/components/Toast';
import AlarmHandler from '@/components/AlarmHandler';
import HeaderView from '@/components/HeaderView';
import TaskModal from '@/components/TaskModal';
import StatsModal from '@/components/StatsModal';
import QuickAlarmModal from '@/components/QuickAlarmModal';
import VoiceCaptureModal from '@/components/VoiceCaptureModal';
import ActionPanel from '@/components/ActionPanel';
import CommandPalette from '@/components/CommandPalette';
import NotificationHandler from '@/components/NotificationHandler';
import NotificationsView from '@/components/NotificationsView';
import { Task, ViewType } from '@/types';

export default function Home() {
  // ============================================================================
  // 1. States (状態管理)
  // ============================================================================

  // Auth & Settings (認証・設定)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appSettings, setAppSettings] = useState({
    shrinkEmptyPastDays: true,
    syncInterval: 5,
    notificationInterval: 30,
    alarmTime: '',
    wakeLockEnabled: true,
  });

  // Global UI & View (画面・メニュー状態)
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  // Data (タスク・通知データ)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Modals & Panels (各種ポップアップの開閉状態)
  const [isQuickAlarmOpen, setIsQuickAlarmOpen] = useState(false);
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const [isVoiceCaptureOpen, setIsVoiceCaptureOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsTargetDate, setStatsTargetDate] = useState<Date>(new Date());
  const [taskModalConfig, setTaskModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    task: Task | null;
    initialTitle?: string;
  }>({ isOpen: false, mode: 'create', task: null });

  // ============================================================================
  // 2. Data Fetching & Sync (データ通信関連)
  // ============================================================================

  const fetchTasks = useCallback(
    async (isSilent = false) => {
      if (!isAuthenticated) return;
      if (!isSilent) setIsTasksLoading(true);

      const statuses = ['INBOX', 'Waiting', 'Going'];

      try {
        const res = await fetch(
          '/api/v1/pieces?area=Work&excludeStatus=Canceled',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
            },
          },
        );

        if (!res.ok) {
          console.warn(`Failed to fetch tasks: ${res.statusText}`);
          return;
        }

        const data = await res.json();

        setTasks(
          data.pieces.filter((task: Task) => {
            if (task.source === 'LOCAL') return task.status != 'Done';
            return task.area === 'Work' && statuses.includes(task.status || '');
          }),
        );

        const completed = data.pieces.filter(
          (task: Task) => task.status === 'Done',
        );
        setCompletedTasks(completed);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsTasksLoading(false);
      }
    },
    [isAuthenticated],
  );

  const handleNotionSync = useCallback(
    async (force = false) => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/v1/pieces/sync', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
          },
        });

        if (!res.ok)
          throw new Error(`Failed to check sync status: ${res.statusText}`);

        const syncInfo = await res.json();
        const lastSyncTime = new Date(syncInfo.lastSyncTime).getTime();
        const now = new Date().getTime();
        const intervalMs = appSettings.syncInterval * 60 * 1000;

        if (force || now - lastSyncTime >= intervalMs) {
          await fetch('/api/v1/pieces/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
            },
          });
        } else {
          console.log('Auto sync skipped (already synced by another device)');
        }

        await fetchTasks(true);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchTasks, appSettings.syncInterval],
  );

  // ============================================================================
  // 3. Handlers (イベント・UI操作関連)
  // ============================================================================

  // View Navigation
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('atlas_auth');
    setIsAuthenticated(false);
  };

  // Task Modals
  const openCreateTaskModal = useCallback((initialTitle?: string) => {
    setTaskModalConfig({
      isOpen: true,
      mode: 'create',
      task: null,
      initialTitle: initialTitle,
    });
  }, []);

  const openEditTaskModal = useCallback((task: Task) => {
    setTaskModalConfig({ isOpen: true, mode: 'edit', task });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Stats
  const handleOpenStats = (date: Date) => {
    setStatsTargetDate(date);
    setIsStatsOpen(true);
  };

  // Notifications
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '' },
      });
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  // ============================================================================
  // 4. Helpers (計算・フォーマット)
  // ============================================================================

  const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ============================================================================
  // 5. Effects (ライフサイクル・イベント監視)
  // ============================================================================

  // Auth Init
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // Settings Load & Save
  useEffect(() => {
    const saved = localStorage.getItem('gleis_settings');
    if (saved) setAppSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('gleis_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // Initial Data Fetch
  useEffect(() => {
    const isFirstTime = tasks.length === 0;
    fetchTasks(!isFirstTime);
  }, [fetchTasks, tasks.length]);

  // Timers (Clock & Auto Sync)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || appSettings.syncInterval <= 0) return;
    const interval = setInterval(
      () => handleNotionSync(false),
      appSettings.syncInterval * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [isAuthenticated, appSettings.syncInterval, handleNotionSync]);

  // iOS Keyboard Fix
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT' &&
        !target.isContentEditable
      ) {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      }
    };
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
      capture: true,
    });
    return () =>
      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true,
      });
  }, []);

  // Keyboard Shortcuts (Cmd/Ctrl)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const isInput =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.isContentEditable;
      if (isInput) return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      switch (e.key) {
        case 'k':
          e.preventDefault();
          setIsCommandPaletteOpen((p) => !p);
          break;
        case 's':
          e.preventDefault();
          handleNotionSync(true);
          break;
        case 'l':
          e.preventDefault();
          handleLogout();
          break;
        case 't':
          e.preventDefault();
          openCreateTaskModal();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNotionSync, openCreateTaskModal]);

  // Keyboard Shortcuts (Numbers for Views)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const isInput =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.isContentEditable;
      if (isInput || e.ctrlKey || e.altKey || e.metaKey) return;

      const keyMap: Record<string, ViewType> = {
        '0': 'home',
        '1': 'weekly',
        '2': 'kanban',
        '3': 'calendar',
        '4': 'review',
        '5': 'notifications',
      };

      if (keyMap[e.key]) handleViewChange(keyMap[e.key]);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================================================
  // 6. Render (UI描画)
  // ============================================================================

  if (isAuthChecking) return <div className="h-screen bg-black" />;
  if (!isAuthenticated)
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden text-gray-200 relative bg-black">
        {/* --- Background Handlers & Global Modals --- */}
        <WakeLockHandler
          isEnabled={appSettings.wakeLockEnabled ?? true}
          onStatusChange={setIsWakeLockActive}
        />
        <AlarmHandler
          appSettings={appSettings}
          setAppSettings={setAppSettings}
        />
        <NotificationHandler
          appSettings={appSettings}
          onUpdateNotifications={setNotifications}
          onTaskUpdate={fetchTasks}
        />

        <VoiceCaptureModal
          isOpen={isVoiceCaptureOpen}
          onClose={() => setIsVoiceCaptureOpen(false)}
          onCapture={(text) => openCreateTaskModal(text)}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={handleViewChange}
          onSync={() => handleNotionSync(true)}
          onNewTask={() => openCreateTaskModal()}
          tasks={tasks}
          onTaskClick={openEditTaskModal}
          onQuickAlarmOpen={() => setIsQuickAlarmOpen(true)}
          onLock={handleLogout}
        />

        {/* --- Sidebar Navigation --- */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} sm:relative sm:translate-x-0 group w-64 sm:w-18 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-hidden`}
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
            {[
              { id: 'home', icon: LayoutDashboard, label: 'Home' },
              { id: 'weekly', icon: Columns2, label: 'WeeklyTask' },
              { id: 'kanban', icon: Kanban, label: 'Kanban' },
              { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
              { id: 'review', icon: ClipboardPenLine, label: 'Review' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id as ViewType)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
            <button
              onClick={() => handleNotionSync(true)}
              disabled={isSyncing}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-neon"
            >
              <RefreshCw
                className={`w-5 h-5 shrink-0 ${isSyncing ? 'animate-spin text-neon' : ''}`}
              />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                SyncNotion
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400"
            >
              <Lock className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Lock
              </span>
            </button>
          </div>
        </aside>

        {/* --- Main Content Area --- */}
        <main className="flex-1 flex flex-col m-2 md:m-4 md:ml-0 min-w-0">
          <HeaderView
            currentTime={currentTime}
            hasUnread={unreadCount > 0}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isQuickAlarmOpen={isQuickAlarmOpen}
            setIsQuickAlarmOpen={setIsQuickAlarmOpen}
            setIsActionPanelOpen={setIsActionPanelOpen}
            appSettings={appSettings}
          />

          {currentView === 'home' && (
            <HomeView
              tasks={tasks}
              completedTasks={completedTasks}
              onOpenTaskModal={() => openCreateTaskModal()}
              onTaskClick={openEditTaskModal}
              onOpenStats={() => handleOpenStats(new Date())}
            />
          )}
          {currentView === 'weekly' && (
            <WeeklyView
              appSettings={appSettings}
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onCreateTask={() => openCreateTaskModal()}
              onTaskClick={openEditTaskModal}
              onOpenStats={handleOpenStats}
            />
          )}
          {currentView === 'kanban' && (
            <KanbanView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onOpenTaskModal={() => openCreateTaskModal()}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onOpenTaskModal={() => openCreateTaskModal()}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'review' && (
            <ReviewView initialYearMonth={getCurrentYearMonth()} />
          )}
          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onCreateTask={(text) => openCreateTaskModal(text)}
            />
          )}
          {currentView === 'settings' && (
            <SettingsView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
            />
          )}

          {/* --- Contextual Modals --- */}
          <QuickAlarmModal
            isOpen={isQuickAlarmOpen}
            onClose={() => setIsQuickAlarmOpen(false)}
            appSettings={appSettings}
            setAppSettings={setAppSettings}
          />
          <StatsModal
            isOpen={isStatsOpen}
            completedTasks={completedTasks}
            targetDate={statsTargetDate}
            onTaskClick={openEditTaskModal}
            onClose={() => setIsStatsOpen(false)}
          />
          <TaskModal
            isOpen={taskModalConfig.isOpen}
            mode={taskModalConfig.mode}
            task={taskModalConfig.task}
            initialTitle={taskModalConfig.initialTitle}
            onClose={closeTaskModal}
            onSuccess={() => fetchTasks(true)}
          />
          <ActionPanel
            isOpen={isActionPanelOpen}
            onClose={() => setIsActionPanelOpen(false)}
            isWakeLockActive={isWakeLockActive}
            onNavigateToNotifications={() => handleViewChange('notifications')}
            notifications={notifications}
            onOpenVoiceCapture={() => setIsVoiceCaptureOpen(true)}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
