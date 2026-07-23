'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Zap,
  Bell,
  Clock,
  RefreshCw,
  Keyboard,
  Activity,
  Laptop,
  Smartphone,
  ServerCrash,
  Cpu,
  Plus,
  Trash2,
  Save,
  X,
  Edit2,
} from 'lucide-react';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/Toast';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  clientType: 'extension' | 'gleis' | string;
}

export interface Agent {
  id: string;
  name: string;
  system_prompt: string | null;
}

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
  wsStatus?: 'connected' | 'connecting' | 'disconnected';
  connectedDevices?: DeviceInfo[];
  ownDeviceId?: string;
}

// ==========================================
// AI Agent Manager (Sub Component)
// ==========================================
function AiAgentManager() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Agent>>({});
  const [isCreating, setIsCreating] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await atlasFetch('/ai/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || data);
    } catch (error) {
      console.error(error);
      addToast('エージェントの取得に失敗しました', 'alert');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEditStart = (agent: Agent) => {
    setIsCreating(false);
    setEditingId(agent.id);
    setEditData({ ...agent });
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingId(null);
    setEditData({ id: '', name: '', system_prompt: '' });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editData.id || !editData.name || !editData.system_prompt) {
      addToast('ID, Name, System Prompt はすべて必須です', 'alert');
      return;
    }

    // IDの簡易フォーマットチェック（英数字とハイフン、アンダースコアのみを許可）
    if (!/^[a-zA-Z0-9_-]+$/.test(editData.id)) {
      addToast('IDは英数字、ハイフン、アンダースコアのみ使用可能です', 'alert');
      return;
    }

    const endpoint = isCreating ? '/ai/agents' : `/ai/agents/${editingId}`;
    const method = isCreating ? 'POST' : 'PATCH';

    try {
      const response = await atlasFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...(isCreating ? { id: editData.id } : {}),
          name: editData.name,
          system_prompt: editData.system_prompt,
        }),
      });

      if (!response.ok) throw new Error('Failed to save agent');

      addToast(
        isCreating
          ? 'エージェントを作成しました'
          : 'エージェントを更新しました',
        'info',
      );
      setIsCreating(false);
      setEditingId(null);
      fetchAgents();
    } catch (error) {
      console.error(error);
      addToast('保存に失敗しました', 'alert');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('このエージェントを削除しますか？')) return;

    try {
      const response = await atlasFetch(`/ai/agents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete agent');

      addToast('エージェントを削除しました', 'info');
      fetchAgents();
    } catch (error) {
      console.error(error);
      addToast('削除に失敗しました', 'alert');
    }
  };

  return (
    <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 overflow-hidden flex flex-col">
      {isLoading ? (
        <div className="p-5 text-sm text-gray-500 text-center">
          Loading agents...
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {agents.map((agent) => {
            const isEditing = editingId === agent.id;
            return (
              <div key={agent.id} className="flex flex-col transition-colors">
                {/* 閲覧モード */}
                {!isEditing && (
                  <div className="flex items-center justify-between p-4 hover:bg-white/2 group">
                    <div className="flex items-center gap-3 pr-4">
                      <div className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-amber-500/50 transition-colors">
                        <Cpu className="w-4 h-4 text-amber-500/80" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-200">
                          {agent.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          ID: {agent.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditStart(agent)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="編集"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 編集モード (IDは変更不可、NameとSystem Promptを編集) */}
                {isEditing && (
                  <div className="p-4 bg-white/5 space-y-4 border-l-[3px] border-l-amber-500/80">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          ID (Endpoint)
                        </label>
                        <input
                          type="text"
                          value={editData.id || ''}
                          disabled
                          className="w-full bg-black/30 border border-white/5 rounded-lg py-2 px-3 text-gray-500 text-sm cursor-not-allowed font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editData.name || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          placeholder="Agent Name"
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        System Prompt
                      </label>
                      <textarea
                        value={editData.system_prompt || ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            system_prompt: e.target.value,
                          })
                        }
                        placeholder="You are a helpful assistant..."
                        rows={5}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-colors noir-scrollbar resize-y font-mono text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Agent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 新規作成エディタ (ID, Name, System Promptすべてを入力) */}
          {isCreating && (
            <div className="p-4 bg-white/5 space-y-4 border-l-[3px] border-l-amber-500/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID (Endpoint)
                  </label>
                  <input
                    type="text"
                    value={editData.id || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, id: e.target.value })
                    }
                    placeholder="e.g. proofread"
                    className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                    placeholder="Agent Name"
                    className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  System Prompt
                </label>
                <textarea
                  value={editData.system_prompt || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, system_prompt: e.target.value })
                  }
                  placeholder="You are a helpful assistant..."
                  rows={5}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-colors noir-scrollbar resize-y font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  <Save className="w-3.5 h-3.5" /> Save Agent
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isCreating && (
        <div className="p-3 bg-black/20 border-t border-white/5">
          <button
            onClick={handleCreateNew}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all border border-transparent hover:border-amber-500/20"
          >
            <Plus className="w-4 h-4" /> Create New Agent
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================
export default function SettingsView({
  appSettings,
  setAppSettings,
  wsStatus = 'connecting',
  connectedDevices = [],
  ownDeviceId = '',
}: Props) {
  const updateAlarm = (time: string) => {
    setAppSettings((s: any) => ({
      ...s,
      alarmTime: time,
    }));
  };

  return (
    <div className="flex-1 px-4 pb-20 mx-auto w-full space-y-10 overflow-y-auto noir-scrollbar ">
      {/* --- Section: View Settings --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Monitor className="w-3.5 h-3.5" />
          Display & Appearance
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Shrink empty past days
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Automatically reduce the width of past columns to 40% if they
                contain no tasks.
              </p>
            </div>
            <button
              onClick={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  shrinkEmptyPastDays: !s.shrinkEmptyPastDays,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 ${appSettings.shrinkEmptyPastDays ? 'bg-neon shadow-[0_0_10px_rgba(0,112,243,0.4)]' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${appSettings.shrinkEmptyPastDays ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Keep Screen On
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Prevent the device from sleeping while the app is open.
              </p>
            </div>
            <button
              onClick={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  wakeLockEnabled: !s.wakeLockEnabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 ${appSettings.wakeLockEnabled !== false ? 'bg-neon shadow-[0_0_10px_rgba(0,112,243,0.4)]' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${appSettings.wakeLockEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* --- Section: Automation --- */}
      <section className="flex flex-col gap-4">
        <h2 className="noir-label px-1 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Automation
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Task Sync Interval
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interval for syncing tasks with Notion (minutes). Set to 0 to
                disable auto-sync.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                min="0"
                value={appSettings.syncInterval}
                onChange={(e) =>
                  setAppSettings((s: any) => ({
                    ...s,
                    syncInterval: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-16 noir-input p-2! text-center"
              />
              <span className="text-xs text-gray-500 font-medium">min</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section: Alerts --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Bell className="w-3.5 h-3.5" />
          Alerts
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
          <div className="pr-4">
            <div className="text-sm font-medium text-gray-200">
              Simple Alarm
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              One-time notification. Once triggered, the setting is cleared.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="time"
                value={appSettings.alarmTime || ''}
                onChange={(e) => updateAlarm(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-white text-sm focus:border-neon focus:outline-none scheme-dark"
              />
            </div>
            {appSettings.alarmTime && (
              <button
                onClick={() => updateAlarm('')}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Zap className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* --- Section: AI Agents --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Cpu className="w-3.5 h-3.5" />
          AI Agents
        </h2>
        <AiAgentManager />
      </section>

      {/* --- Section: Web Socket --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Activity className="w-3.5 h-3.5" />
          Remote Sync
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/10">
                {wsStatus === 'connected' && (
                  <Activity className="w-4 h-4 text-green-400" />
                )}
                {wsStatus === 'connecting' && (
                  <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
                {wsStatus === 'disconnected' && (
                  <ServerCrash className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Connection Status
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {wsStatus === 'connected' && (
                    <span className="text-green-400">
                      🟢 Connected to Atlas
                    </span>
                  )}
                  {wsStatus === 'connecting' && (
                    <span className="text-yellow-400">🟡 Connecting...</span>
                  )}
                  {wsStatus === 'disconnected' && (
                    <span className="text-red-400">🔴 Disconnected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Active Devices ({connectedDevices.length})
            </div>
            {connectedDevices.length === 0 ? (
              <div className="text-sm text-gray-600 text-center py-4">
                No other devices found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {connectedDevices.map((device) => {
                  const isMe = device.deviceId === ownDeviceId;
                  const isExtension = device.clientType === 'extension';
                  return (
                    <div
                      key={device.deviceId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${isMe ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        {isExtension ? (
                          <Laptop className="w-4 h-4 text-green-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-blue-400" />
                        )}
                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-medium ${isMe ? 'text-white' : 'text-gray-300'}`}
                          >
                            {device.deviceName} {isMe && '(This Device)'}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                            {device.clientType}
                          </span>
                        </div>
                      </div>
                      {isExtension && !isMe && (
                        <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                          READY
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- Section: Keyboard Shortcuts --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Keyboard className="w-3.5 h-3.5" />
          Keyboard Shortcuts
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 p-5 space-y-3">
          <div className="grid grid-cols-[1fr,auto] gap-4 text-sm">
            <div className="text-gray-400">Command Palette</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + K
            </code>
            <div className="text-gray-400">Sync Notion</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + S
            </code>
            <div className="text-gray-400">Lock Screen</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + L
            </code>
            <div className="text-gray-400">Create New Task</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + N
            </code>
            <div className="text-gray-400">Open Action Panel</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + A
            </code>
            <div className="text-gray-400">Go To View</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              0 <span className="text-gray-500">// Home</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              1 <span className="text-gray-500">// WeeklyTask</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              2 <span className="text-gray-500">// Kanban</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              3 <span className="text-gray-500">// Calendar</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              4 <span className="text-gray-500">// Meeting</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              5 <span className="text-gray-500">// Review</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              6 <span className="text-gray-500">// Note</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              7 <span className="text-gray-500">// Notifications</span>
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
