'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Cpu,
  Loader2,
  X,
  Copy,
  Check,
  Trash2,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import type { AppSettings } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { useToast } from '@/components/ui/Toast';
import MarkdownPreview from '@/components/ui/MarkdownPreview';

// ==========================================
// 1. Types
// ==========================================
export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
}

interface AiAgentViewProps {
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

interface ResponseState {
  content: string;
  agentName: string;
  isCharged: boolean;
}

// ==========================================
// 2. Main Component
// ==========================================
export default function AiAgentView({
  appSettings,
  setAppSettings,
  onSyncStart,
  onSyncEnd,
}: AiAgentViewProps) {
  const { addToast } = useToast();

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [isFetchingAgents, setIsFetchingAgents] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'prompt' | 'response' | null>(
    null,
  );

  const [responseObj, setResponseObj] = useState<ResponseState | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==========================================
  // Fetch Agents
  // ==========================================
  const fetchAgents = useCallback(async () => {
    try {
      const response = await atlasFetch('/ai/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || data);
    } catch (error) {
      console.error(error);
      addToast('エージェントの取得に失敗しました', 'alert');
    } finally {
      setIsFetchingAgents(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ==========================================
  // Handlers
  // ==========================================
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSending) return;

    const useChargedModel = appSettings.isChargedModel ?? false;
    setIsSending(true);
    onSyncStart?.();

    setSubmittedPrompt(trimmedPrompt);
    setResponseObj(null);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTop = 0;
    }

    try {
      const activeAgent = agents.find((a) => a.id === selectedAgentId);

      const response = await atlasFetch('/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: trimmedPrompt,
          agentId: selectedAgentId,
          is_charged_model: useChargedModel,
        }),
      });

      if (!response.ok) throw new Error('AI execution failed');

      const data = await response.json();

      setResponseObj({
        content: data.reply || data.content || '',
        agentName: activeAgent?.name || 'Atlas',
        isCharged: useChargedModel,
      });
    } catch (error) {
      console.error(error);
      setPrompt(trimmedPrompt);
      addToast('AIの実行に失敗しました', 'alert');
    } finally {
      setIsSending(false);
      onSyncEnd?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleClear = () => {
    setPrompt('');
    setSubmittedPrompt(null);
    setResponseObj(null);
    setCopiedTarget(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleCopyText = async (text: string, target: 'prompt' | 'response') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedTarget(null), 1500);
      addToast('クリップボードにコピーしました', 'info');
    } catch {
      addToast('コピーに失敗しました', 'alert');
    }
  };

  const toggleChargedModel = () => {
    setAppSettings((prev) => ({
      ...prev,
      isChargedModel: !prev.isChargedModel,
    }));
    addToast(
      !appSettings.isChargedModel
        ? '有料モデル (Charged API) に切り替えました'
        : '無料モデル (Standard API) に切り替えました',
      'info',
    );
  };

  const isCharged = appSettings.isChargedModel ?? false;
  const activeAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="flex flex-col h-full bg-black relative animate-fade-in overflow-hidden">
      {/* 1. Top Response Area */}
      <div
        ref={responseAreaRef}
        className="flex-1 min-h-0 overflow-y-auto noir-scrollbar px-4 sm:px-6 pt-5 pb-6"
      >
        {!submittedPrompt && !responseObj && !isSending ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2.5 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400/80 mb-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-300">
              Ready to execute.
            </p>
            <p className="text-xs text-gray-600 max-w-sm">
              1回完結モードで実行します（過去の会話履歴を送信しないためトークン消費を抑えます）
            </p>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col gap-5 w-full max-w-4xl mx-auto">
            {/* ユーザープロンプトバルーン */}
            {submittedPrompt && (
              <div className="flex flex-col items-end gap-1.5">
                <div className="max-w-[88%] sm:max-w-[80%] bg-white/10 border border-white/15 rounded-2xl rounded-br-sm px-4 py-3 text-sm sm:text-base text-gray-100 leading-relaxed whitespace-pre-wrap break-words shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                  {submittedPrompt}
                </div>
                <div className="flex items-center gap-2 pr-1">
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyText(submittedPrompt, 'prompt')
                    }
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-200 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/5"
                    title="プロンプトをコピー"
                  >
                    {copiedTarget === 'prompt' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">コピー済み</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>コピー</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* エージェントレスポンスバルーン */}
            {(isSending || responseObj) && (
              <div className="w-full bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                {/* バルーンヘッダー */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-500 truncate">
                      {responseObj?.agentName || activeAgent?.name || 'Atlas'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${
                        (responseObj?.isCharged ?? isCharged)
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      {(responseObj?.isCharged ?? isCharged)
                        ? 'Charged'
                        : 'Standard'}
                    </span>
                  </div>

                  {responseObj && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyText(responseObj.content, 'response')
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                        title="レスポンスをコピー"
                      >
                        {copiedTarget === 'response' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">コピー済み</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>コピー</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleClear}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="表示をクリア"
                        aria-label="表示をクリア"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* バルーン本文 */}
                <div className="px-4 sm:px-5 py-4 text-sm sm:text-base text-gray-200">
                  {isSending ? (
                    <div className="flex items-center gap-3 py-4 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span className="text-sm animate-pulse">
                        Generating response...
                      </span>
                    </div>
                  ) : (
                    responseObj && (
                      <div className="[&>div]:pb-0 [&>div>*:first-child]:mt-0">
                        <MarkdownPreview content={responseObj.content} />
                      </div>
                    )
                  )}
                </div>

                {/* 長文レスポンス向けのバルーン下部コピーバー */}
                {responseObj && responseObj.content.length > 300 && (
                  <div className="flex items-center justify-end px-4 py-2 border-t border-white/5 bg-white/[0.015]">
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyText(responseObj.content, 'response')
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="レスポンスをコピー"
                    >
                      {copiedTarget === 'response' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">コピー済み</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>レスポンスをコピー</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Bottom Input Composer */}
      <div className="shrink-0 px-4 pt-2 pb-4 z-20 relative border-t border-white/5 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col transition-all focus-within:border-white/20 focus-within:bg-white/[0.08] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')]"></div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="プロンプトを入力... (Cmd/Ctrl + Enter で送信)"
            className="w-full bg-transparent border-none text-gray-200 text-sm sm:text-base placeholder:text-gray-600 focus:outline-none resize-none px-4 pt-3.5 pb-2 min-h-14 noir-scrollbar relative z-10"
            rows={2}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1.5 border-t border-white/5 relative z-10 gap-2">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto noir-scrollbar pr-2">
              {/* 有料/無料モデルの切り替えトグルバッジ */}
              <button
                type="button"
                onClick={toggleChargedModel}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isCharged
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                }`}
                title="有料/無料モデル切り替え"
              >
                {isCharged ? (
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span>{isCharged ? 'Charged (有料)' : 'Standard (無料)'}</span>
              </button>

              <div className="h-4 w-px bg-white/10 shrink-0 mx-1" />

              {isFetchingAgents ? (
                <div className="text-xs text-gray-500 flex items-center gap-1 px-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading agents...
                </div>
              ) : (
                agents.map((agent) => {
                  const isActive = selectedAgentId === agent.id;
                  return (
                    <button
                      type="button"
                      key={agent.id}
                      onClick={() =>
                        setSelectedAgentId(isActive ? null : agent.id)
                      }
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      {agent.name}
                      {isActive && (
                        <X className="w-3 h-3 ml-1 opacity-70 hover:opacity-100" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!prompt.trim() || isSending}
              aria-label="送信"
              className={`shrink-0 ml-1 p-2.5 rounded-xl flex items-center justify-center transition-all ${
                !prompt.trim() || isSending
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                  : 'bg-amber-500 text-black hover:bg-amber-400 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-300/50'
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
