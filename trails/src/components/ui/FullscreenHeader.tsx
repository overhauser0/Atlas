'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface FullscreenHeaderProps {
  title: string;
  titleId?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export default function FullscreenHeader({
  title,
  titleId,
  subtitle,
  onBack,
  backLabel = '戻る',
  backDisabled = false,
  actions,
  className = '',
}: FullscreenHeaderProps) {
  return (
    <header
      className={`z-20 flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            aria-label={backLabel}
            className="trails-nav-icon-btn shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1
            id={titleId}
            className="truncate text-base font-bold text-gray-900 md:text-lg"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}
