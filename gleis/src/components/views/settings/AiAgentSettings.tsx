'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Plus, Trash2, Save, X, Edit2, ShieldCheck } from 'lucide-react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';

export interface Agent {
  id: string;
  name: string;
  system_prompt: string | null;
}

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
}

export default function AiAgentSettings({
  appSettings,
  setAppSettings,
}: Props) {
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
    <>
      <section className="flex flex-col pb-4 gap-4 max-w-3xl">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <ShieldCheck className="w-3.5 h-3.5" />
          AI Models
        </h2>
        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
          <div className="pr-4">
            <div className="text-sm font-medium text-gray-200">
              Using charged model
            </div>
            <p className="text-xs text-gray-500 mt-1">
              When we treat Confidential Document.
            </p>
          </div>
          <ToggleSwitch
            checked={appSettings.isChargedModel ?? false}
            onChange={() =>
              setAppSettings((s: any) => ({
                ...s,
                isChargedModel: !s.isChargedModel,
              }))
            }
          />
        </div>
      </section>
      <section className="flex flex-col pb-4 gap-4 max-w-3xl">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Cpu className="w-3.5 h-3.5" />
          AI Agents
        </h2>

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
                  <div
                    key={agent.id}
                    className="flex flex-col transition-colors"
                  >
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
                        <div className="flex items-center gap-2 shrink-0 lg:opacity-0 group-hover:opacity-100 transition-opacity">
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

                    {/* 編集モード */}
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
                                setEditData({
                                  ...editData,
                                  name: e.target.value,
                                })
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

              {/* 新規作成エディタ */}
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
      </section>
    </>
  );
}
