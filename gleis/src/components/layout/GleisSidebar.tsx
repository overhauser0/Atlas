'use client';

import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Columns2,
  Settings,
  Lock,
  Kanban,
  CalendarDays,
  ClipboardPenLine,
  BriefcaseBusiness,
  Terminal,
  FileText,
  Bot,
  ChartNoAxesCombined,
  FileStack,
} from 'lucide-react';
import type { ViewType } from '@/types';

type SidebarNavItem =
  | {
      kind: 'view';
      id: ViewType;
      icon: ComponentType<{ className?: string }>;
      label: string;
    }
  | {
      kind: 'agent';
      id: 'agent';
      icon: ComponentType<{ className?: string }>;
      label: string;
    };

const NAV_GROUPS: {
  label: string;
  items: SidebarNavItem[];
}[] = [
  {
    label: 'Tasks',
    items: [
      { kind: 'view', id: 'home', icon: LayoutDashboard, label: 'Home' },
      { kind: 'view', id: 'weekly', icon: Columns2, label: 'Weekly' },
      { kind: 'view', id: 'kanban', icon: Kanban, label: 'Kanban' },
      { kind: 'view', id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { kind: 'view', id: 'meeting', icon: BriefcaseBusiness, label: 'Meeting' },
      { kind: 'view', id: 'review', icon: ClipboardPenLine, label: 'Review' },
      { kind: 'view', id: 'note', icon: FileText, label: 'Note' },
      { kind: 'view', id: 'documents', icon: FileStack, label: 'Document' },
    ],
  },
  {
    label: 'Insights & AI',
    items: [
      { kind: 'agent', id: 'agent', icon: Bot, label: 'Agent' },
      { kind: 'view', id: 'stats', icon: ChartNoAxesCombined, label: 'Stats' },
    ],
  },
  {
    label: 'System',
    items: [{ kind: 'view', id: 'settings', icon: Settings, label: 'Settings' }],
  },
];

interface GleisSidebarProps {
  currentView: ViewType;
  isAgentOpen: boolean;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onViewChange: (view: ViewType) => void;
  onToggleAgent: () => void;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
}

export default function GleisSidebar({
  currentView,
  isAgentOpen,
  isMobileMenuOpen,
  onCloseMobileMenu,
  onViewChange,
  onToggleAgent,
  onOpenCommandPalette,
  onLogout,
}: GleisSidebarProps) {
  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-sm"
          onClick={onCloseMobileMenu}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[-120%]'
        } sm:relative sm:translate-x-0 group w-64 sm:w-20 md:w-64 sm:hover:w-64 noir-glass flex flex-col m-2 md:m-4 rounded-2xl p-3 md:p-4 shrink-0 overflow-x-hidden`}
      >
        <div className="flex items-center gap-4 mb-8 px-2 mt-2 shrink-0">
          <div className="w-8 h-8 bg-neon rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
            G
          </div>
          <div className="text-xl font-bold text-white whitespace-nowrap sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity duration-300">
            Gleis
          </div>
        </div>

        <nav className="flex flex-col gap-3 flex-1 overflow-y-auto overflow-x-hidden noir-scrollbar-hidden">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div
              key={group.label}
              className={
                groupIndex > 0
                  ? 'pt-3 border-t border-white/5 space-y-1'
                  : 'space-y-1'
              }
            >
              <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 whitespace-nowrap sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isAgentItem = item.kind === 'agent';
                const isActive = isAgentItem
                  ? isAgentOpen
                  : currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isAgentItem) {
                        onToggleAgent();
                        onCloseMobileMenu();
                      } else {
                        onViewChange(item.id);
                      }
                    }}
                    className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors ${
                      isActive
                        ? isAgentItem
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive
                          ? isAgentItem
                            ? 'text-amber-400'
                            : 'text-neon'
                          : ''
                      }`}
                    />
                    <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0 md:flex-row md:gap-0">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-neon transition-colors md:flex-1 md:justify-center md:gap-2"
          >
            <Terminal className="w-5 h-5 shrink-0" />
            <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium md:hidden">
              Command Palette
            </span>
            <span className="hidden md:inline font-medium">Cmd</span>
          </button>
          <div className="hidden md:block w-px self-stretch bg-white/10 shrink-0" />
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400 md:flex-1 md:justify-center md:gap-2"
          >
            <Lock className="w-5 h-5 shrink-0" />
            <span className="sm:opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity font-medium lg:hidden">
              Lock
            </span>
            <span className="hidden lg:inline font-medium">Lock</span>
          </button>
        </div>
      </aside>
    </>
  );
}
