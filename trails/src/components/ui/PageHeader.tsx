'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  titleId?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  actions?: React.ReactNode;
  nowrap?: boolean;
  className?: string;
}

export default function PageHeader({
  icon,
  title,
  titleId,
  subtitle,
  onBack,
  backLabel = '戻る',
  backDisabled = false,
  actions,
  nowrap = false,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`mb-6 flex shrink-0 items-center justify-between gap-x-3 gap-y-2 sm:gap-4 ${
        nowrap ? 'flex-nowrap' : 'flex-wrap'
      } ${className}`}
    >
      <div
        className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${
          nowrap ? 'flex-1' : ''
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            aria-label={backLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {icon && (
          <div
            className={`${
              onBack ? 'hidden sm:flex' : 'flex'
            } h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500 [&>svg]:h-5 [&>svg]:w-5 sm:h-12 sm:w-12 sm:rounded-2xl sm:[&>svg]:h-6 sm:[&>svg]:w-6`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1
            id={titleId}
            className="truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-gray-500 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div
          className={`flex shrink-0 items-center gap-1.5 sm:gap-2 ${
            nowrap ? 'flex-nowrap' : 'flex-wrap'
          }`}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
