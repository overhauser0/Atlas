'use client';

import type React from 'react';
import TaskModal, {
  type TaskSavePayload,
} from '@/components/modals/TaskModal';
import ProjectModal from '@/components/modals/ProjectModal';
import StatsModal from '@/components/modals/StatsModal';
import QuickAlarmModal from '@/components/modals/QuickAlarmModal';
import VoiceCaptureModal from '@/components/modals/VoiceCaptureModal';
import ConfirmModal, {
  type ConfirmModalProps,
} from '@/components/modals/ConfirmModal';
import FocusModal from '@/components/modals/FocusModal';
import CommandPalette from '@/components/modals/CommandPalette';
import ActionPanel from '@/components/panels/ActionPanel';
import type { useFocusSession } from '@/hooks/useFocusSession';
import type { useTaskSync } from '@/hooks/useTaskSync';
import type {
  AppNotification,
  AppSettings,
  LocalNote,
  PaperlessDocument,
  SettingsTab,
  SubTaskProgressMap,
  Task,
  ViewType,
} from '@/types';

export interface GleisGlobalOverlaysProps {
  isVoiceCaptureOpen: boolean;
  onCloseVoiceCapture: () => void;
  isCommandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenSetting: (tab: SettingsTab) => void;
  allTasks: Task[];
  openTaskModal: (task?: Partial<Task>) => void;
  onNotionSync: () => void;
  documents: PaperlessDocument[];
  openDocument: (paperlessId: number) => void;
  onDocumentSync: () => void;
  onQuickAlarmOpen: () => void;
  onLogout: () => void;
  notes: LocalNote[];
  onSelectNote: (note: LocalNote) => void;
}

export function GleisGlobalOverlays({
  isVoiceCaptureOpen,
  onCloseVoiceCapture,
  isCommandPaletteOpen,
  onCloseCommandPalette,
  onNavigate,
  onOpenSetting,
  allTasks,
  openTaskModal,
  onNotionSync,
  documents,
  openDocument,
  onDocumentSync,
  onQuickAlarmOpen,
  onLogout,
  notes,
  onSelectNote,
}: GleisGlobalOverlaysProps) {
  return (
    <>
      <VoiceCaptureModal
        isOpen={isVoiceCaptureOpen}
        onClose={onCloseVoiceCapture}
        onCapture={(task) => openTaskModal(task)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
        onNavigate={onNavigate}
        onOpenSetting={onOpenSetting}
        tasks={allTasks}
        onTaskClick={(task) => openTaskModal(task)}
        onNewTask={(task) => openTaskModal(task)}
        onNotionSync={onNotionSync}
        documents={documents}
        onDocumentClick={openDocument}
        onDocumentSync={onDocumentSync}
        onQuickAlarmOpen={onQuickAlarmOpen}
        onLock={onLogout}
        notes={notes}
        onNoteClick={onSelectNote}
      />
    </>
  );
}

export interface GleisModalsProps {
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isQuickAlarmOpen: boolean;
  onCloseQuickAlarm: () => void;
  isStatsOpen: boolean;
  onCloseStats: () => void;
  statsTargetDate: Date;
  completedTasks: Task[];
  projectModalConfig: {
    isOpen: boolean;
    parentTask: Partial<Task> | null;
  };
  onCloseProjectModal: () => void;
  currentSubTasks: Task[];
  taskModalConfig: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    task: Partial<Task> | null;
  };
  onCloseTaskModal: () => void;
  subTaskMap: SubTaskProgressMap;
  allTasks: Task[];
  onSaveTask: (taskId: string | null, payload: TaskSavePayload) => Promise<void>;
  onRefreshTasks: () => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
  onSendToPC?: (url: string) => void;
  onShowContent: ReturnType<typeof useTaskSync>['fetchBlocks'];
  onOpenProjectModal: (task: Partial<Task>) => void;
  onOpenFocusModal: (task: Partial<Task>) => void;
  openTaskModal: (task?: Partial<Task>) => void;
  handleGleisLink: (url: string, callback?: () => void) => void;
  isActionPanelOpen: boolean;
  onCloseActionPanel: () => void;
  isWakeLockActive: boolean;
  notifications: AppNotification[];
  lastSyncTime: number | null | undefined;
  overdueTasks: Task[];
  onOpenSetting: (tab: SettingsTab) => void;
  onOpenVoiceCapture: () => void;
  onRescheduleOverdue: () => Promise<void>;
  onNotionSync: () => void;
  onMarkAsRead: (id: string) => void;
  onPaperlessSync: () => Promise<void>;
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  connectedDevicesCount: number;
  confirmProps: ConfirmModalProps;
  focusSession: ReturnType<typeof useFocusSession>;
  addToast: (msg: string, type?: 'info' | 'alert') => void;
}

export default function GleisModals({
  appSettings,
  setAppSettings,
  isQuickAlarmOpen,
  onCloseQuickAlarm,
  isStatsOpen,
  onCloseStats,
  statsTargetDate,
  completedTasks,
  projectModalConfig,
  onCloseProjectModal,
  currentSubTasks,
  taskModalConfig,
  onCloseTaskModal,
  subTaskMap,
  allTasks,
  onSaveTask,
  onRefreshTasks,
  onSyncStart,
  onSyncEnd,
  onSendToPC,
  onShowContent,
  onOpenProjectModal,
  onOpenFocusModal,
  openTaskModal,
  handleGleisLink,
  isActionPanelOpen,
  onCloseActionPanel,
  isWakeLockActive,
  notifications,
  lastSyncTime,
  overdueTasks,
  onOpenSetting,
  onOpenVoiceCapture,
  onRescheduleOverdue,
  onNotionSync,
  onMarkAsRead,
  onPaperlessSync,
  wsStatus,
  connectedDevicesCount,
  confirmProps,
  focusSession,
  addToast,
}: GleisModalsProps) {
  return (
    <>
      <QuickAlarmModal
        isOpen={isQuickAlarmOpen}
        onClose={onCloseQuickAlarm}
        appSettings={appSettings}
        setAppSettings={setAppSettings}
      />
      <StatsModal
        isOpen={isStatsOpen}
        completedTasks={completedTasks}
        targetDate={statsTargetDate}
        openTaskModal={(task) => openTaskModal(task)}
        onClose={onCloseStats}
      />
      <ProjectModal
        isOpen={projectModalConfig.isOpen}
        onClose={onCloseProjectModal}
        onSuccess={onRefreshTasks}
        parentTask={projectModalConfig.parentTask as Task}
        subTasks={currentSubTasks}
        openTaskModal={(task) => openTaskModal(task)}
        allTasks={allTasks}
        handleGleisLink={handleGleisLink}
      />
      <TaskModal
        isOpen={taskModalConfig.isOpen}
        mode={taskModalConfig.mode}
        task={taskModalConfig.task}
        subTaskMap={subTaskMap}
        onClose={onCloseTaskModal}
        onSave={onSaveTask}
        onSuccess={onRefreshTasks}
        onSyncStart={onSyncStart}
        onSyncEnd={onSyncEnd}
        onSendToPC={onSendToPC}
        onShowContent={onShowContent}
        onOpenProjectModal={onOpenProjectModal}
        onOpenFocusModal={onOpenFocusModal}
        openTaskModal={(task) => openTaskModal(task)}
        handleGleisLink={handleGleisLink}
        allTasks={allTasks}
      />
      <ActionPanel
        isOpen={isActionPanelOpen}
        isWakeLockActive={isWakeLockActive}
        notifications={notifications}
        lastSyncTime={lastSyncTime}
        overdueTasks={overdueTasks}
        onClose={onCloseActionPanel}
        onOpenSetting={onOpenSetting}
        onOpenVoiceCapture={onOpenVoiceCapture}
        onRescheduleOverdue={onRescheduleOverdue}
        onSyncStart={onSyncStart}
        onSyncEnd={onSyncEnd}
        onNotionSync={onNotionSync}
        onMarkAsRead={onMarkAsRead}
        onPaperlessSync={onPaperlessSync}
        wsStatus={wsStatus}
        connectedDevicesCount={connectedDevicesCount}
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
        onCompleted={onRefreshTasks}
        addToast={addToast}
      />
    </>
  );
}
