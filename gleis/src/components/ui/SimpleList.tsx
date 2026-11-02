import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Task } from '@/types';
import { getStatusColor } from '@/utils/miscellaneousUtils';
import { getDateShortString } from '@/utils/dateUtils';

interface SimpleListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function SimpleList({ tasks, onTaskClick }: SimpleListProps) {
  // タスクが空の場合の表示もコンポーネント側で巻き取る
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center p-6 text-sm text-gray-600 bg-black/20 rounded-xl border border-white/5">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => {
        const fkwList: string[] = (task as any).fkw || [];

        return (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="w-full flex items-center justify-between p-3 group rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
          >
            {/* 1. ステータスドット */}
            <div className="shrink-0 mr-3 flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${getStatusColor(task.status)}`}
              />
            </div>

            {/* 中央コンテンツ */}
            <div className="flex-1 min-w-0 pr-4 text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                  {task.title || 'Untitled'}
                </h4>

                {/* 2. FKW チップ表示 */}
                {fkwList.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                    {fkwList.map((kw, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400 bg-white/5 truncate max-w-20"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {task.note && (
                <p className="text-xs text-gray-500 truncate max-w-full">
                  {task.note}
                </p>
              )}
            </div>

            {/* 右側: 日付と矢印 */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-gray-600 group-hover:text-gray-400 transition-colors">
                {getDateShortString(task.start_date)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
