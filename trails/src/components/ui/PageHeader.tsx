'use client';

import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`mb-6 flex shrink-0 flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-500 [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
