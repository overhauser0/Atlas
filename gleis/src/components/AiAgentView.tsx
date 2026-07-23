'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Cpu, Loader2, X, Copy, Trash2 } from 'lucide-react';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/Toast';

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
}

// ==========================================
// 2. Main Component
// ==========================================
export default function AiAgentView({
  onSyncStart,
  onSyncEnd,
}: AiAgentViewProps) {
  const { addToast } = useToast();

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isFetchingAgents, setIsFetchingAgents] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [responseObj, setResponseObj] = useState<{
    content: string;
    agentName: string;
  } | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // ==========================================
  // Handlers
  // ==========================================
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isSending) return;

    setIsSending(true);
    onSyncStart?.();

    // 送信時は古いレスポンスをクリアしてローディング画面に切り替え
    setResponseObj(null);

    try {
      const activeAgent = agents.find((a) => a.id === selectedAgentId);

      const response = await atlasFetch('/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          agentId: selectedAgentId,
        }),
      });

      if (!response.ok) throw new Error('AI execution failed');

      const data = await response.json();

      setResponseObj({
        content: data.reply || data.content,
        agentName: activeAgent?.name || 'Atlas',
      });
    } catch (error) {
      console.error(error);
      addToast('AIの実行に失敗しました', 'alert');
    } finally {
      setIsSending(false);
      onSyncEnd?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setPrompt('');
    setResponseObj(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleCopy = async () => {
    if (!responseObj?.content) return;
    try {
      await navigator.clipboard.writeText(responseObj.content);
      addToast('クリップボードにコピーしました', 'info');
    } catch (err) {
      addToast('コピーに失敗しました', 'alert');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative animate-fade-in overflow-hidden">
      {/* 1. Top Input Balloon */}
      <div className="shrink-0 p-4 z-20 pb-2 relative">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col transition-all focus-within:border-white/20 focus-within:bg-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')]"></div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="プロンプトを入力... (Cmd/Ctrl + Enter で送信)"
            className="w-full bg-transparent border-none text-gray-200 text-base placeholder:text-gray-600 focus:outline-none resize-none px-4 pt-4 pb-2 min-h-[80px] noir-scrollbar relative z-10"
            rows={2}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-white/5 relative z-10">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto noir-scrollbar pr-4">
              {isFetchingAgents ? (
                <div className="text-xs text-gray-500 flex items-center gap-1 px-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading agents...
                </div>
              ) : (
                agents.map((agent) => {
                  const isActive = selectedAgentId === agent.id;
                  return (
                    <button
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
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSending}
              className={`shrink-0 ml-2 p-2.5 rounded-lg flex items-center justify-center transition-all ${
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

      {/* 2. Response Area (Flat & No Auto-Scroll) */}
      <div className="flex-1 overflow-y-auto noir-scrollbar px-4 sm:px-6 pb-28 pt-4">
        {!responseObj && !isSending ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 opacity-50">
            <Sparkles className="w-8 h-8" />
            <p className="text-sm">Ready to execute.</p>
          </div>
        ) : isSending ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin opacity-50" />
            <p className="text-sm animate-pulse">Generating response...</p>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col items-start w-full max-w-4xl mx-auto">
            {/* エージェント名（控えめに配置） */}
            <div className="flex items-center gap-1.5 mb-4 px-1 opacity-70">
              <Cpu className="w-3 h-3 text-amber-500" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-500">
                {responseObj?.agentName}
              </span>
            </div>

            {/* レスポンス本文（ベタ置きスタイル） */}
            <div className="w-full text-base leading-relaxed text-gray-200">
              <div className="whitespace-pre-wrap">{responseObj?.content}</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Action Buttons */}
      {responseObj && (
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 flex items-center gap-3 z-40 animate-slide-in-right">
          <button
            onClick={handleClear}
            className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            title="入力をクリア"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleCopy}
            className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform border border-amber-400/50"
            title="レスポンスをコピー"
          >
            <Copy className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
