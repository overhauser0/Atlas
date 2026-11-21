import React from 'react';
import { CornerDownRight, ListChecks } from 'lucide-react';

interface TaskBadgesProps {
  hasParent?: boolean;
  subTaskProgress?: { total: number; done: number };
}

export default function TaskBadges({
  hasParent,
  subTaskProgress,
}: TaskBadgesProps) {
  const isAllDone =
    subTaskProgress &&
    subTaskProgress.total > 0 &&
    subTaskProgress.done === subTaskProgress.total;

  return (
    <>
      {hasParent && (
        <div
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border bg-violet-400/10 border-violet-400/20"
          title="Has Parent Project"
        >
          <CornerDownRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        </div>
      )}
      {subTaskProgress && (
        <div
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border ${
            isAllDone
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
          }`}
          title="Subtasks progress"
        >
          <ListChecks className="w-3 h-3" />
          <span>
            {subTaskProgress.done}/{subTaskProgress.total}
          </span>
        </div>
      )}
    </>
  );
}
