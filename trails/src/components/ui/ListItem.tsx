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
  Calendar,
  CheckSquare,
  LucideProps,
  Newspaper,
  Wine,
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
  Calendar,
  CheckSquare,
  Leaf,
  Newspaper,
  Wine,
};

interface Props {
  item: LifeItem;
  icon?: string | undefined;
  iconClassName?: string; // アイコン本体の色など (ex: "text-blue-500")
  iconWrapperClassName?: string; // アイコン背景枠の色など (ex: "bg-blue-50")
  className?: string; // コンポーネント全体への追加クラス
  description?: string;
  isActive?: boolean;
  slim?: boolean; // 追加：Modalやカード内向けのコンパクト表示
  onMouseEnter?: () => void;
  onItemClick: () => void;
}

export default function ListItem({
  item,
  icon,
  iconClassName,
  iconWrapperClassName = 'bg-gray-100',
  className = '',
  description,
  isActive = false,
  slim = false,
  onMouseEnter,
  onItemClick,
}: Props) {
  const iconName = icon ? icon : item.iconType;
  const IconComponent = ICON_MAP[iconName] || Leaf;

  const addIconClass = iconClassName
    ? iconClassName
    : item.status === 'Done'
      ? 'text-green-500'
      : 'text-gray-500';

  const displayIcon = (
    <IconComponent
      className={`${slim ? 'w-3.5 h-3.5' : 'w-5 h-5'} ${addIconClass}`}
    />
  );

  return (
    <div
      onClick={onItemClick}
      onMouseEnter={onMouseEnter}
      className={`${
        slim ? 'py-2 px-2.5 gap-2.5 rounded-xl' : 'p-4 gap-4'
      } flex items-center cursor-pointer transition-colors ${
        isActive ? 'bg-primary-50 hover:bg-primary-50' : 'hover:bg-gray-50'
      } ${className}`}
    >
      {/* アイコンの背景枠 */}
      <div
        className={`${
          slim ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'
        } flex items-center justify-center shrink-0 ${iconWrapperClassName}`}
      >
        {displayIcon}
      </div>

      {/* タイトル・メタ情報 */}
      <div className="flex-1 min-w-0">
        <p
          className={`${
            slim
              ? 'text-xs font-semibold text-gray-800'
              : 'text-sm font-bold text-gray-900'
          } truncate`}
        >
          {item.title}
        </p>

        {!slim && description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{description}</p>
        )}

        {!slim && item.fkw && item.fkw.length > 0 && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {item.fkw.map((tag) => (
              <span key={tag} className="trails-badge">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 日付・シェブロン */}
      <div className="flex items-center gap-2 shrink-0">
        {!slim && item.start_date && (
          <span className="text-xs text-gray-400 font-medium">
            {item.start_date.slice(5, 10).replace('-', '/')}
          </span>
        )}
        <ChevronRight
          className={`${slim ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-300`}
        />
      </div>
    </div>
  );
}
