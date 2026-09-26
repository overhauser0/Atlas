// src/app/page.tsx

'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  Columns2,
  Settings,
  Lock,
  Kanban,
  CalendarDays,
  ClipboardPenLine,
  BriefcaseBusiness,
  Terminal,
  FileText,
  Bot,
  ChartNoAxesCombined,
} from 'lucide-react';

// --- Components ---
import AuthView from '@/components/views/AuthView';
import HeaderView from '@/components/views/HeaderView';
import HomeView from '@/components/views/HomeView';
import WeeklyView from '@/components/views/WeeklyView';
import KanbanView from '@/components/views/KanbanView';
import CalendarView from '@/components/views/CalendarView';
import MeetingView from '@/components/views/MeetingView';
import ReviewView from '@/components/views/ReviewView';
import NoteView from '@/components/views/NoteView';
import AiAgentView from '@/components/views/AiAgentView';
import StatsView from '@/components/views/StatsView';
import SettingsView from '@/components/views/SettingsView';
import WakeLockHandler from '@/components/WakeLockHandler';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import AlarmHandler from '@/components/AlarmHandler';
import TaskModal from '@/components/modals/TaskModal';
import ProjectModal from '@/components/modals/ProjectModal';
import StatsModal from '@/components/modals/StatsModal';
import QuickAlarmModal from '@/components/modals/QuickAlarmModal';
import VoiceCaptureModal from '@/components/modals/VoiceCaptureModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import ActionPanel from '@/components/panels/ActionPanel';
import CommandPalette from '@/components/modals/CommandPalette';
import NotificationsView from '@/components/views/NotificationsView';

// --- Types & Utils & Hooks ---
import { Task, ViewType, isViewType } from '@/types';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIosKeyboardFix } from '@/hooks/useIosKeyboardFix';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useConfirm } from '@/hooks/useConfirm';
import { parseGleisLink } from '@/utils/schemeUtils';

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

  const [projectModalConfig, setProjectModalConfig] = useState<{
    isOpen: boolean;
    parentTask: Partial<Task> | null;
  }>({ isOpen: false, parentTask: null });

  // ============================================================================
  // 2. Custom Hooks (データ・同期・システム操作)
  // ============================================================================

  const { addToast } = useToast();
  const { confirm, confirmProps } = useConfirm();

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
    wrapperTasks,
    overdueTasks,
    meetingTasks,
    isTasksLoading,
    lastSyncTime,
    fetchTasks,
    handleNotionSync,
    handleRescheduleOverdue,
    saveTask,
    updateTaskDate,
    fetchBlocks,
  } = useTaskSync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
    appSettings.syncInterval,
  );

  const allTasks = useMemo(() => {
    return [...tasks, ...completedTasks, ...wrapperTasks];
  }, [tasks, completedTasks, wrapperTasks]);

  const subTaskMap = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};

    allTasks.forEach((task) => {
      if (task.parent_id) {
        if (!map[task.parent_id]) {
          map[task.parent_id] = { total: 0, done: 0 };
        }

        map[task.parent_id].total += 1;
        if (task.status === 'Done') {
          map[task.parent_id].done += 1;
        }
      }
    });

    return map;
  }, [allTasks]);

  const currentSubTasks = useMemo(() => {
    if (!projectModalConfig.parentTask?.id) return [];
    return allTasks.filter(
      (t) => t.parent_id === projectModalConfig.parentTask!.id,
    );
  }, [allTasks, projectModalConfig.parentTask?.id]);

  const { notifications, markAsRead, fetchNotifications } =
    useNotificationSync(isAuthenticated);

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

  const closeTaskModal = useCallback(() => {
    setTaskModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);
  const closeProjectModal = useCallback(() => {
    setProjectModalConfig({
      isOpen: false,
      parentTask: null,
    });
  }, []);

  const openTaskModal = useCallback((task?: Partial<Task>) => {
    const mode = task?.id ? 'edit' : 'create';
    setTaskModalConfig({ isOpen: true, mode, task: task || null });
    // closeProjectModal();
  }, []);

  const openProjectModal = (task: Partial<Task>) => {
    if (!task) return;
    setProjectModalConfig({
      isOpen: true,
      parentTask: task,
    });
    closeTaskModal();
  };

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
  // 日付チェック付きの保存関数
  const handleSaveTaskWithCheck = async (
    taskId: string | null,
    payload: any,
  ) => {
    try {
      // 1. 親が設定されていて、かつ日付が入力されている場合
      if (payload.parent_id && payload.date) {
        const parentTask = allTasks.find((t) => t.id === payload.parent_id);

        // 2. 子タスクの日付が、親タスクの日付より「未来」の場合
        if (parentTask && parentTask.date && payload.date > parentTask.date) {
          const shouldUpdateParent = await confirm(
            '親タスク期日調整',
            <>
              子タスクの期日が、親プロジェクト「
              {parentTask.title}」の期日 ({parentTask.date}) を超えています。
              <br />
              <br />
              親プロジェクトの期日も延長しますか？
            </>,
            '延長する',
            'そのままにする',
          );

          if (shouldUpdateParent) {
            await updateTaskDate(parentTask.id, payload.date);
            addToast('親プロジェクトの期日を延長しました', 'info');
          }
        }
      }
      await saveTask(taskId, payload);
    } catch (e) {
      console.error(e);
    }
  };

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
      fetchNotifications();
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

  const handleGleisLink = (url: string, callback?: Function) => {
    const gleisLink = parseGleisLink(url);

    if (gleisLink) {
      if (gleisLink.type === 'view') {
        if (isViewType(gleisLink.target)) {
          handleViewChange(gleisLink.target);
        } else {
          console.warn(`無効な画面遷移先です： ${gleisLink.target}`);
        }
      } else if (gleisLink.type === 'task') {
        const targetTask = allTasks.find((t) => t.id === gleisLink.target);
        if (targetTask) openTaskModal(targetTask);
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (callback) callback();

    return gleisLink;
  };

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
          className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[-120%]'} sm:relative sm:translate-x-0 group w-64 sm:w-20 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-x-hidden`}
        >
          <div className="flex items-center gap-4 mb-8 px-2 mt-2 shrink-0">
            <div className="w-8 h-8 bg-neon rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
              G
            </div>
            <div className="text-xl font-bold text-white whitespace-nowrap sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity duration-300">
              Gleis
            </div>
          </div>
          <nav className="flex flex-col gap-2 flex-1 overflow-y-auto overflow-x-hidden noir-scrollbar">
            {[
              { id: 'home', icon: LayoutDashboard, label: 'Home' },
              { id: 'weekly', icon: Columns2, label: 'WeeklyTask' },
              { id: 'kanban', icon: Kanban, label: 'Kanban' },
              { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
              { id: 'meeting', icon: BriefcaseBusiness, label: 'Meeting' },
              { id: 'review', icon: ClipboardPenLine, label: 'Review' },
              { id: 'note', icon: FileText, label: 'Note' },
              { id: 'aiagent', icon: Bot, label: 'Agent' },
              {
                id: 'stats',
                icon: ChartNoAxesCombined,
                label: 'Stats',
              },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id as ViewType)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${currentView === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
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
              subTaskMap={subTaskMap}
              openTaskModal={(task) => openTaskModal(task)}
              onOpenStats={() => handleOpenStats(new Date())}
            />
          )}
          {currentView === 'weekly' && (
            <WeeklyView
              appSettings={appSettings}
              tasks={tasks}
              subTaskMap={subTaskMap}
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
              subTaskMap={subTaskMap}
              loading={isTasksLoading}
              setTasks={setTasks}
              openTaskModal={(task) => openTaskModal(task)}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
              tasks={tasks}
              completedTasks={completedTasks}
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
          {currentView === 'review' && <ReviewView />}
          {currentView === 'note' && (
            <NoteView
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
            />
          )}
          {currentView === 'aiagent' && (
            <AiAgentView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
            />
          )}
          {currentView === 'stats' && (
            <StatsView
              completedTasks={completedTasks}
              tasks={tasks}
              loading={isTasksLoading}
              openTaskModal={(task) => openTaskModal(task)}
              onOpenStats={handleOpenStats}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={markAsRead}
              openTaskModal={(task) => openTaskModal(task)}
              handleGleisLink={(url, callback) =>
                handleGleisLink(url, callback)
              }
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
          <ProjectModal
            isOpen={projectModalConfig.isOpen}
            onClose={closeProjectModal}
            onSuccess={() => fetchTasks(true)}
            parentTask={projectModalConfig.parentTask as Task}
            subTasks={currentSubTasks}
            openTaskModal={(task) => openTaskModal(task)}
            allTasks={allTasks}
            handleGleisLink={(url, callback) => handleGleisLink(url, callback)}
          />
          <TaskModal
            isOpen={taskModalConfig.isOpen}
            mode={taskModalConfig.mode}
            task={taskModalConfig.task}
            subTaskMap={subTaskMap}
            onClose={closeTaskModal}
            onSave={handleSaveTaskWithCheck}
            onSuccess={() => fetchTasks(true)}
            onSyncStart={incrementRequest}
            onSyncEnd={decrementRequest}
            onSendToPC={hasExtension ? handleSendToPC : undefined}
            onShowContent={fetchBlocks}
            onOpenProjectModal={(task) => openProjectModal(task)}
            /*getSubTasks={(parentId) => handleGetSubTasks(parentId)}*/
            openTaskModal={(task) => openTaskModal(task)}
            handleGleisLink={(url, callback) => handleGleisLink(url, callback)}
            allTasks={allTasks}
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
          <ConfirmModal {...confirmProps} />
        </main>
      </div>
    </ToastProvider>
  );
}
