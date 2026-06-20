import React from 'react';

// Notion APIから返ってくるアイコンの型定義
export type NotionIconData = {
  type: 'emoji' | 'external' | 'file';
  emoji?: string;
  external?: { url: string };
  file?: { url: string };
} | null;

interface NoirNotionIconProps {
  icon: NotionIconData;
  className?: string; // 外側からサイズ(w-8 h-8など)を上書きできるようにする
}

export default function NoirNotionIcon({
  icon,
  className = 'w-8 h-8',
}: NoirNotionIconProps) {
  if (!icon) return null; // アイコンがない場合は何も表示しない

  const isEmoji = icon.type === 'emoji';
  const imageUrl =
    icon.type === 'external' ? icon.external?.url : icon.file?.url;

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.3)] shrink-0 transition-colors hover:bg-white/10 ${className}`}
    >
      {isEmoji ? (
        // 💡 パターン1: 絵文字の場合
        // カラフルさを少し抑えるために透明度を下げ、ドロップシャドウでガラスになじませる
        <span className="text-[1.1em] opacity-80 drop-shadow-md leading-none">
          {icon.emoji}
        </span>
      ) : (
        // 💡 パターン2: 画像URL（カスタムアイコン等）の場合
        // グレースケール化して彩度を抜き、Gleisの世界観に強制的に合わせる
        <img
          src={imageUrl}
          alt="Notion Icon"
          className="w-[60%] h-[60%] object-contain opacity-60 filter grayscale contrast-125 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
        />
      )}
    </div>
  );
}
