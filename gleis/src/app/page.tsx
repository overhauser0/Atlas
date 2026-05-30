'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Columns2,
  Settings,
  Lock,
  Menu,
  RefreshCw,
  Bell,
  Kanban,
  CalendarDays,
  ClipboardPenLine,
} from 'lucide-react';
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
import QuickAlarmModal from '@/components/QuickAlarmModal';
import TaskModal from '@/components/TaskModal';
import StatsModal from '@/components/StatsModal';
import CommandPalette from '@/components/CommandPalette';
import NotificationHandler from '@/components/NotificationHandler';
import NotificationsView from '@/components/NotificationsView';
import { Task, ViewType } from '@/types';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuickAlarmOpen, setIsQuickAlarmOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({
    shrinkEmptyPastDays: true,
    syncInterval: 5,
    notificationInterval: 30,
    alarmTime: '',
    wakeLockEnabled: true,
  });
  const [hasUnread, setHasUnread] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [taskModalConfig, setTaskModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    task: Task | null;
  }>({ isOpen: false, mode: 'create', task: null });

  const openCreateTaskModal = useCallback(() => {
    setTaskModalConfig({ isOpen: true, mode: 'create', task: null });
  }, []);

  const openEditTaskModal = useCallback((task: Task) => {
    setTaskModalConfig({ isOpen: true, mode: 'edit', task });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsTargetDate, setStatsTargetDate] = useState<Date>(new Date());

  // ---------------- 認証チェック ----------------
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // ----------------  アプリ設定 ----------------
  useEffect(() => {
    const saved = localStorage.getItem('gleis_settings');
    if (saved) setAppSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('gleis_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // ---------------- タスクの管理 ----------------
  const fetchTasks = useCallback(
    async (isSilent = false) => {
      if (!isAuthenticated) return;

      // すでにデータがある状態での更新（サイレント更新）なら Loading を出さない
      if (!isSilent) setIsTasksLoading(true);

      // 表示タスク
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

        // 完了タスクの集計
        const completedTasks = data.pieces.filter(
          (task: Task) => task.status === 'Done',
        );
        setCompletedTasks(completedTasks);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsTasksLoading(false);
      }
    },
    [isAuthenticated],
  );

  // 初回表示時に実行
  useEffect(() => {
    const isFirstTime = tasks.length === 0;
    fetchTasks(!isFirstTime);
  }, [fetchTasks, tasks.length]);

  // ---------------- データの更新 ----------------
  // 更新処理
  const handleSync = useCallback(
    async (force = false) => {
      setIsSyncing(true);
      try {
        // 1. 強制同期でない場合、最後の同期から一定時間経過しているかチェック
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

        // 2. タスクを再取得
        await fetchTasks(true);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchTasks, appSettings.syncInterval],
  );

  const handleTaskUpdate = useCallback(() => {
    fetchTasks(true);
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
      handleSync(false);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [isAuthenticated, appSettings.syncInterval, handleSync]);

  // ---------------- 時計の更新 ----------------
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------- iOS キーボード強制回避ロジック ----------------
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT' &&
        !target.isContentEditable
      ) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    // 画面全体でタッチ開始を監視
    // capture: true にすることで、他の要素のクリックイベントよりも先に実行させます
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true,
      });
    };
  }, []);

  // ---------------- StatsModal の開閉 ----------------
  const handleOpenStats = (date: Date) => {
    setStatsTargetDate(date);
    setIsStatsOpen(true);
  };

  // ---------------- ReviewView の初期表示月を今月にする ----------------
  const yyyymm = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // ---------------- ショートカットキーの監視 ----------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. 入力中は無効化
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT' ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      // 2. Ctrl または Cmd (Mac) の同時押し判定
      const isModifierPressed = e.metaKey || e.ctrlKey;

      // Cmd+K / Ctrl+K (CommandPalette)
      if (isModifierPressed && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Cmd+S / Ctrl+S (Sync)
      if (isModifierPressed && e.key === 's') {
        e.preventDefault();
        handleSync(true);
        return;
      }

      // Cmd+L / Ctrl+L (Lock)
      if (isModifierPressed && e.key === 'l') {
        e.preventDefault();
        localStorage.removeItem('atlas_auth');
        setIsAuthenticated(false);
        return;
      }

      // Cmd+T / Ctrl+T (new Task)
      if (isModifierPressed && e.key === 't') {
        e.preventDefault();
        openCreateTaskModal();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSync]);

  // ---------------- 数字キーによるビュー切り替え (1-6) ----------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力中は無効化
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT' ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const keyMap: { [key: string]: ViewType } = {
        '0': 'home',
        '1': 'weekly',
        '2': 'kanban',
        '3': 'calendar',
        '4': 'review',
        '5': 'notifications',
      };

      if (keyMap[e.key]) {
        setCurrentView(keyMap[e.key]);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---------------- 描画 ----------------
  if (isAuthChecking) return <div className="h-screen bg-black" />;
  if (!isAuthenticated)
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden text-gray-200 relative bg-black">
        <WakeLockHandler isEnabled={appSettings.wakeLockEnabled ?? true} />
        <AlarmHandler
          appSettings={appSettings}
          setAppSettings={setAppSettings}
        />
        <NotificationHandler
          appSettings={appSettings}
          onUnreadChange={setHasUnread}
          onTaskUpdate={handleTaskUpdate}
        />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsMobileMenuOpen(false); // モバイルの場合メニューも閉じる
          }}
          onSync={() => handleSync(true)}
          onNewTask={openCreateTaskModal}
          tasks={tasks}
          onTaskClick={openEditTaskModal}
          onQuickAlarmOpen={() => setIsQuickAlarmOpen(true)}
          onLock={() => {
            localStorage.removeItem('atlas_auth');
            setIsAuthenticated(false);
          }}
        />
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
            <button
              onClick={() => {
                setCurrentView('home');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'home' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Home
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('weekly');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'weekly' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Columns2 className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                WeeklyTask
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('kanban');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'kanban' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Kanban className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Kanban
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('calendar');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'calendar' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <CalendarDays className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Calendar
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('review');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'review' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <ClipboardPenLine className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Review
              </span>
            </button>
            <button
              onClick={() => {
                setCurrentView('notifications');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === 'notifications' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
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
              onClick={() => handleSync(true)}
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
              onClick={() => {
                localStorage.removeItem('atlas_auth');
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
                {currentView.toUpperCase()}
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
          {currentView === 'home' && (
            <HomeView
              tasks={tasks}
              completedTasks={completedTasks}
              onOpenTaskModal={openCreateTaskModal}
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
              onOpenTaskModal={openCreateTaskModal}
              onTaskClick={openEditTaskModal}
              onOpenStats={(date: Date) => handleOpenStats(date)}
            />
          )}
          {currentView === 'kanban' && (
            <KanbanView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onOpenTaskModal={openCreateTaskModal}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onOpenTaskModal={openCreateTaskModal}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'review' && (
            <ReviewView initialYearMonth={yyyymm()} />
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
            onClose={closeTaskModal}
            onSuccess={() => fetchTasks(true)}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
