// src/components/ui/AuthImage.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { atlasFetch } from '@/utils/api';

interface AuthImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function AuthImage({
  src,
  alt,
  className,
  ...props
}: AuthImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 画面内に入ったかどうかを監視するオブザーバー
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 一度見えたら監視を終了
        }
      },
      { rootMargin: '200px' }, // 画面に入る200px手前でフェッチ開始
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // 2. isVisible が true になったら画像を fetch
  useEffect(() => {
    if (!isVisible) return;

    let objectUrl: string | null = null;
    let isMounted = true;

    const fetchImage = async () => {
      try {
        const res = await atlasFetch(src);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) setImgSrc(objectUrl);
      } catch (error) {
        if (isMounted) setHasError(true);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, isVisible]);

  // コンテナ要素（ここで交差判定を行う）
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-zinc-800 text-slate-400">
          <svg
            className="w-6 h-6 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : !imgSrc ? (
        // 読み込み中のスケルトン
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-zinc-800" />
      ) : (
        // 読み込み完了後の画像
        <img
          src={imgSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
