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
  Terminal,
  FileText,
  Bot,
} from 'lucide-react';

// --- Components ---
import AuthView from '@/components/AuthView';
import HomeView from '@/components/HomeView';
import WeeklyView from '@/components/WeeklyView';
import KanbanView from '@/components/KanbanView';
import CalendarView from '@/components/CalendarView';
import MeetingView from '@/components/MeetingView';
import ReviewView from '@/components/ReviewView';
import NoteView from '@/components/NoteView';
import AiAgentView from '@/components/AiAgentView';
import SettingsView from '@/components/SettingsView';
import WakeLockHandler from '@/components/WakeLockHandler';
import { ToastProvider, useToast } from '@/components/Toast';
import AlarmHandler from '@/components/AlarmHandler';
import HeaderView from '@/components/HeaderView';
import TaskModal from '@/components/TaskModal';
import StatsModal from '@/components/StatsModal';
import QuickAlarmModal from '@/components/QuickAlarmModal';
import VoiceCaptureModal from '@/components/VoiceCaptureModal';
import ActionPanel from '@/components/ActionPanel';
import CommandPalette from '@/components/CommandPalette';
import NotificationsView from '@/components/NotificationsView';

// --- Types & Utils & Hooks ---
import { Task, ViewType } from '@/types';
import { getCurrentYearMonth } from '@/utils/dateUtils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIosKeyboardFix } from '@/hooks/useIosKeyboardFix';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';

export default function Home() {
  // ============================================================================
  // 1. Primitive States (基本状態)
  // ============================================================================

  // Auth & Settings
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appSettings, setAppSettings] = useState({
    shrinkEmptyPastDays: true,
    syncInterval: 5,
    notificationInterval: 30,
    alarmTime: '',
    wakeLockEnabled: true,
  });

  // Global UI & View
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  // Data Loading State
  const [activeRequests, setActiveRequests] = useState(0);

  // Modals & Panels
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

  // ============================================================================
  // 2. Custom Hooks (データ・同期・システム操作)
  // ============================================================================

  const { addToast } = useToast();

  const incrementRequest = useCallback(
    () => setActiveRequests((prev) => prev + 1),
    [],
  );
  const decrementRequest = useCallback(
    () => setActiveRequests((prev) => Math.max(0, prev - 1)),
    [],
  );

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

  const { wsRef, wsStatus, connectedDevices, ownDeviceId } = useAtlasWebSocket(
    fetchTasks,
    fetchNotifications,
  );

  // ============================================================================
  // 3. Derived State (派生データ)
  // ============================================================================

  const hasExtension = connectedDevices.some(
    (d) => d.clientType === 'extension',
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ============================================================================
  // 4. Handlers (イベント・UI操作関連)
  // ============================================================================

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('atlas_auth');
    setIsAuthenticated(false);
  }, []);

  const openTaskModal = useCallback((task?: Partial<Task>) => {
    const mode = task?.id ? 'edit' : 'create';
    setTaskModalConfig({ isOpen: true, mode, task: task || null });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleOpenStats = useCallback((date: Date) => {
    setStatsTargetDate(date);
    setIsStatsOpen(true);
  }, []);

  const handleSendToPC = useCallback(
    (url: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'OPEN_URL_ON_PC', url }));
        addToast('💻 PCにURLを送信しました！');
      } else {
        addToast('⚠️ サーバー（Atlas）との通信が切断されています。');
      }
    },
    [wsRef, addToast],
  );

  // ============================================================================
  // 5. Effects (ライフサイクル・イベント監視)
  // ============================================================================

  // 初期化・認証確認
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // 設定のロード・保存
  useEffect(() => {
    const saved = localStorage.getItem('gleis_settings');
    if (saved) setAppSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('gleis_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // 初回のデータフェッチ処理
  const hasFetchedInitial = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !hasFetchedInitial.current) {
      fetchTasks(false);
      hasFetchedInitial.current = true;
    }
  }, [isAuthenticated, fetchTasks]);

  // 時計と自動同期のタイマー
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

  // ============================================================================
  // 6. UI Interaction Hooks (キーボードショートカット等)
  // ============================================================================

  useIosKeyboardFix();

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen((p) => !p),
    onSync: () => handleNotionSync(true),
    onLogout: handleLogout,
    onCreateTask: () => openTaskModal(),
    onOpenActionPanel: () => setIsActionPanelOpen((p) => !p),
    onNavigate: handleViewChange,
  });

  // ============================================================================
  // 7. Render (UI描画)
  // ============================================================================

  if (isAuthChecking) return <div className="h-screen bg-black" />;
  if (!isAuthenticated) {
    return (
      <AuthView
        currentTime={currentTime}
        onLogin={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <ToastProvider>
      <div
        id="appwindow"
        className="flex h-screen overflow-hidden text-gray-200 relative bg-black"
      >
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
          onCapture={(task) => openTaskModal(task)}
        />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={handleViewChange}
          onSync={() => handleNotionSync(true)}
          onNewTask={(task) => openTaskModal(task)}
          tasks={tasks}
          onTaskClick={(task) => openTaskModal(task)}
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
              { id: 'note', icon: FileText, label: 'Note' },
              { id: 'aiagent', icon: Bot, label: 'Agent' },
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
              onClick={() => {
                setIsCommandPaletteOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-neon transition-colors"
            >
              <Terminal className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium">
                Command Palette
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
              openTaskModal={(task) => openTaskModal(task)}
              onOpenStats={() => handleOpenStats(new Date())}
            />
          )}
          {currentView === 'weekly' && (
            <WeeklyView
              appSettings={appSettings}
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              openTaskModal={(task) => openTaskModal(task)}
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
              openTaskModal={(task) => openTaskModal(task)}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              loading={isTasksLoading}
              setTasks={setTasks}
              openTaskModal={(task) => openTaskModal(task)}
              onOpenStats={handleOpenStats}
            />
          )}
          {currentView === 'meeting' && (
            <MeetingView
              meetingTasks={meetingTasks}
              openTaskModal={(task) => openTaskModal(task)}
            />
          )}
          {currentView === 'review' && (
            <ReviewView
              initialYearMonth={getCurrentYearMonth()}
              completedTasks={completedTasks}
            />
          )}
          {currentView === 'note' && (
            <NoteView
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
            />
          )}
          {currentView === 'aiagent' && (
            <AiAgentView
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={markAsRead}
              openTaskModal={(task) => openTaskModal(task)}
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
            openTaskModal={(task) => openTaskModal(task)}
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
