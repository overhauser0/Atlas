import {
  ChevronRight,
  Leaf,
  Plane,
  BadgeCheck,
  Archive,
  Beer,
  LandPlot,
  Lightbulb,
  Mountain,
  LucideProps,
} from 'lucide-react';
import { LifeItem } from '@/types';

// アイコンのマッピング
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Plane,
  BadgeCheck,
  Archive,
  Beer,
  LandPlot,
  Lightbulb,
  Mountain,
  Leaf,
};

interface Props {
  item: LifeItem;
  icon?: string | undefined;
  iconClassName?: string; // アイコン本体の色など (ex: "text-blue-500")
  iconWrapperClassName?: string; // アイコン背景枠の色など (ex: "bg-blue-50")
  className?: string; // コンポーネント全体への追加クラス
  onItemClick: () => void;
}

export default function ListItem({
  item,
  icon,
  iconClassName,
  iconWrapperClassName = 'bg-gray-100', // デフォルト背景色
  className = '',
  onItemClick,
}: Props) {
  const iconName = icon ? icon : item.iconType;
  const IconComponent = ICON_MAP[iconName] || Leaf;

  const addIconClass = iconClassName
    ? iconClassName
    : item.status === 'Done'
      ? 'text-green-500'
      : 'text-gray-500';
  const displayIcon = <IconComponent className={`w-5 h-5 ${addIconClass}`} />;

  return (
    <div
      onClick={onItemClick}
      className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
    >
      {/* アイコンの背景枠に iconWrapperClassName を適用 */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconWrapperClassName}`}
      >
        {displayIcon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {item.fkw?.map((tag) => (
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
