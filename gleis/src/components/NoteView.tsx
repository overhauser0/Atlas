'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  ArrowLeft,
  Pin,
  Trash2,
  SquareArrowUp,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/Toast';
import { getDateString } from '@/utils/dateUtils';

// ==========================================
// 1. Types
// ==========================================
export interface LocalNote {
  id: string;
  title: string;
  content: string;
  url: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteViewProps {
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
}

// ==========================================
// 2. Main Component
// ==========================================
export default function NoteView({ onSyncStart, onSyncEnd }: NoteViewProps) {
  const { addToast } = useToast();

  // --- State ---
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<LocalNote | null>(null);

  // --- Fetch Notes ---
  const fetchNotes = useCallback(async () => {
    try {
      const response = await atlasFetch('/notes');
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data.notes);
    } catch (error) {
      console.error(error);
      addToast('ノートの取得に失敗しました', 'alert');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // WebSocket等で外部から更新を検知できるように、windowにカスタムイベントを仕掛けておく
  useEffect(() => {
    const handleRefresh = () => fetchNotes();
    window.addEventListener('refresh_notes', handleRefresh);
    return () => window.removeEventListener('refresh_notes', handleRefresh);
  }, [fetchNotes]);

  // --- Actions ---
  const handleCreateNew = async () => {
    try {
      onSyncStart?.();
      const response = await atlasFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Note' }), // デフォルトタイトル
      });
      const newNote = await response.json();
      await fetchNotes();
      setActiveNote(newNote); // 作成後、すぐにエディタを開く
    } catch (error) {
      addToast('ノートの作成に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  // ==========================================
  // Render: Editor View (エディタ画面)
  // ==========================================
  if (activeNote) {
    return (
      <EditorView
        note={activeNote}
        onClose={() => {
          setActiveNote(null);
          fetchNotes(); // 戻る時にリストを最新化
        }}
        addToast={addToast}
        onSyncStart={onSyncStart}
        onSyncEnd={onSyncEnd}
      />
    );
  }

  // ==========================================
  // Render: List View (リスト画面)
  // ==========================================
  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          Quick Notes
        </h2>
        <button
          onClick={handleCreateNew}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-neon transition-colors"
          title="新規ノート作成"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto noir-scrollbar p-4">
        {isLoading ? (
          <div className="text-center text-gray-500 mt-10">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3">
            <FileText className="w-8 h-8 opacity-50" />
            <p className="text-sm">No notes found.</p>
          </div>
        ) : (
          <div className="space-y-2 pb-10">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setActiveNote(note)}
                className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group flex gap-3 cursor-pointer relative"
              >
                {/* 左側：タイトルと本文 */}
                <div className="flex flex-1 items-center min-w-0 gap-4">
                  {note.is_pinned && (
                    <Pin className="w-3.5 h-3.5 text-neon shrink-0" />
                  )}
                  <div className="flex flex-col justify-center gap-2">
                    <h3 className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                      {note.title || 'Untitled'}
                    </h3>
                    {note.content && (
                      <p className="text-xs text-gray-500 truncate h-4">
                        {note.content}
                      </p>
                    )}
                  </div>
                </div>

                {/* 右側：リンクボタン ＆ 日付 */}
                <div className="shrink-0 flex items-center h-full gap-2 md:gap-4">
                  <div className="text-[11px] font-mono text-gray-600">
                    {note.updated_at
                      ? note.updated_at
                          .split('T')[0]
                          .substring(5)
                          .replace('-', '/')
                      : ''}
                  </div>
                  {note.url ? (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="noir-icon-btn"
                      title="リンクを開く"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="h-7" />
                  )}

                  <div className="p-2">
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-neon transition-all md:-translate-x-2 group-hover:translate-x-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. Editor Sub-Component (フルスクリーンエディタ)
// ==========================================
function EditorView({
  note,
  onClose,
  addToast,
  onSyncStart,
  onSyncEnd,
}: {
  note: LocalNote;
  onClose: () => void;
  addToast: any;
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
}) {
  // エディタのローカル状態
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [url, setUrl] = useState(note.url);
  const [isPinned, setIsPinned] = useState(note.is_pinned);

  // 変更検知用（無駄なAPI呼び出しを防ぐため）
  const originalRef = useRef({
    title: note.title,
    content: note.content,
    url: note.url,
    is_pinned: note.is_pinned,
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Debounce Auto Save (自動保存ロジック) ---
  const triggerSave = useCallback(
    async (dataToSave: Partial<LocalNote>) => {
      try {
        await atlasFetch(`/notes/${note.id}`, {
          method: 'PATCH',
          body: JSON.stringify(dataToSave),
        });
        // 保存が成功したらオリジナル状態を更新
        originalRef.current = { ...originalRef.current, ...dataToSave };
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    },
    [note.id],
  );

  useEffect(() => {
    // 状態がオリジナルから変更されているかチェック
    const hasChanged =
      title !== originalRef.current.title ||
      content !== originalRef.current.content ||
      url !== originalRef.current.url ||
      isPinned !== originalRef.current.is_pinned;

    if (!hasChanged) return;

    // 変更があれば、1秒後に保存をスケジュール
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      triggerSave({ title, content, url, is_pinned: isPinned });
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [title, content, url, isPinned, triggerSave]);

  // --- Actions ---
  const handleBack = () => {
    // 戻るボタンを押した時、未保存の変更があれば即座に保存して戻る
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const hasChanged =
      title !== originalRef.current.title ||
      content !== originalRef.current.content ||
      url !== originalRef.current.url ||
      isPinned !== originalRef.current.is_pinned;

    if (hasChanged) {
      triggerSave({ title, content, url, is_pinned: isPinned });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm('このノートを削除しますか？')) return;
    onSyncStart?.();
    try {
      await atlasFetch(`/notes/${note.id}`, { method: 'DELETE' });
      addToast('ノートを削除しました', 'info');
      onClose(); // 削除したら戻る
    } catch (e) {
      addToast('削除に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  const handlePromote = async (promoteType: 'Task' | 'Note') => {
    if (
      !window.confirm(
        `Notionの [ ${promoteType} ] として昇格させますか？\n（昇格後、このローカルノートは削除されます）`,
      )
    )
      return;

    // 昇格前に現在の最新状態を反映させる
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    onSyncStart?.();
    try {
      // 1. Notion側に作成 (POST /pieces)
      const payload = {
        title: title || 'Untitled Note',
        note: content || '',
        url: url || null,
        status: 'INBOX',
        type: promoteType,
        topics: ['Work'], // _Area = Work 固定の仕様に基づく
        fkw: [],
        source: 'NOTION',
      };

      const createRes = await atlasFetch('/pieces', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) throw new Error('Promotion failed');

      // 2. 作成成功後、ローカルノートを削除
      await atlasFetch(`/notes/${note.id}`, { method: 'DELETE' });

      addToast(`Notionへ昇格しました (${promoteType})`, 'info');
      onClose();
    } catch (e) {
      addToast('昇格に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black animate-slide-in-right relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/2 shrink-0">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-xl transition-colors ${isPinned ? 'text-neon bg-neon/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="ピン留め"
          >
            <Pin className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Promote Dropdown Menu (簡易的な実装) */}
          <div className="group relative">
            <button className="p-2 text-gray-400 hover:text-neon hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1">
              <SquareArrowUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                Promote
              </span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 noir-subglass rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1.5 border border-white/10">
              <button
                onClick={() => handlePromote('Task')}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Task に昇格
              </button>
              <button
                onClick={() => handlePromote('Note')}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Note に昇格
              </button>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors ml-1"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content (没入感のあるプレーンなデザイン) */}
      <div className="flex-1 flex flex-col overflow-y-auto noir-scrollbar p-4 sm:p-8">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="w-full bg-transparent border-none text-2xl font-bold text-white focus:outline-none placeholder:text-gray-600 mb-4"
        />

        {/* URL Input (リンクがある場合のみアイコンを表示) */}
        <div className="flex items-center gap-3 mb-6 bg-white/5 border border-white/5 rounded-xl p-2 focus-within:border-white/20 transition-colors">
          <LinkIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="flex-1 bg-transparent border-none text-sm text-gray-300 focus:outline-none placeholder:text-gray-600"
          />
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
              title="リンクを開く"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Content Textarea (画面いっぱい) */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing..."
          className="w-full flex-1 bg-transparent border-none text-gray-300 text-base leading-relaxed focus:outline-none placeholder:text-gray-600 resize-none"
        />
      </div>
    </div>
  );
}
