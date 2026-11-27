'use client';

import type { ReactNode } from 'react';
import {
  Compass,
  Archive,
  Plane,
  CheckSquare,
  Beer,
  Mountain,
  Lightbulb,
  LandPlot,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Search,
  Settings,
  Aperture,
  Newspaper,
  Wine,
  UsersRound,
  CalendarDays,
  Sparkles,
  Notebook,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { ItemTabPreset, Views } from '@/types';

const OVERVIEW_TABS = [
  { id: 'Home' as const, label: 'Home', icon: <Compass /> },
  { id: 'Review' as const, label: 'Year in Review', icon: <Sparkles /> },
];

const CALENDAR_TABS = [
  { id: 'Calendar' as const, label: 'Monthly', icon: <CalendarIcon /> },
  { id: 'Week' as const, label: 'Weekly', icon: <CalendarDays /> },
];

const PIECE_TABS: {
  id: ItemTabPreset;
  label: string;
  icon: ReactNode;
}[] = [
  { id: 'Task', label: 'Task', icon: <CheckSquare /> },
  { id: 'Bucket', label: 'Bucket', icon: <Archive /> },
  { id: 'Travel', label: 'Travel', icon: <Plane /> },
  { id: 'Drinking', label: 'Drinking', icon: <Beer /> },
  { id: 'Climbing', label: 'Climbing', icon: <Mountain /> },
  { id: 'R-Escape', label: 'R-Escape', icon: <Lightbulb /> },
  { id: 'Golf', label: 'Golf', icon: <LandPlot /> },
  { id: 'Article', label: 'Article', icon: <Newspaper /> },
  { id: 'Liqueur', label: 'Liqueur', icon: <Wine /> },
];

const LIBRARY_TABS = [
  { id: 'Sparks' as const, label: 'Sparks', icon: <Zap /> },
  { id: 'Diary' as const, label: 'Diary', icon: <Notebook /> },
  { id: 'People' as const, label: 'People', icon: <UsersRound /> },
  { id: 'Photo' as const, label: 'Immich', icon: <Aperture /> },
];

interface TrailsDesktopSidebarProps {
  currentTab: Views;
  sparksCount?: number;
  isCalendarGroupOpen: boolean;
  isPieceGroupOpen: boolean;
  onToggleCalendarGroup: () => void;
  onTogglePieceGroup: () => void;
  onTabChange: (tab: Views) => void;
  onOpenSearch: () => void;
}

export function TrailsDesktopSidebar({
  currentTab,
  sparksCount = 0,
  isCalendarGroupOpen,
  isPieceGroupOpen,
  onToggleCalendarGroup,
  onTogglePieceGroup,
  onTabChange,
  onOpenSearch,
}: TrailsDesktopSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 z-20">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shrink-0">
            <img
              src="/icon.png"
              alt="Trails Icon"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Trails
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors mb-5"
        >
          <Search className="w-5 h-5" />
          <span className="text-sm font-medium">Search...</span>
        </button>
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {OVERVIEW_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={currentTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>

        <SidebarGroup
          label="Calendar"
          isOpen={isCalendarGroupOpen}
          onToggle={onToggleCalendarGroup}
        >
          {CALENDAR_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={currentTab === tab.id}
              compact
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup
          label="Piece"
          isOpen={isPieceGroupOpen}
          onToggle={onTogglePieceGroup}
        >
          {PIECE_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={currentTab === tab.id}
              compact
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </SidebarGroup>

        <div className="border-t border-gray-100 pt-3 space-y-1">
          {LIBRARY_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              badge={
                tab.id === 'Sparks' && sparksCount > 0
                  ? String(sparksCount)
                  : undefined
              }
              isActive={currentTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <SidebarItem
          icon={<Settings />}
          label="Settings"
          isActive={currentTab === 'Settings'}
          onClick={() => onTabChange('Settings')}
        />
      </div>
    </aside>
  );
}

interface TrailsMobileNavProps {
  currentTab: Views;
  isMoreSheetOpen: boolean;
  onTabChange: (tab: Views) => void;
  onOpenSearch: () => void;
  onOpenMoreSheet: () => void;
}

export function TrailsMobileBottomNav({
  currentTab,
  isMoreSheetOpen,
  onTabChange,
  onOpenSearch,
  onOpenMoreSheet,
}: TrailsMobileNavProps) {
  return (
    <div className="md:hidden shrink-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-safe z-40">
      <nav className="grid grid-cols-4 items-center px-2 pt-2 pb-4">
        <MobileNavButton
          icon={<Search />}
          label="Search"
          isActive={false}
          onClick={onOpenSearch}
        />
        <MobileNavButton
          icon={<Compass />}
          label="Home"
          isActive={currentTab === 'Home'}
          onClick={() => onTabChange('Home')}
        />
        <MobileNavButton
          icon={<CalendarIcon />}
          label="Calendar"
          isActive={currentTab === 'Calendar' || currentTab === 'Week'}
          onClick={() => onTabChange('Calendar')}
        />
        <MobileNavButton
          icon={<MoreHorizontal />}
          label="More"
          isActive={isMoreSheetOpen}
          onClick={onOpenMoreSheet}
        />
      </nav>
    </div>
  );
}

interface TrailsMoreSheetProps {
  currentTab: Views;
  sparksCount?: number;
  onTabChange: (tab: Views) => void;
  onClose: () => void;
}

export function TrailsMoreSheet({
  currentTab,
  sparksCount = 0,
  onTabChange,
  onClose,
}: TrailsMoreSheetProps) {
  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-3xl pt-2 pb-8 px-5 animate-in slide-in-from-bottom-full duration-300 max-h-[88%] overflow-y-auto no-scrollbar space-y-5">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />

        <button
          type="button"
          onClick={() => onTabChange('Review')}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-colors ${
            currentTab === 'Review'
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-gray-50 border-gray-100 text-gray-800 active:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100/80 text-primary-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold leading-tight">Year in Review</p>
              <p className="text-[11px] text-gray-500">
                1年の振り返りダッシュボード
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
            Calendar
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CALENDAR_TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center justify-center gap-2.5 px-3 py-3 rounded-2xl text-sm font-bold transition-colors border ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 [&>svg]:w-full [&>svg]:h-full ${
                      isActive ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  >
                    {tab.icon}
                  </div>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
            Piece
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PIECE_TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-2xl border transition-colors ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 [&>svg]:w-full [&>svg]:h-full ${
                      isActive ? 'text-primary-600' : 'text-primary-500'
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-xs font-bold truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
            Library
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LIBRARY_TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              const badgeCount = tab.id === 'Sparks' ? sparksCount : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex items-center justify-center gap-2.5 px-3 py-3 rounded-2xl border transition-colors ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 [&>svg]:w-full [&>svg]:h-full ${
                      isActive
                        ? 'text-primary-600'
                        : tab.id === 'Sparks'
                          ? 'text-primary-500'
                          : 'text-gray-500'
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-xs font-bold">{tab.label}</span>
                  {badgeCount > 0 && (
                    <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onTabChange('Settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors font-bold text-sm ${
              currentTab === 'Settings'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <Settings className="w-5 h-5 text-gray-400" />
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarGroup({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
      {isOpen && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  badge,
  isActive,
  compact = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  isActive: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 rounded-xl text-sm font-bold transition-all ${
        compact ? 'px-3.5 py-2' : 'px-4 py-2.5'
      } ${
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`shrink-0 [&>svg]:w-full [&>svg]:h-full ${
            compact ? 'w-4 h-4' : 'w-5 h-5'
          } ${isActive ? 'text-primary-600' : 'text-gray-400'}`}
        >
          {icon}
        </div>
        <span className="truncate">{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 ${
        isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
