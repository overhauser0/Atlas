import { LifeItem } from '@/types';
import { getStatusColor } from '@/utils/utils';

interface CalendarItemEntry {
  id: string;
  title: string;
  status?: string;
  className: string;
  item: LifeItem;
}

interface CalendarItemProps {
  entries: CalendarItemEntry[];
  onItemClick: (item: LifeItem) => void;
}

export default function CalendarItem({
  entries,
  onItemClick,
}: CalendarItemProps) {
  return (
    <div className="flex flex-col gap-0.5 md:gap-1 overflow-y-auto no-scrollbar flex-1">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onItemClick(entry.item)}
          className={`w-full cursor-pointer text-left text-[10px] px-1 py-0.5 md:py-1 overflow-hidden whitespace-nowrap transition-all rounded-sm flex items-center gap-1 ${entry.className}`}
        >
          {entry.status !== undefined && (
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 flex-none rounded-full ${getStatusColor(entry.status)}`}
            />
          )}
          <span>{entry.title}</span>
        </button>
      ))}
    </div>
  );
}
