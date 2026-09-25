// gleis/src/components/modals/ProjectModal.tsx
'use client';
import { useState, KeyboardEvent } from 'react';
import {
  X,
  FolderKanban,
  Plus,
  Trash2,
  Send,
  Calendar,
  ListChecks,
  Search,
  LinkIcon,
  ExternalLink,
  Maximize2,
  MessageSquare,
} from 'lucide-react';
import { Task } from '@/types';
import SimpleList from '../ui/SimpleList';
import { useToast } from '@/components/ui/Toast';
import { atlasFetch } from '@/utils/api';
import { getStatusColor } from '@/utils/miscellaneousUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentTask: Task | null;
  subTasks: Task[];
  allTasks: Task[];
  handleGleisLink: (url: string, callback?: Function) => void;
  openTaskModal: (task?: Partial<Task>) => void;
}

interface DraftTask {
  title: string;
  date: string;
}

export default function ProjectModal({
  isOpen,
  onClose,
  onSuccess,
  parentTask,
  subTasks,
  allTasks,
  handleGleisLink,
  openTaskModal,
}: Props) {
  const { addToast } = useToast();

  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLinkSelectorOpen, setIsLinkSelectorOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen || !parentTask) return null;

  const completedCount = subTasks.filter((t) => t.status === 'Done').length;
  const totalCount = subTasks.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      const today = new Date().toLocaleDateString('sv-SE');
      setDrafts([...drafts, { title: inputValue.trim(), date: today }]);
      setInputValue('');
    }
  };

  const removeDraft = (index: number) => {
    setDrafts(drafts.filter((_, i) => i !== index));
  };

  const updateDraftDate = (index: number, newDate: string) => {
    const newDrafts = [...drafts];
    newDrafts[index].date = newDate;
    setDrafts(newDrafts);
  };

  const handleBulkSubmit = async () => {
    if (drafts.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        pieces: drafts.map((draft) => ({
          title: draft.title,
          parent_id: parentTask.id,
          date: draft.date,
        })),
      };

      const response = await atlasFetch('/pieces/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDrafts([]);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create sub tasks:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkExistingTask = async (taskId: string) => {
    setIsLinking(true);
    try {
      const response = await atlasFetch(`/pieces/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ parent_id: parentTask.id }),
      });
      if (response.ok) {
        setIsLinkSelectorOpen(false);
        setLinkSearchQuery('');
        onSuccess();
        addToast('既存タスクをプロジェクトに追加しました', 'info');
      }
    } catch (error) {
      console.error('Failed to link task:', error);
      addToast('タスクの追加に失敗しました', 'alert');
    } finally {
      setIsLinking(false);
    }
  };

  const filteredLinkableTasks = allTasks.filter((t) => {
    if (t.id === parentTask.id || t.parent_id === parentTask.id) return false;
    if (!linkSearchQuery) return true;
    return t.title.toLowerCase().includes(linkSearchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-black/60 sticky top-0 z-10 shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2.5 rounded-xl bg-linear-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 text-violet-400 shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-4">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-0.5">
              Project Workspace
            </div>
            <h2 className="text-sm md:text-base font-bold text-zinc-100 truncate">
              {parentTask.title}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-all bg-black/50 border border-transparent hover:border-white/10 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 noir-scrollbar px-4 py-6 pb-32">
        {/* 1. 既存タスク一覧 */}
        <section className="overflow-y-auto space-y-2">
          <div className="relative bg-black/40 border border-white/5 rounded-2xl p-5 shadow-lg">
            {/* プロジェクトタスク自体を開くボタン */}
            <button
              onClick={() => openTaskModal(parentTask)}
              className="absolute top-4 right-4 px-3 py-1.5 text-zinc-400 hover:text-violet-300 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold"
              title="タスク詳細を開く"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Task</span>
            </button>

            <div className="flex flex-col gap-4 pr-24">
              {/* バッジ群 (ステータス, 日付, URL) */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* ステータス */}
                <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-lg shadow-inner">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(parentTask.status as any)}`}
                  />
                  <span className="text-xs font-medium text-zinc-300">
                    {parentTask.status}
                  </span>
                </div>

                {/* 日付 */}
                {parentTask.date && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-lg shadow-inner">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-mono mt-0.5">{parentTask.date}</span>
                  </div>
                )}

                {/* URLリンク */}
                {parentTask.url && (
                  <button
                    type="button"
                    onClick={() => handleGleisLink(parentTask.url)}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Link
                  </button>
                )}
              </div>

              {/* Note (メモ) */}
              {parentTask.note && (
                <div className="text-sm text-zinc-400 whitespace-pre-wrap flex gap-2.5 bg-white/2 p-3 rounded-xl border border-white/5">
                  <MessageSquare className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{parentTask.note}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between px-1">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-zinc-500" />
              Progress
            </h3>
            {totalCount > 0 && (
              <span className="text-xs font-mono text-zinc-400">
                {completedCount} / {totalCount} Done
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-linear-to-r from-violet-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* SimpleListコンポーネント */}
          <div className="bg-black/40 rounded-xl border border-white/5 p-1">
            <SimpleList
              tasks={subTasks}
              onTaskClick={(task) => {
                if (openTaskModal) openTaskModal(task);
              }}
            />
          </div>
        </section>

        {/* 2. 新規追加 UI (Staging Area) */}
        <section className="overflow-y-auto relative rounded-2xl bg-linear-to-b from-white/3 to-transparent border border-white/10 p-5 md:p-6 shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-linear-to-r from-transparent via-violet-500/50 to-transparent" />

          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Sub Tasks
          </h3>

          <button
            onClick={() => setIsLinkSelectorOpen(true)}
            className="text-xs font-medium text-zinc-400 hover:text-violet-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors border border-transparent hover:border-violet-500/20"
          >
            <Search className="w-3.5 h-3.5" />
            既存タスクを検索
          </button>

          {/* ドラフト（未保存）タスクのリスト */}
          {drafts.length > 0 && (
            <div className="mb-6 space-y-2.5">
              {drafts.map((draft, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between group py-2.5 px-3 bg-black/40 border border-white/5 rounded-lg hover:border-white/10 transition-colors animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <div className="flex items-center gap-3 text-sm text-blue-100 flex-1 min-w-0 pr-4">
                    <div className="w-1 h-4 rounded-full bg-violet-500/50 shrink-0" />
                    <span className="truncate">{draft.title}</span>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="relative flex items-center">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => updateDraftDate(idx, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-md py-1.5 pl-8 pr-2 text-xs md:text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => removeDraft(idx)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 高速入力フィールド */}
          <div className="relative group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="新しいタスクを入力して Enter..."
              className="w-full bg-black/60 border border-white/10 rounded-xl py-4 pl-4 pr-16 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/80 transition-all shadow-inner"
            />
            {inputValue.trim() !== '' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none animate-in fade-in">
                <span className="text-[10px] font-bold border border-blue-500/30 rounded px-2 py-1 bg-blue-500/10">
                  ENTER
                </span>
              </div>
            )}
          </div>

          {/* バルク送信ボタン */}
          {drafts.length > 0 && (
            <div className="flex justify-end mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={handleBulkSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-bold rounded-xl flex items-center gap-2.5 transition-all bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] disabled:opacity-50 disabled:shadow-none"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Save {drafts.length}{' '}
                    {drafts.length === 1 ? 'Task' : 'Tasks'}
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
      {/* 既存タスクリンク用モーダル (Command Palette) */}
      {isLinkSelectorOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsLinkSelectorOpen(false)}
        >
          <div
            className="noir-glass w-full max-w-md rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // 中身のクリックで閉じないように
          >
            {/* 検索ヘッダー */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/50">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder="既存のタスクを検索して追加..."
                className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-600"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsLinkSelectorOpen(false);
                }}
              />
              <button
                onClick={() => setIsLinkSelectorOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 検索結果リスト */}
            <div className="max-h-75 overflow-y-auto p-2 noir-scrollbar bg-black/20">
              {filteredLinkableTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">
                  タスクが見つかりません
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLinkableTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isLinking}
                      onClick={() => handleLinkExistingTask(t.id)}
                      className="w-full text-left p-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors group disabled:opacity-50"
                    >
                      <LinkIcon className="w-4 h-4 shrink-0 text-violet-500/50 group-hover:text-violet-400" />
                      <span className="truncate flex-1">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
