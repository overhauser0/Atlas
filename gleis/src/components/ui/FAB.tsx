import React from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

export default function FAB({
  onClick,
  icon,
  ariaLabel = 'Create new item',
}: FABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-neon rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.45)] hover:scale-105 active:scale-95 transition-transform z-40 border border-white/20"
    >
      {icon ?? <Plus className="w-8 h-8" />}
    </button>
  );
}
