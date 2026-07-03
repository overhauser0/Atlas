'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Columns2,
  Settings,
  Lock,
  Bell,
  Kanban,
  CalendarDays,
  ClipboardPenLine,
  BriefcaseBusiness,
} from 'lucide-react';

// --- Components ---
import AuthView from '@/components/AuthView';
import HomeView from '@/components/HomeView';
import WeeklyView from '@/components/WeeklyView';
import KanbanView from '@/components/KanbanView';
import CalendarView from '@/components/CalendarView';
import MeetingView from '@/components/MeetingView';
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
import NotificationsView from '@/components/NotificationsView';
import { Task, ViewType } from '@/types';
import { getCurrentYearMonth } from '@/utils/dateUtils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIosKeyboardFix } from '@/hooks/useIosKeyboardFix';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useToast } from '@/components/Toast';

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
  const [activeRequests, setActiveRequests] = useState(0);
  const incrementRequest = () => setActiveRequests((prev) => prev + 1);
  const decrementRequest = () =>
    setActiveRequests((prev) => Math.max(0, prev - 1));

  // WebSoket
  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [ownDeviceId, setOwnDeviceId] = useState('');

  // PC（Chrome拡張機能）が1台でも接続されているかどうかのフラグ
  const hasExtension = connectedDevices.some(
    (d) => d.clientType === 'extension',
  );

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
    task: Partial<Task> | null;
  }>({ isOpen: false, mode: 'create', task: null });

  const {
    tasks,
    setTasks,
    completedTasks,
    overdueTasks,
    meetingTasks,
    isTasksLoading,
    lastSyncTime,
    fetchTasks,
    handleNotionSync,
    handleRescheduleOverdue,
    fetchBlocks,
  } = useTaskSync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
    appSettings.syncInterval,
  );

  const { notifications, markAsRead, fetchNotifications } = useNotificationSync(
    isAuthenticated,
    () => fetchTasks(true),
  );

  // fetchTasksの最新版の参照を作る
  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);

  const { addToast } = useToast();

  // ============================================================================
  // 2. Handlers (イベント・UI操作関連)
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
  const openCreateTaskModal = useCallback((task?: Partial<Task>) => {
    setTaskModalConfig({
      isOpen: true,
      mode: 'create',
      task: task || null,
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

  const handleSendToPC = useCallback((url: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'OPEN_URL_ON_PC',
          url: url,
        }),
      );
      addToast('💻 PCにURLを送信しました！');
    } else {
      addToast('⚠️ サーバー（Atlas）との通信が切断されています。');
    }
  }, []);

  // ============================================================================
  // 3. Helpers (計算・フォーマット)
  // ============================================================================

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // OSからデバイス名を自動推測するヘルパー
  const getAutoDeviceName = () => {
    if (typeof navigator === 'undefined') return 'Unknown Web';
    const ua = navigator.userAgent;
    if (
      /iPad/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
      return 'iPad';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/Mac OS/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Android/i.test(ua)) return 'Android';
    return 'Web Browser';
  };

  // ============================================================================
  // 4. Effects (ライフサイクル・イベント監視)
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
  }, [isAuthenticated, appSettings.syncInterval]);

  // 💡 WebSocketの接続と受信用 useEffect
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  useEffect(() => {
    let currentDeviceId = localStorage.getItem('gleis_device_id');
    if (!currentDeviceId) {
      currentDeviceId = crypto.randomUUID();
      localStorage.setItem('gleis_device_id', currentDeviceId);
    }
    setOwnDeviceId(currentDeviceId);
    const deviceName = getAutoDeviceName();

    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      // 既存の接続があれば閉じる（二重接続防止）
      if (wsRef.current) {
        wsRef.current.close();
      }

      setWsStatus('connecting');

      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || 'wss://atlas.overhauser0.synology.me';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🌐 Connected to Atlas WebSocket');
        setWsStatus('connected');

        // 接続時に自身をGleis端末としてサーバーに登録
        ws.send(
          JSON.stringify({
            type: 'REGISTER_DEVICE',
            clientType: 'gleis',
            deviceId: currentDeviceId,
            deviceName: deviceName,
          }),
        );

        // 現在の接続端末リストを要求
        ws.send(JSON.stringify({ type: 'GET_DEVICES' }));

        fetchNotificationsRef.current();

        // ハートビート開始（30秒ごとにPINGを送信してプロキシの切断を防ぐ）
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' })); // サーバー側はこのメッセージを無視するだけでOK
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DEVICE_LIST') {
            setConnectedDevices(data.devices || []);
          } else if (data.type === 'REFRESH_PIECES') {
            fetchTasksRef.current(true);
          } else if (data.type === 'REFRESH_NOTIFICATIONS') {
            fetchNotificationsRef.current();
          }
        } catch (e) {
          console.warn('WS Message Parse Error:', e);
        }
      };

      ws.onclose = () => {
        console.warn(
          '🔌 Disconnected from Atlas WebSocket. Reconnecting in 5s...',
        );
        setWsStatus('disconnected');
        setConnectedDevices([]); // 切断時はリストをクリア
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.warn('WebSocket Error:', error);
        ws.close(); // エラーが起きたら一度閉じて、oncloseの再接続処理に回す
      };
    };

    // 初回接続スタート
    connectWebSocket();

    // クリーンアップ関数（コンポーネントが破棄された時）
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []); // 依存配列は空（初回のみ実行）

  // iOS Keyboard Fix
  useIosKeyboardFix();

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen((p) => !p),
    onSync: () => handleNotionSync(true),
    onLogout: handleLogout,
    onCreateTask: () => openCreateTaskModal(),
    onOpenActionPanel: () => setIsActionPanelOpen((p) => !p),
    onNavigate: (view) => handleViewChange(view),
  });

  // ============================================================================
  // 5. Render (UI描画)
  // ============================================================================

  if (isAuthChecking) return <div className="h-screen bg-black" />;
  if (!isAuthenticated)
    return (
      <AuthView
        currentTime={currentTime}
        onLogin={() => setIsAuthenticated(true)}
      />
    );

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden text-gray-200 relative bg-black">
        <WakeLockHandler
          isEnabled={appSettings.wakeLockEnabled ?? true}
          onStatusChange={setIsWakeLockActive}
        />
        <AlarmHandler
          appSettings={appSettings}
          setAppSettings={setAppSettings}
        />
        <VoiceCaptureModal
          isOpen={isVoiceCaptureOpen}
          onClose={() => setIsVoiceCaptureOpen(false)}
          onCapture={(task) => openCreateTaskModal(task)}
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

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[-120%]'} sm:relative sm:translate-x-0 group w-64 sm:w-18 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-hidden`}
        >
          <div className="flex items-center gap-4 mb-8 px-2 mt-2">
            <div className="w-8 h-8 bg-neon rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
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
              { id: 'meeting', icon: BriefcaseBusiness, label: 'Meeting' },
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
            hasNotifications={unreadCount > 0 || overdueTasks.length > 0}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isQuickAlarmOpen={isQuickAlarmOpen}
            setIsQuickAlarmOpen={setIsQuickAlarmOpen}
            setIsActionPanelOpen={setIsActionPanelOpen}
            appSettings={appSettings}
            isSyncing={activeRequests > 0}
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
              onCreateTask={(task) => openCreateTaskModal(task)}
              onTaskClick={openEditTaskModal}
              onOpenStats={handleOpenStats}
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
            />
          )}
          {currentView === 'kanban' && (
            <KanbanView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onCreateTask={() => openCreateTaskModal()}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              onOpenTaskModal={() => openCreateTaskModal()}
              onCreateTask={(task) => openCreateTaskModal(task)}
              onTaskClick={openEditTaskModal}
            />
          )}
          {currentView === 'meeting' && (
            <MeetingView
              meetingTasks={meetingTasks}
              onTaskClick={openEditTaskModal}
              onCreateMeeting={openCreateTaskModal}
            />
          )}
          {currentView === 'review' && (
            <ReviewView
              initialYearMonth={getCurrentYearMonth()}
              completedTasks={completedTasks}
            />
          )}
          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onCreateTask={(task) => openCreateTaskModal(task)}
            />
          )}
          {currentView === 'settings' && (
            <SettingsView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
              wsStatus={wsStatus}
              connectedDevices={connectedDevices}
              ownDeviceId={ownDeviceId}
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
            onClose={closeTaskModal}
            onSuccess={() => fetchTasks(true)}
            onSyncStart={incrementRequest}
            onSyncEnd={decrementRequest}
            onSendToPC={hasExtension ? handleSendToPC : undefined}
            onNavigate={handleViewChange}
            onShowContent={fetchBlocks}
          />
          <ActionPanel
            isOpen={isActionPanelOpen}
            isWakeLockActive={isWakeLockActive}
            notifications={notifications}
            lastSyncTime={lastSyncTime}
            overdueTasks={overdueTasks}
            onClose={() => setIsActionPanelOpen(false)}
            onNavigateToNotifications={() => handleViewChange('notifications')}
            onOpenVoiceCapture={() => setIsVoiceCaptureOpen(true)}
            onRescheduleOverdue={handleRescheduleOverdue}
            onSyncStart={incrementRequest}
            onSyncEnd={decrementRequest}
            onNotionSync={() => handleNotionSync(true)}
            onMarkAsRead={markAsRead}
            wsStatus={wsStatus}
            connectedDevicesCount={connectedDevices.length}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
