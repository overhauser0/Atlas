import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Flame,
  FileText,
  Timer,
  Clock,
  Minimize2,
} from 'lucide-react';
import { atlasFetch } from '@atlas/shared/api';
import { Task } from '@/types';
import {
  FocusTimerMode,
  formatFocusTime,
} from '@/hooks/useFocusSession';

interface FocusModalProps {
  isOpen: boolean;
  task: Partial<Task> | null;
  mode: FocusTimerMode;
  seconds: number;
  isActive: boolean;
  onChangeMode: (mode: FocusTimerMode) => void;
  onToggleRunning: () => void;
  onReset: () => void;
  onMinimize: () => void;
  onEnd: () => void;
  onCompleted?: () => void;
  addToast: (msg: string, type?: 'info' | 'alert') => void;
}

export default function FocusModal({
  isOpen,
  task,
  mode,
  seconds,
  isActive,
  onChangeMode,
  onToggleRunning,
  onReset,
  onMinimize,
  onEnd,
  onCompleted,
  addToast,
}: FocusModalProps) {
  const [note, setNote] = useState(task?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNote(task?.note || '');
  }, [task?.id, task?.note]);

  // メモの自動保存 (デバウンス)
  const saveNote = useCallback(
    async (updatedNote: string) => {
      if (!task?.id) return;
      setIsSaving(true);
      try {
        const res = await atlasFetch(`/pieces/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            note: updatedNote,
            ...(task.source ? { source: task.source } : {}),
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to auto-save note (${res.status})`);
        }
      } catch (e) {
        console.error('Failed to auto-save note:', e);
        addToast('メモの自動保存に失敗しました', 'alert');
      } finally {
        setIsSaving(false);
      }
    },
    [task?.id, task?.source, addToast],
  );

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);

    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(() => {
      saveNote(val);
    }, 1200);
  };

  // タスク完了処理
  const handleCompleteTask = async () => {
    if (!task?.id) return;
    try {
      const res = await atlasFetch(`/pieces/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Done',
          ...(task.source ? { source: task.source } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to complete task (${res.status})`);
      }
      addToast('タスクを完了にしました！お疲れ様でした！', 'info');
      onCompleted?.();
      onEnd();
    } catch (e) {
      console.error('Failed to complete task:', e);
      addToast('ステータスの更新に失敗しました', 'alert');
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in text-white">
      <div className="flex h-full min-h-0 flex-col p-4 sm:p-8 lg:p-12">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border border-amber-500/20">
              <Flame className="w-4 h-4" />
              <span>FOCUS MODE</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => onChangeMode('pomodoro')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'pomodoro'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>25m</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('stopwatch')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'stopwatch'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Stopwatch</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onMinimize}
              className="noir-icon-btn"
              title="最小化してタイマーを継続"
              aria-label="最小化してタイマーを継続"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onEnd}
              className="noir-icon-btn hover:text-red-400"
              title="集中モードを終了"
              aria-label="集中モードを終了"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto py-4 sm:gap-7">
          <div className="flex flex-col items-center gap-4">
            <div className="text-7xl sm:text-8xl font-mono font-bold tracking-tight tabular-nums text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              {formatFocusTime(seconds)}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleRunning}
                className={`flex items-center justify-center gap-2 min-w-32 px-7 py-3 rounded-xl font-bold transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                    : 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110'
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="noir-icon-btn p-3"
                title="リセット"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full max-w-4xl text-center space-y-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-100">
              {task.title}
            </h1>
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-xs font-bold text-violet-400 transition-colors hover:bg-violet-500/20 hover:text-violet-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>関連リンクを開く</span>
              </a>
            )}
          </div>

          <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 focus-within:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5" />
                Focus Notes
              </span>
              <span>{isSaving ? 'Saving...' : 'Saved'}</span>
            </div>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="作業中のメモや思考の整理をここに残せます..."
              rows={3}
              className="w-full bg-transparent border-none text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none resize-none noir-scrollbar"
            />
          </div>
        </main>

        <footer className="w-full max-w-4xl mx-auto flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={onMinimize}
            className="inline-flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
          >
            <Minimize2 className="w-4 h-4" />
            <span>最小化してバックグラウンドで継続</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteTask}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>タスクを完了して終了</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
