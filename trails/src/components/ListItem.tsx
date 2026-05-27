import { ChevronRight, Plane, BadgeCheck, Archive } from 'lucide-react';
import { LifeItem } from '@/types';

interface Props {
  item: LifeItem;
  onItemClick: () => void;
}

export default function ItemList({ item, onItemClick }: Props) {
  const getIcon = () => {
    if (item.status === 'Done')
      return <Archive className="w-5 h-5 text-gray-500" />;
    if (item.flags.includes('Travel'))
      return <Plane className="w-5 h-5 text-gray-500" />;
    return <BadgeCheck className="w-5 h-5 text-green-500" />;
  };

  return (
    <div
      onClick={onItemClick}
      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
        <div className="flex gap-2 mt-1">
          {item.fkw.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.date && (
          <span className="text-xs text-gray-400 font-medium">
            {item.date.slice(5, 10).replace('-', '/')}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );
}
