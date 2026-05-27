import { ChevronRight, Key, Utensils, Mountain, Leaf } from 'lucide-react';
import { LifeItem } from '@/types';

interface Props {
  item: LifeItem;
  onClick: () => void;
}

export default function ListItem({ item, onClick }: Props) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'key':
        return <Key className="w-5 h-5 text-blue-500" />;
      case 'food':
        return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'mountain':
        return <Mountain className="w-5 h-5 text-green-600" />;
      default:
        return <Leaf className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'key':
        return 'bg-blue-50';
      case 'food':
        return 'bg-orange-50';
      case 'mountain':
        return 'bg-green-50';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconBg(item.iconType)}`}
      >
        {getIcon(item.iconType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
        <div className="flex gap-2 mt-1">
          <span className="text-[10px] text-gray-500 font-medium">
            {item.location}
          </span>
          <span className="text-[10px] text-gray-400">•</span>
          <span
            className={`text-[10px] font-medium ${item.state === 'Todo' ? 'text-amber-600' : 'text-gray-500'}`}
          >
            {item.state}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </div>
  );
}
