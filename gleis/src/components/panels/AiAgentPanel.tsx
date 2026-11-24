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
  Bot,
  Maximize2,
  Minimize2,
  FilePlus2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import type { AppSettings, LocalNote } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { useToast } from '@/components/ui/Toast';
import MarkdownPreview from '@/components/ui/MarkdownPreview';
import {
  buildAgentNoteContent,
  buildDefaultAgentNoteTitle,
} from '@/utils/agentNote';

// ==========================================
// 1. Types
// ==========================================
export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
}

export interface AiAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  onSendingChange?: (isSending: boolean) => void;
  onNoteSaved: () => Promise<void> | void;
  onOpenNote: (note: LocalNote) => void;
}

interface ResponseState {
  content: string;
  agentName: string;
  isCharged: boolean;
}

// ==========================================
// 2. Main Component
// ==========================================
export default function AiAgentPanel({
  isOpen,
  onClose,
  appSettings,
  setAppSettings,
  onSyncStart,
  onSyncEnd,
  onSendingChange,
  onNoteSaved,
  onOpenNote,
}: AiAgentPanelProps) {
  const { addToast } = useToast();

  // Panel Layout State
  const [isExpanded, setIsExpanded] = useState(false);

  // Agent & Conversation State (パネルを閉じても保持)
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [isFetchingAgents, setIsFetchingAgents] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'prompt' | 'response' | null>(
    null,
  );
  const [responseObj, setResponseObj] = useState<ResponseState | null>(null);

  // Note Save State
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState<LocalNote | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);
  const noteTitleInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedAgentsRef = useRef(false);

  // ==========================================
  // Fetch Agents (初回オープン時に取得)
  // ==========================================
  const fetchAgents = useCallback(async () => {
    setIsFetchingAgents(true);
    try {
      const response = await atlasFetch('/ai/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || data);
      hasFetchedAgentsRef.current = true;
    } catch (error) {
      console.error(error);
      addToast('エージェントの取得に失敗しました', 'alert');
    } finally {
      setIsFetchingAgents(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isOpen && !hasFetchedAgentsRef.current) {
      void fetchAgents();
    }
  }, [isOpen, fetchAgents]);

  // 実行中状態を親へ通知（ヘッダーインジケーター用）
  useEffect(() => {
    onSendingChange?.(isSending);
  }, [isSending, onSendingChange]);

  // オープン時に入力欄へフォーカス
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (isSaveFormOpen) {
        noteTitleInputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, isSaveFormOpen]);

  // Noteタイトル入力フォーム展開時の自動フォーカス＆全選択
  useEffect(() => {
    if (!isSaveFormOpen) return;
    const timer = setTimeout(() => {
      noteTitleInputRef.current?.focus();
      noteTitleInputRef.current?.select();
    }, 20);
    return () => clearTimeout(timer);
  }, [isSaveFormOpen]);

  // Esc キーハンドリング（保存フォーム展開中はフォームのみ閉じる）
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isSaveFormOpen) {
        e.preventDefault();
        setIsSaveFormOpen(false);
        return;
      }
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaveFormOpen, onClose]);

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
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
    setSavedNote(null);
    setIsSaveFormOpen(false);
    setNoteTitle('');
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
    setIsSaveFormOpen(false);
    setNoteTitle('');
    setSavedNote(null);
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

  const handleOpenSaveForm = () => {
    if (!responseObj || savedNote) return;
    const defaultTitle = buildDefaultAgentNoteTitle(
      submittedPrompt || '',
      responseObj.agentName,
    );
    setNoteTitle(defaultTitle);
    setIsSaveFormOpen(true);
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveToNote = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!responseObj || isSavingNote) return;

    const trimmedTitle =
      noteTitle.trim() ||
      buildDefaultAgentNoteTitle(submittedPrompt || '', responseObj.agentName);
    const content = buildAgentNoteContent({
      prompt: submittedPrompt || '',
      response: responseObj.content,
      agentName: responseObj.agentName,
      isCharged: responseObj.isCharged,
    });

    setIsSavingNote(true);
    onSyncStart?.();
    try {
      const response = await atlasFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: trimmedTitle,
          content,
          url: '',
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save note (${response.status})`);
      }
      const createdNote = (await response.json()) as LocalNote;
      setSavedNote(createdNote);
      setIsSaveFormOpen(false);
      await onNoteSaved();
      addToast('Noteに保存しました', 'info');
    } catch (error) {
      console.error(error);
      addToast('Noteへの保存に失敗しました', 'alert');
    } finally {
      setIsSavingNote(false);
      onSyncEnd?.();
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
    <>
      {/* モバイル時のみ背景バックドロップを表示（PCはノンモーダルで背景操作可） */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`sm:hidden fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 右下フローティングウィンドウ本体（アンマウントせず状態を保持） */}
      <section
        role="dialog"
        aria-label="AI Agent"
        aria-hidden={!isOpen}
        className={`fixed z-[45] inset-x-2 bottom-2 h-[82dvh] sm:inset-x-auto sm:bottom-5 sm:right-5 flex flex-col overflow-hidden rounded-2xl noir-subglass border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.8)] transition-[opacity,transform,width,height,visibility] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isExpanded
            ? 'sm:w-[min(780px,calc(100vw-2.5rem))] sm:h-[min(84vh,860px)]'
            : 'sm:w-[460px] sm:max-w-[calc(100vw-2.5rem)] sm:h-[min(680px,calc(100vh-5.5rem))]'
        } ${
          isOpen
            ? 'visible opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'invisible opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* 1. Floating Panel Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-bold tracking-wide text-white truncate">
                AI Agent
              </h2>
              {activeAgent && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 truncate max-w-32">
                  {activeAgent.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isExpanded ? '通常サイズに戻す' : 'ワイド表示に拡大'}
              aria-label={isExpanded ? '通常サイズに戻す' : 'ワイド表示に拡大'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="閉じる (Esc)"
              aria-label="AI Agentパネルを閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Response Area */}
        <div
          ref={responseAreaRef}
          className="flex-1 min-h-0 overflow-y-auto noir-scrollbar px-4 py-4"
        >
          {!submittedPrompt && !responseObj && !isSending ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2.5 text-center px-4">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400/80 mb-1">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-300">
                Ready to execute.
              </p>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                1回完結モードで実行します。実行結果はそのまま Note に保存できます。
              </p>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col gap-4 w-full">
              {/* ユーザープロンプトバルーン */}
              {submittedPrompt && (
                <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[90%] bg-white/10 border border-white/15 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap break-words select-text shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 min-w-0">
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
                      <div className="flex items-center gap-1 shrink-0">
                        {savedNote ? (
                          <button
                            type="button"
                            onClick={() => onOpenNote(savedNote)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-colors"
                            title="保存したNoteを開く"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Noteで開く</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleOpenSaveForm}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              isSaveFormOpen
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-white/5 hover:bg-amber-500/15 border-white/10 hover:border-amber-500/30 text-gray-300 hover:text-amber-300'
                            }`}
                            title="Noteに保存"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Noteに保存</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyText(responseObj.content, 'response')
                          }
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                          title="レスポンスをコピー"
                        >
                          {copiedTarget === 'response' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">済</span>
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

                  {/* 軽量インライン Note タイトル編集・保存フォーム */}
                  {responseObj && isSaveFormOpen && !savedNote && (
                    <form
                      onSubmit={(e) => void handleSaveToNote(e)}
                      className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-500/20 bg-amber-500/[0.06]"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <input
                        ref={noteTitleInputRef}
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setIsSaveFormOpen(false);
                          }
                        }}
                        placeholder="ノートのタイトルを入力..."
                        disabled={isSavingNote}
                        className="flex-1 min-w-0 bg-black/50 border border-white/15 focus:border-amber-500/60 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-gray-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSavingNote}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition-colors"
                      >
                        {isSavingNote ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>保存</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSaveFormOpen(false)}
                        disabled={isSavingNote}
                        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="保存をキャンセル"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}

                  {/* バルーン本文 */}
                  <div className="px-4 py-3.5 text-sm text-gray-200 select-text">
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

                  {/* 長文レスポンス向けのバルーン下部アクションバー */}
                  {responseObj && responseObj.content.length > 300 && (
                    <div className="flex items-center justify-end gap-1.5 px-3.5 py-2 border-t border-white/5 bg-white/[0.015]">
                      {savedNote ? (
                        <button
                          type="button"
                          onClick={() => onOpenNote(savedNote)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>保存したNoteを開く</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenSaveForm}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
                        >
                          <FilePlus2 className="w-3.5 h-3.5" />
                          <span>Noteに保存</span>
                        </button>
                      )}
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

        {/* 3. Bottom Input Composer */}
        <div className="shrink-0 px-3 pt-2 pb-3 border-t border-white/10 bg-black/60">
          <div className="w-full bg-white/5 border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col transition-all focus-within:border-white/25 focus-within:bg-white/[0.08] relative overflow-hidden">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="プロンプトを入力... (Cmd/Ctrl + Enter で送信)"
              className="w-full bg-transparent border-none text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none resize-none px-3.5 pt-3 pb-2 min-h-12 noir-scrollbar"
              rows={2}
            />

            <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1.5 border-t border-white/5 gap-2">
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto noir-scrollbar-hidden pr-1">
                {/* 有料/無料モデルの切り替えトグルバッジ */}
                <button
                  type="button"
                  onClick={toggleChargedModel}
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                    isCharged
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                  }`}
                  title="有料/無料モデル切り替え"
                >
                  {isCharged ? (
                    <Zap className="w-3 h-3 text-sky-400" />
                  ) : (
                    <ShieldCheck className="w-3 h-3 text-gray-400" />
                  )}
                  <span>{isCharged ? 'Charged' : 'Standard'}</span>
                </button>

                <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5" />

                {isFetchingAgents ? (
                  <div className="text-[11px] text-gray-500 flex items-center gap-1 px-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
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
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                        }`}
                      >
                        <Cpu className="w-3 h-3" />
                        <span>{agent.name}</span>
                        {isActive && (
                          <X className="w-2.5 h-2.5 ml-0.5 opacity-70 hover:opacity-100" />
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
                className={`shrink-0 p-2 rounded-xl flex items-center justify-center transition-all ${
                  !prompt.trim() || isSending
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                    : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-300/50'
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
      </section>
    </>
  );
}
