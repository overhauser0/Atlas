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
} from 'lucide-react';
import { atlasFetch } from '@/utils/api';
import { Task } from '@/types';

interface FocusModalProps {
  isOpen: boolean;
  task: Partial<Task> | null;
  onClose: () => void;
  addToast: (msg: string, type?: 'info' | 'alert') => void;
}

type TimerMode = 'pomodoro' | 'stopwatch';

export default function FocusModal({
  isOpen,
  task,
  onClose,
  addToast,
}: FocusModalProps) {
  // --- タイマー＆モード状態 ---
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [seconds, setSeconds] = useState(1500); // 初期値: 25分 (1500秒)
  const [isActive, setIsActive] = useState(false);

  // --- メモ状態 ---
  const [note, setNote] = useState(task?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNote(task?.note || '');
  }, [task?.id, task?.note]);

  // モード切替（25分ポモドーロ ↔ カウントアップ）
  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setSeconds(newMode === 'pomodoro' ? 1500 : 0);
  };

  // タイマーカウント処理
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (mode === 'stopwatch') {
            return prev + 1;
          } else {
            // ポモドーロ カウントダウン
            if (prev <= 1) {
              setIsActive(false);
              addToast(
                'ポモドーロ（25分）が終了しました！小休憩に入りましょう ☕',
                'info',
              );
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode, addToast]);

  // mm:ss または hh:mm:ss にフォーマット
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // メモの自動保存 (デバウンス)
  const saveNote = useCallback(
    async (updatedNote: string) => {
      if (!task?.id) return;
      setIsSaving(true);
      try {
        await atlasFetch(`/pieces/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ note: updatedNote }),
        });
      } catch (e) {
        console.error('Failed to auto-save note:', e);
      } finally {
        setIsSaving(false);
      }
    },
    [task?.id],
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
      await atlasFetch(`/pieces/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' }),
      });
      addToast('タスクを完了にしました！お疲れ様でした！', 'info');
      onClose();
    } catch (e) {
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
                onClick={() => handleModeChange('pomodoro')}
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
                onClick={() => handleModeChange('stopwatch')}
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
              onClick={onClose}
              className="noir-icon-btn"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto py-4 sm:gap-7">
          <div className="flex flex-col items-center gap-4">
            <div className="text-7xl sm:text-8xl font-mono font-bold tracking-tight tabular-nums text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              {formatTime(seconds)}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
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
                onClick={() => {
                  setIsActive(false);
                  setSeconds(mode === 'pomodoro' ? 1500 : 0);
                }}
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
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors sm:text-left text-center py-2"
          >
            集中モードを終了（作業継続）
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
