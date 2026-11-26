'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  titleId?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  actions?: React.ReactNode;
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
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`mb-6 flex shrink-0 flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
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
            } h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-500 [&>svg]:h-6 [&>svg]:w-6`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1
            id={titleId}
            className="truncate text-2xl font-bold tracking-tight text-gray-900"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
