// gleis/src/components/ui/IconButton.tsx

import React, { ReactElement, MouseEvent } from 'react';

interface IconButtonProps {
  icon: ReactElement;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string; // ボタン全体（外側の枠）の追加クラス
  iconClassName?: string; // アイコン自身（SVG）への完全上書きクラス
  title?: string;
  target?: '_blank' | '_self';
}

export function IconButton({
  icon,
  href,
  onClick,
  className = '',
  iconClassName,
  title,
  target = '_self',
}: IconButtonProps) {
  // 1. ボタン全体（外枠）のデフォルトスタイル
  const baseButtonClass =
    'p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0';
  const mergedButtonClass = `${baseButtonClass} ${className}`.trim();
  // 2. アイコンのスタイル決定
  // iconClassName が渡されていればそれをそのまま使い、渡されていなければ w-5 h-5 を使う
  const finalIconClass =
    iconClassName !== undefined ? iconClassName : 'w-5 h-5';

  // 3. 渡されたアイコン要素に finalIconClass を注入
  const clonedIcon = React.cloneElement(icon, {
    // もし使う側で <Icon className="text-red-500" /> のように書いていた場合は、それも保持しつつ結合する
    className: `${icon.props.className || ''} ${finalIconClass}`.trim(),
  });

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
  };

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className={mergedButtonClass}
        title={title}
      >
        {clonedIcon}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={mergedButtonClass}
      title={title}
    >
      {clonedIcon}
    </button>
  );
}
