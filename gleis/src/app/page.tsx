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
  FileStack,
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
import DocumentsView from '@/components/views/DocumentsView';
import SettingsView from '@/components/views/SettingsView';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import AlarmHandler from '@/components/AlarmHandler';
import TaskModal from '@/components/modals/TaskModal';
import ProjectModal from '@/components/modals/ProjectModal';
import StatsModal from '@/components/modals/StatsModal';
import QuickAlarmModal from '@/components/modals/QuickAlarmModal';
import VoiceCaptureModal from '@/components/modals/VoiceCaptureModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import FocusModal from '@/components/modals/FocusModal';
import CommandPalette from '@/components/modals/CommandPalette';
import ActionPanel from '@/components/panels/ActionPanel';
import LiveActivityPill, {
  LiveActivityItem,
} from '@/components/ui/LiveActivityPill';

// --- Types & Utils & Hooks ---
import type { Task, ViewType, SettingsTab, LocalNote } from '@/types';
import { isViewType } from '@/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFocusSession, formatFocusTime } from '@/hooks/useFocusSession';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIosKeyboardFix } from '@/hooks/useIosKeyboardFix';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useNoteSync } from '@/hooks/useNoteSync';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { usePaperless } from '@/hooks/usePaperless';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useConfirm } from '@/hooks/useConfirm';
import { parseGleisLink } from '@/utils/scheme';
import { getDateFullString } from '@/utils/date';

const NAV_GROUPS: {
  label: string;
  items: {
    id: ViewType;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }[];
}[] = [
  {
    label: 'Tasks',
    items: [
      { id: 'home', icon: LayoutDashboard, label: 'Home' },
      { id: 'weekly', icon: Columns2, label: 'Weekly' },
      { id: 'kanban', icon: Kanban, label: 'Kanban' },
      { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'meeting', icon: BriefcaseBusiness, label: 'Meeting' },
      { id: 'review', icon: ClipboardPenLine, label: 'Review' },
      { id: 'note', icon: FileText, label: 'Note' },
      { id: 'documents', icon: FileStack, label: 'Document' },
    ],
  },
  {
    label: 'Insights & AI',
    items: [
      { id: 'aiagent', icon: Bot, label: 'Agent' },
      { id: 'stats', icon: ChartNoAxesCombined, label: 'Stats' },
    ],
  },
  {
    label: 'System',
    items: [{ id: 'settings', icon: Settings, label: 'Settings' }],
  },
];

function HomeContent() {
  // ============================================================================
  // 1. Primitive States (基本状態)
  // ============================================================================

  // Auth & Settings
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const { appSettings, setAppSettings } = useAppSettings();

  // Global UI & View
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedNote, setSelectedNote] = useState<LocalNote | null>(null);

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

  const { isWakeLockActive, isWakeLockSupported, requestWakeLock } =
    useWakeLock(isAuthenticated && (appSettings.wakeLockEnabled ?? true));

  const focusSession = useFocusSession(addToast);

  const handleNoteError = useCallback(
    (msg: string) => addToast(msg, 'alert'),
    [addToast],
  );
  const { notes, areNotesLoading, fetchNotes } = useNoteSync(handleNoteError);

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

  const {
    documents,
    isLoading: isDocumentsLoading,
    isUploading: isDocumentsUploading,
    fetchDocuments,
    syncDocuments,
    openDocument,
    uploadDocuments,
  } = usePaperless();

  const { wsRef, wsStatus, connectedDevices, ownDeviceId, reconnect: reconnectWs } =
    useAtlasWebSocket(fetchTasks, fetchNotifications);

  // ============================================================================
  // 3. Derived State (派生データ)
  // ============================================================================

  const hasExtension = connectedDevices.some(
    (d) => d.clientType === 'extension',
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const liveActivities = useMemo<LiveActivityItem[]>(() => {
    const list: LiveActivityItem[] = [];

    // 1. Focus Mode 最小化中（最優先）
    if (focusSession.isMinimized && focusSession.task) {
      list.push({
        id: 'focus-session',
        kind: 'focus',
        tone: 'amber',
        badge: formatFocusTime(focusSession.seconds),
        title: focusSession.task.title || 'Focus Mode',
        subtitle: focusSession.isActive
          ? focusSession.mode === 'pomodoro'
            ? 'ポモドーロ実行中'
            : 'ストップウォッチ計測中'
          : '一時停止中',
        isPulsing: focusSession.isActive,
        inlineAction: {
          ariaLabel: focusSession.isActive ? '一時停止' : '再開',
          icon: focusSession.isActive ? 'pause' : 'play',
          onClick: focusSession.toggleRunning,
        },
        primaryAction: {
          label: 'フルスクリーンで開く',
          icon: 'maximize',
          onClick: focusSession.restoreFocus,
        },
        secondaryAction: {
          label: '終了',
          variant: 'danger',
          onClick: focusSession.endFocus,
        },
      });
    }

    // 2. バックグラウンド処理中（Paperless アップロード / Atlas 同期）
    if (isDocumentsUploading) {
      list.push({
        id: 'paperless-upload',
        kind: 'processing',
        tone: 'neon',
        badge: 'UPLOAD',
        title: 'Paperless アップロード中...',
        subtitle: '書類を取り込んでいます',
        isSpinner: true,
      });
    } else if (activeRequests > 0) {
      list.push({
        id: 'atlas-sync',
        kind: 'processing',
        tone: 'neon',
        badge: 'SYNC',
        title: 'Atlas と同期中...',
        subtitle: `${activeRequests}件の処理を実行中`,
        isSpinner: true,
      });
    }

    // 3. WebSocket 切断アラート
    if (wsStatus === 'disconnected') {
      list.push({
        id: 'ws-offline',
        kind: 'alert',
        tone: 'red',
        badge: 'OFFLINE',
        title: 'Atlas サーバーから切断中',
        subtitle: '自動再接続を待機しています',
        isPulsing: true,
        primaryAction: {
          label: '今すぐ再接続',
          icon: 'refresh',
          onClick: () => {
            reconnectWs();
            addToast('Atlas サーバーへ再接続を試行しています', 'info');
          },
        },
      });
    }

    // 4. WakeLock OFF 復帰（1タップでON）
    if (
      appSettings.wakeLockEnabled &&
      isWakeLockSupported &&
      !isWakeLockActive
    ) {
      list.push({
        id: 'wakelock-off',
        kind: 'wakelock',
        tone: 'amber',
        badge: 'WakeLock OFF',
        title: 'タップで画面常時点灯をON',
        directAction: () => {
          void requestWakeLock().then((ok) => {
            if (ok) {
              addToast('☀️ WakeLock をONにしました', 'info');
            } else {
              addToast('WakeLock の有効化に失敗しました', 'alert');
            }
          });
        },
      });
    }

    return list;
  }, [
    focusSession.isMinimized,
    focusSession.task,
    focusSession.seconds,
    focusSession.isActive,
    focusSession.mode,
    focusSession.toggleRunning,
    focusSession.restoreFocus,
    focusSession.endFocus,
    isDocumentsUploading,
    activeRequests,
    wsStatus,
    reconnectWs,
    appSettings.wakeLockEnabled,
    isWakeLockSupported,
    isWakeLockActive,
    requestWakeLock,
    addToast,
  ]);

  // ============================================================================
  // 4. Handlers (イベント・UI操作関連)
  // ============================================================================

  const handleViewChange = useCallback((view: ViewType) => {
    if (view === 'settings') setSettingsTab('general');
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    closeProjectModal();
    closeTaskModal();
  }, []);

  const handleOpenSetting = useCallback((tab: SettingsTab) => {
    setSettingsTab(tab);
    setCurrentView('settings');
    setIsMobileMenuOpen(false);
    closeProjectModal();
    closeTaskModal();
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
  }, []);

  const openProjectModal = (task: Partial<Task>) => {
    if (!task) return;
    setProjectModalConfig({
      isOpen: true,
      parentTask: task,
    });
    closeTaskModal();
  };

  const openFocusModal = (task: Partial<Task>) => {
    if (!task) return;
    focusSession.startFocus(task);
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
      if (payload.parent_id && payload.start_date) {
        const parentTask = allTasks.find((t) => t.id === payload.parent_id);

        // 2. 子タスクの日付が、親タスクの日付より「未来」の場合
        if (
          parentTask &&
          parentTask.start_date &&
          payload.start_date > parentTask.start_date
        ) {
          const shouldUpdateParent = await confirm(
            '親タスク期日調整',
            <>
              子タスクの期日が、親プロジェクト「
              {parentTask.title}」の期日 (
              {getDateFullString(parentTask.start_date)})
              を超えています。
              <br />
              <br />
              親プロジェクトの期日も延長しますか？
            </>,
            '延長する',
            'そのままにする',
          );

          if (shouldUpdateParent) {
            await updateTaskDate(parentTask, payload.start_date);
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

  // 初回のデータフェッチ処理
  const hasFetchedInitial = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !hasFetchedInitial.current) {
      fetchTasks(false);
      fetchNotifications();
      fetchDocuments();
      fetchNotes();
      hasFetchedInitial.current = true;
    }
  }, [isAuthenticated, fetchTasks, fetchNotifications, fetchDocuments, fetchNotes]);

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
        if (gleisLink.target === 'notifications') {
          handleOpenSetting('notifications');
        } else if (isViewType(gleisLink.target)) {
          handleViewChange(gleisLink.target);
        } else {
          console.warn(`無効な画面遷移先です： ${gleisLink.target}`);
        }
      } else if (gleisLink.type === 'task') {
        const targetTask = allTasks.find((t) => t.id === gleisLink.target);
        if (targetTask) openTaskModal(targetTask);
      } else if (gleisLink.type === 'document') {
        const paperlessId = Number(gleisLink.target);
        if (Number.isSafeInteger(paperlessId) && paperlessId > 0) {
          openDocument(paperlessId);
        } else {
          console.warn(`無効な文書IDです： ${gleisLink.target}`);
        }
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
      <div
        id="appwindow"
        className="flex h-screen overflow-hidden text-gray-200 relative bg-black"
      >
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
          onOpenSetting={handleOpenSetting}
          tasks={allTasks}
          onTaskClick={(task) => openTaskModal(task)}
          onNewTask={(task) => openTaskModal(task)}
          onNotionSync={() => handleNotionSync(true)}
          documents={documents}
          onDocumentClick={openDocument}
          onDocumentSync={() => syncDocuments()}
          onQuickAlarmOpen={() => setIsQuickAlarmOpen(true)}
          onLock={handleLogout}
          notes={notes}
          onNoteClick={(note) => {
            setSelectedNote(note);
            handleViewChange('note');
          }}
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
          <nav className="flex flex-col gap-3 flex-1 overflow-y-auto overflow-x-hidden noir-scrollbar-hidden">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                className={
                  groupIndex > 0 ? 'pt-3 border-t border-white/5 space-y-1' : 'space-y-1'
                }
              >
                <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 whitespace-nowrap sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewChange(item.id)}
                      className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 shrink-0 ${isActive ? 'text-neon' : ''}`}
                      />
                      <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0 md:flex-row md:gap-0">
            <button
              onClick={() => {
                setIsCommandPaletteOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-neon transition-colors md:flex-1 md:justify-center md:gap-2"
            >
              <Terminal className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium md:hidden">
                Command Palette
              </span>
              <span className="hidden md:inline font-medium">Cmd</span>
            </button>
            <div className="hidden md:block w-px self-stretch bg-white/10 shrink-0" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400 md:flex-1 md:justify-center md:gap-2"
            >
              <Lock className="w-5 h-5 shrink-0" />
              <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium lg:hidden">
                Lock
              </span>
              <span className="hidden lg:inline font-medium">Lock</span>
            </button>
          </div>
        </aside>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col m-2 md:m-4 md:ml-0 min-w-0 min-h-0">
          <HeaderView
            currentTime={currentTime}
            hasNotifications={unreadCount > 0 || overdueTasks.length > 0}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isQuickAlarmOpen={isQuickAlarmOpen}
            setIsQuickAlarmOpen={setIsQuickAlarmOpen}
            setIsActionPanelOpen={setIsActionPanelOpen}
            appSettings={appSettings}
            isSyncing={activeRequests > 0}
            onOpenCommandPalette={() => {
              setIsCommandPaletteOpen(true);
              setIsMobileMenuOpen(false);
            }}
          />

          <main className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {currentView === 'home' && (
              <HomeView
                tasks={tasks}
                completedTasks={completedTasks}
                wrapperTasks={wrapperTasks}
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
                onSyncStart={incrementRequest}
                onSyncEnd={decrementRequest}
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
                onSyncStart={incrementRequest}
                onSyncEnd={decrementRequest}
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
                notes={notes}
                isLoading={areNotesLoading}
                onRefresh={fetchNotes}
                selectedNote={selectedNote}
                onNoteOpened={() => setSelectedNote(null)}
                onSyncStart={incrementRequest}
                onSyncEnd={decrementRequest}
                confirm={confirm}
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

            {currentView === 'settings' && (
              <SettingsView
                appSettings={appSettings}
                setAppSettings={setAppSettings}
                wsStatus={wsStatus}
                connectedDevices={connectedDevices}
                ownDeviceId={ownDeviceId}
                activeTab={settingsTab}
                onTabChange={setSettingsTab}
                notifications={notifications}
                onMarkAsRead={markAsRead}
                allTasks={allTasks}
                openTaskModal={openTaskModal}
                handleGleisLink={handleGleisLink}
              />
            )}
            {currentView === 'documents' && (
              <DocumentsView
                documents={documents}
                isLoading={isDocumentsLoading}
                isUploading={isDocumentsUploading}
                openDocument={openDocument}
                uploadDocuments={uploadDocuments}
                openTaskModal={openTaskModal}
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
              handleGleisLink={(url, callback) =>
                handleGleisLink(url, callback)
              }
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
              onOpenFocusModal={(task) => openFocusModal(task)}
              openTaskModal={(task) => openTaskModal(task)}
              handleGleisLink={(url, callback) =>
                handleGleisLink(url, callback)
              }
              allTasks={allTasks}
            />
            <ActionPanel
              isOpen={isActionPanelOpen}
              isWakeLockActive={isWakeLockActive}
              notifications={notifications}
              lastSyncTime={lastSyncTime}
              overdueTasks={overdueTasks}
              onClose={() => setIsActionPanelOpen(false)}
              onOpenSetting={(tab) => handleOpenSetting(tab)}
              onOpenVoiceCapture={() => setIsVoiceCaptureOpen(true)}
              onRescheduleOverdue={handleRescheduleOverdue}
              onSyncStart={incrementRequest}
              onSyncEnd={decrementRequest}
              onNotionSync={() => handleNotionSync(true)}
              onMarkAsRead={markAsRead}
              onPaperlessSync={syncDocuments}
              wsStatus={wsStatus}
              connectedDevicesCount={connectedDevices.length}
            />
            <ConfirmModal {...confirmProps} />
            <FocusModal
              isOpen={focusSession.isOpen}
              task={focusSession.task}
              mode={focusSession.mode}
              seconds={focusSession.seconds}
              isActive={focusSession.isActive}
              onChangeMode={focusSession.changeMode}
              onToggleRunning={focusSession.toggleRunning}
              onReset={focusSession.resetTimer}
              onMinimize={focusSession.minimizeFocus}
              onEnd={focusSession.endFocus}
              onCompleted={() => void fetchTasks(true)}
              addToast={addToast}
            />
          </main>
          <LiveActivityPill
            activities={liveActivities}
            onOpenLink={(url) => handleGleisLink(url)}
          />
        </div>
      </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}
