import { ChevronRight, Leaf } from 'lucide-react';
import { LifeItem } from '@/types';

interface Props {
  item: LifeItem;
  icon?: React.ReactNode;
  onItemClick: () => void;
}

export default function ListItem({
  item,
  icon = <Leaf className="w-5 h-5 text-green-500" />,
  onItemClick,
}: Props) {
  return (
    <div
      onClick={onItemClick}
      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {item.fkw.map((tag) => (
            <span key={tag} className="trails-badge">
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
