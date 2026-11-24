'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Pin,
  Trash2,
  SquareArrowUp,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  ArrowRight,
  PenLine,
  Eye,
  ListTodo,
  CheckSquare,
} from 'lucide-react';
import type { LocalNote } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { getChecklistStats, toggleChecklistLine } from '@atlas/shared/markdown';
import { useToast } from '@/components/ui/Toast';
import { IconButton } from '@/components/ui/IconButton';
import FAB from '@/components/ui/FAB';
import SearchBar from '@/components/ui/SearchBar';
import MarkdownPreview from '@/components/ui/MarkdownPreview';

// ==========================================
// 1. Types
// ==========================================

interface NoteViewProps {
  notes: LocalNote[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  selectedNote: LocalNote | null;
  onNoteOpened: () => void;
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  confirm: (
    title: string,
    message: React.ReactNode,
    confirmText?: string,
    cancelText?: string,
  ) => Promise<boolean>;
}

// ==========================================
// 2. Main Component
// ==========================================
export default function NoteView({
  notes,
  isLoading,
  onRefresh,
  selectedNote,
  onNoteOpened,
  onSyncStart,
  onSyncEnd,
  confirm,
}: NoteViewProps) {
  const { addToast } = useToast();

  const [activeNote, setActiveNote] = useState<LocalNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.title?.toLocaleLowerCase().includes(query) ||
        note.content?.toLocaleLowerCase().includes(query),
    );
  }, [notes, searchQuery]);

  useEffect(() => {
    if (selectedNote) {
      setActiveNote(selectedNote);
      onNoteOpened();
    }
  }, [selectedNote, onNoteOpened]);

  const handleCreateNew = async () => {
    try {
      onSyncStart?.();
      const response = await atlasFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Note' }),
      });
      if (!response.ok) throw new Error(`Failed to create note (${response.status})`);
      const newNote = await response.json();
      await onRefresh();
      setActiveNote(newNote);
    } catch (error) {
      addToast('ノートの作成に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  if (activeNote) {
    return (
      <EditorView
        key={activeNote.id}
        note={activeNote}
        onClose={() => {
          setActiveNote(null);
          onRefresh();
        }}
        addToast={addToast}
        confirm={confirm}
        onSyncStart={onSyncStart}
        onSyncEnd={onSyncEnd}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in relative">
      <div className="p-4 border-b border-white/5 bg-white/2 shrink-0">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search notes (title, content)..."
        />
      </div>

      <div className="flex-1 overflow-y-auto noir-scrollbar p-4">
        {isLoading ? (
          <div className="text-center text-gray-500 mt-10">Loading...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3">
            <FileText className="w-8 h-8 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No matching notes found.' : 'No notes found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredNotes.map((note) => {
              const checklist = getChecklistStats(note.content);
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  // border-l-[3px] と微妙な色付けで「付箋・メモ帳の背表紙」感を出す
                  className="w-full text-left p-4 rounded-xl border border-white/5 border-l-[3px] border-l-amber-500/40 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:border-l-amber-500/80 transition-all group flex gap-3 cursor-pointer relative shadow-sm"
                >
                  <div className="flex flex-1 items-center min-w-0 gap-4">
                    {note.is_pinned && (
                      <Pin className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                    )}
                    <div className="flex flex-col justify-center gap-1.5 min-w-0">
                      <h3 className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                        {note.title || 'Untitled'}
                      </h3>
                      {note.content && (
                        <p className="text-xs text-gray-500 truncate h-4 font-serif opacity-80">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center h-full gap-2 md:gap-4">
                    {checklist && (
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                          checklist.checked === checklist.total
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/10 bg-white/5 text-gray-400'
                        }`}
                        title="チェックリスト進捗"
                      >
                        <CheckSquare className="h-3 w-3" />
                        {checklist.checked}/{checklist.total}
                      </span>
                    )}
                    <div className="text-[10px] font-mono text-gray-600">
                      {note.updated_at
                        ? note.updated_at
                            .split('T')[0]
                            .substring(5)
                            .replace('-', '/')
                        : ''}
                    </div>
                    {note.url ? (
                      <IconButton
                        icon={<ExternalLink />}
                        href={note.url}
                        target="_blank"
                        title="リンクを開く"
                      />
                    ) : (
                      <div className="h-7 w-7" />
                    )}
                    <div className="p-2">
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-500/80 transition-all md:-translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FAB
        onClick={handleCreateNew}
        icon={<PenLine className="w-6 h-6 ml-0.5" />}
        ariaLabel="Create new note"
      />
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
  confirm,
  onSyncStart,
  onSyncEnd,
}: {
  note: LocalNote;
  onClose: () => void;
  addToast: (msg: string, type?: 'info' | 'alert') => void;
  confirm: NoteViewProps['confirm'];
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [url, setUrl] = useState(note.url);
  const [isPinned, setIsPinned] = useState(note.is_pinned);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>(() =>
    getChecklistStats(note.content) ? 'preview' : 'edit',
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const checklistStats = useMemo(() => getChecklistStats(content), [content]);

  const originalRef = useRef({
    title: note.title,
    content: note.content,
    url: note.url,
    is_pinned: note.is_pinned,
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(
    async (dataToSave: Partial<LocalNote>) => {
      try {
        await atlasFetch(`/notes/${note.id}`, {
          method: 'PATCH',
          body: JSON.stringify(dataToSave),
        });
        originalRef.current = { ...originalRef.current, ...dataToSave };
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    },
    [note.id],
  );

  useEffect(() => {
    const hasChanged =
      title !== originalRef.current.title ||
      content !== originalRef.current.content ||
      url !== originalRef.current.url ||
      isPinned !== originalRef.current.is_pinned;

    if (!hasChanged) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      triggerSave({ title, content, url, is_pinned: isPinned });
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [title, content, url, isPinned, triggerSave]);

  const handleBack = () => {
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
    const confirmed = await confirm(
      'ノートの削除',
      'このノートを削除しますか？この操作は取り消せません。',
      '削除する',
      'キャンセル',
    );
    if (!confirmed) return;

    onSyncStart?.();
    try {
      const res = await atlasFetch(`/notes/${note.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete note (${res.status})`);
      addToast('ノートを削除しました', 'info');
      onClose();
    } catch (e) {
      addToast('削除に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  const handlePromote = async (promoteType: 'Task' | 'Note') => {
    const confirmed = await confirm(
      'Notion へ昇格',
      <>
        Notion の [ {promoteType} ] として昇格させますか？
        <br />
        （昇格後、このローカルノートは削除されます）
      </>,
      '昇格する',
      'キャンセル',
    );
    if (!confirmed) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    onSyncStart?.();
    try {
      const payload = {
        title: title || 'Untitled Note',
        note: content || '',
        url: url || null,
        status: 'INBOX',
        type: promoteType,
        topics: ['Work'],
        fkw: [],
        source: 'NOTION',
      };

      const createRes = await atlasFetch('/pieces', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) throw new Error('Promotion failed');

      const deleteRes = await atlasFetch(`/notes/${note.id}`, {
        method: 'DELETE',
      });
      if (!deleteRes.ok) throw new Error('Failed to delete original note');

      addToast(`Notionへ昇格しました (${promoteType})`, 'info');
      onClose();
    } catch (e) {
      addToast('昇格に失敗しました', 'alert');
    } finally {
      onSyncEnd?.();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditorMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleChecklist = useCallback(
    (lineIndex: number) => {
      setContent((prev) => {
        const nextContent = toggleChecklistLine(prev, lineIndex);
        if (nextContent !== prev) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          void triggerSave({
            title,
            content: nextContent,
            url,
            is_pinned: isPinned,
          });
        }
        return nextContent;
      });
    },
    [title, url, isPinned, triggerSave],
  );

  const handleInsertChecklist = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) =>
        prev ? `${prev.trimEnd()}\n- [ ] ` : '- [ ] ',
      );
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const prefix = start > 0 && content[start - 1] !== '\n' ? '\n- [ ] ' : '- [ ] ';
    const next = `${content.slice(0, start)}${prefix}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-black animate-slide-in-right relative">
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/2 shrink-0 gap-2">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Edit / Preview 切替 */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 mr-1">
            <button
              type="button"
              onClick={() => setEditorMode('edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                editorMode === 'edit'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="編集モード"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                editorMode === 'preview'
                  ? 'bg-neon/20 text-neon'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Markdown プレビュー（チェックリスト操作可）"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {editorMode === 'edit' && (
            <button
              type="button"
              onClick={handleInsertChecklist}
              className="p-2 text-gray-400 hover:text-neon hover:bg-white/5 rounded-xl transition-colors"
              title="チェックリスト行を挿入 (- [ ])"
            >
              <ListTodo className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-xl transition-colors ${isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="ピン留め"
          >
            <Pin className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

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

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto noir-scrollbar px-4 sm:px-8 relative">
        <div className="flex items-center justify-between gap-3 mt-4 z-10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="w-full bg-transparent border-none text-2xl font-bold text-white focus:outline-none placeholder:text-gray-600"
          />
          {checklistStats && (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${
                checklistStats.checked === checklistStats.total
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-neon/30 bg-neon/10 text-neon'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {checklistStats.checked}/{checklistStats.total}
            </span>
          )}
        </div>

        {editorMode === 'edit' ? (
          /* CSSグラデーションで「ノートの罫線」を描画する */
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing... (- [ ] でチェックリスト作成)"
            style={{
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 25px, rgba(255,255,255,0.08) 25px, rgba(255,255,255,0.03) 26px)',
              lineHeight: '26px',
              backgroundAttachment: 'local',
            }}
            className="noir-scrollbar w-full flex-1 bg-transparent border-t border-white/10 text-gray-300 text-base focus:outline-none placeholder:text-gray-600 resize-none z-10 pt-0.5"
          />
        ) : (
          <div className="noir-scrollbar w-full flex-1 overflow-y-auto border-t border-white/10 pt-3 z-10">
            <MarkdownPreview
              content={content}
              onToggleChecklist={handleToggleChecklist}
            />
          </div>
        )}

        <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-2 focus-within:border-white/20 transition-colors z-10">
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
      </div>
    </div>
  );
}
