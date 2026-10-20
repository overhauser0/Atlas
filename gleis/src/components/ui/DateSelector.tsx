import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface DateSelectorProps {
  currentDate: Date;
  onChange: (newDate: Date) => void;
}

export default function DateSelector({
  currentDate,
  onChange,
}: DateSelectorProps) {
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  };

  const handleToday = () => {
    onChange(new Date());
  };

  // 日付のフォーマット (例: "Thu, Aug 6, 2026")
  const dateStr = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const now = new Date();
  const isToday =
    currentDate.getFullYear() === now.getFullYear() &&
    currentDate.getMonth() === now.getMonth() &&
    currentDate.getDate() === now.getDate();

  return (
    <div className="shrink-0 flex items-center justify-between px-2 mx-auto w-full">
      {/* タイトル ＆ Today バッジ */}
      <div className="flex items-center gap-3">
        {!isToday && (
          <>
            <h2 className="text-xl font-bold text-gray-400 tracking-wide">
              {dateStr}
            </h2>
            <button
              onClick={handleToday}
              className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 transition-colors uppercase tracking-wider font-medium"
              title="Jump to today"
            >
              Today
            </button>
          </>
        )}
      </div>

      {/* 左右のページネーションボタン */}
      <div className="flex gap-2">
        <IconButton icon={<ChevronLeft />} onClick={handlePrev} />
        <IconButton icon={<ChevronRight />} onClick={handleNext} />
      </div>
    </div>
  );
}
