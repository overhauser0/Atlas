'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  ITEM_TAB_PRESETS,
  ItemTabPreset,
  Views,
  LifeItem,
  DiaryItem,
} from '@/types';

import { usePieceSync } from '@/hooks/usePieceSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useDiarySync } from '@/hooks/useDiarySync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import HomeTab from '@/components/tabs/HomeTab';
import YearReviewTab from '@/components/tabs/YearReviewTab';
import CalendarTab from '@/components/tabs/CalendarTab';
import WeekCalendarTab from '@/components/tabs/WeekCalendarTab';
import PhotoTab from '@/components/tabs/PhotoTab';
import DiaryTab from '@/components/tabs/DiaryTab';
import ItemTab, { ItemView } from '@/components/tabs/ItemTab';
import ConfigTab from '@/components/tabs/ConfigTab';
import PeopleTab from '@/components/tabs/PeopleTab';
import AuthTab from '@/components/tabs/AuthTab';
import DetailModal from '@/components/modal/DetailModal';
import DiaryModal from '@/components/modal/DiaryModal';
import SearchModal from '@/components/modal/SearchModal';
import DailyPhotoModal from '@/components/modal/DailyPhotoModal';
import { ToastProvider } from '@/components/ui/Toast';
import { atlasFetch } from '@atlas/shared/api';
import { getDateFullString } from '@atlas/shared/date';

// メニュー定義（役割別に整理）
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
  icon: React.ReactNode;
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
  { id: 'Diary' as const, label: 'Diary', icon: <Notebook /> },
  { id: 'People' as const, label: 'People', icon: <UsersRound /> },
  { id: 'Photo' as const, label: 'Immich', icon: <Aperture /> },
];

const DEFAULT_ITEM_TAB_VIEWS: Record<ItemTabPreset, ItemView> = {
  Task: 'List',
  Bucket: 'List',
  Travel: 'List',
  Drinking: 'List',
  Climbing: 'List',
  'R-Escape': 'List',
  Golf: 'List',
  Article: 'List',
  Liqueur: 'List',
};

const isItemView = (value: unknown): value is ItemView =>
  value === 'List' || value === 'Cal' || value === 'Stats';

function AppMain() {
  // ============================================================================
  // 1. States
  // ============================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appSettings, setAppSettings] = useState({
    showTaskInCal: true,
    showGcalInCal: true,
    itemTabViews: DEFAULT_ITEM_TAB_VIEWS,
  });

  const [currentTab, setCurrentTab] = useState<Views>('Home');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCalendarGroupOpen, setIsCalendarGroupOpen] = useState(true);
  const [isPieceGroupOpen, setIsPieceGroupOpen] = useState(true);

  const [activeRequests, setActiveRequests] = useState(0);
  const incrementRequest = () => setActiveRequests((prev) => prev + 1);
  const decrementRequest = () =>
    setActiveRequests((prev) => Math.max(0, prev - 1));

  const [detailModalConfig, setDetailModalConfig] = useState<{
    isOpen: boolean;
    item: Partial<LifeItem> | null;
    initialValues: Partial<LifeItem> | null;
  }>({ isOpen: false, item: null, initialValues: null });

  const [diaryModalConfig, setDiaryModalConfig] = useState<{
    isOpen: boolean;
    diary: DiaryItem | null;
  }>({ isOpen: false, diary: null });

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotoDate, setSelectedPhotoDate] = useState<string | null>(
    null,
  );

  // ============================================================================
  // 2. Custom Hooks
  // ============================================================================
  const { items, events, tasks, fetchPieces, handleNotionSync } = usePieceSync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );

  const handleRefreshPieces = useCallback(
    () => fetchPieces(true),
    [fetchPieces],
  );

  const { diaries, fetchDiaries } = useDiarySync(isAuthenticated);
  const handleRefreshDiaries = useCallback(() => {
    void fetchDiaries();
  }, [fetchDiaries]);

  useAtlasWebSocket(handleRefreshPieces, handleRefreshDiaries);

  const { googleEvents, fetchGoogleEvents } = useGoogleCalendar(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );

  // ============================================================================
  // 3. Effects
  // ============================================================================
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('trails_settings');
    if (saved) {
      const savedSettings = JSON.parse(saved);
      const savedItemTabViews = savedSettings.itemTabViews ?? {};
      const itemTabViews = { ...DEFAULT_ITEM_TAB_VIEWS };

      ITEM_TAB_PRESETS.forEach((preset) => {
        const savedView = savedItemTabViews[preset];
        if (isItemView(savedView)) itemTabViews[preset] = savedView;
      });

      setAppSettings((currentSettings) => ({
        ...currentSettings,
        ...savedSettings,
        itemTabViews,
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trails_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const isFirstTime = events.length === 0;
    fetchPieces(!isFirstTime);
    fetchGoogleEvents();
  }, [isAuthenticated, fetchPieces, fetchGoogleEvents]);

  // ============================================================================
  // 4. Handlers
  // ============================================================================
  const openDetailModal = useCallback((item: LifeItem) => {
    setDetailModalConfig({ isOpen: true, item: item, initialValues: null });
  }, []);

  const handleOpenCreate = useCallback(
    (initialValues?: Partial<LifeItem> | null) => {
      setDetailModalConfig({
        isOpen: true,
        item: null,
        initialValues: initialValues || null,
      });
    },
    [],
  );

  const handleItemTabViewChange = useCallback(
    (preset: ItemTabPreset, view: ItemView) => {
      setAppSettings((settings) => ({
        ...settings,
        itemTabViews: {
          ...settings.itemTabViews,
          [preset]: view,
        },
      }));
    },
    [],
  );

  const handleTabChange = (tab: Views) => {
    setCurrentTab(tab);
    setIsMoreSheetOpen(false);
    if (tab === 'Calendar' || tab === 'Week') {
      setIsCalendarGroupOpen(true);
    } else if (ITEM_TAB_PRESETS.includes(tab as ItemTabPreset)) {
      setIsPieceGroupOpen(true);
    }
  };

  const handleDiaryClick = (diary: DiaryItem | null) => {
    setDiaryModalConfig({ isOpen: true, diary });
  };

  const handleOpenTodayDiary = useCallback(async () => {
    const todayStr = getDateFullString(new Date(), 'hyphen');
    setIsMoreSheetOpen(false);
    let targetDiary = diaries.find((item) => item.date === todayStr) ?? null;

    if (!targetDiary) {
      try {
        const res = await atlasFetch(`/diaries/${todayStr}`);
        if (res.ok) {
          const json = await res.json();
          targetDiary = json.diary ?? null;
        }
      } catch (e) {
        console.error('Failed to fetch today diary', e);
      }
    }

    setDiaryModalConfig({
      isOpen: true,
      diary: targetDiary ?? {
        date: todayStr,
        rate: null,
        content: '',
        flag: false,
        piece_ids: [],
      },
    });
  }, [diaries]);

  const handleChangeDiaryDate = useCallback(
    async (date: string) => {
      let nextDiary = diaries.find((item) => item.date === date) ?? null;

      if (!nextDiary) {
        const res = await atlasFetch(`/diaries/${date}`);
        if (res.ok) {
          const json = await res.json();
          nextDiary = json.diary ?? null;
        } else if (res.status !== 404) {
          throw new Error(`Failed to fetch diary: ${res.status}`);
        }
      }

      setDiaryModalConfig((prev) => ({
        ...prev,
        diary: nextDiary ?? {
          date,
          rate: null,
          content: '',
          flag: false,
          piece_ids: [],
        },
      }));
    },
    [diaries],
  );

  const handleOpenDailyPhoto = (date: string) => {
    setSelectedPhotoDate(date);
    setIsPhotoModalOpen(true);
  };
  const handleCloseDailyPhoto = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhotoDate(null);
  };

  useKeyboardShortcuts({
    onOpenSearchModal: () => setIsSearchOpen(true),
  });

  // ============================================================================
  // 5. Render
  // ============================================================================
  if (isAuthChecking) return <div className="h-screen bg-gray-100" />;
  if (!isAuthenticated)
    return <AuthTab onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* ============================================================
          [PC版] 左サイドバー
          ============================================================ */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 z-20">
        <div className="p-6 pb-2">
          {/* ブランドアイコンとタイトル */}
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
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors mb-5"
          >
            <Search className="w-5 h-5" />
            <span className="text-sm font-medium">Search...</span>
          </button>
        </div>

        <nav className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto no-scrollbar">
          {/* Overview */}
          <div className="space-y-1">
            {OVERVIEW_TABS.map((tab) => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={currentTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              />
            ))}
          </div>

          {/* Calendar グループ */}
          <SidebarGroup
            label="Calendar"
            isOpen={isCalendarGroupOpen}
            onToggle={() => setIsCalendarGroupOpen((open) => !open)}
          >
            {CALENDAR_TABS.map((tab) => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={currentTab === tab.id}
                compact
                onClick={() => handleTabChange(tab.id)}
              />
            ))}
          </SidebarGroup>

          {/* Piece グループ */}
          <SidebarGroup
            label="Piece"
            isOpen={isPieceGroupOpen}
            onToggle={() => setIsPieceGroupOpen((open) => !open)}
          >
            {PIECE_TABS.map((tab) => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={currentTab === tab.id}
                compact
                onClick={() => handleTabChange(tab.id)}
              />
            ))}
          </SidebarGroup>

          <div className="border-t border-gray-100 pt-3 space-y-1">
            {LIBRARY_TABS.map((tab) => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={currentTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              />
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <SidebarItem
            icon={<Settings />}
            label="Settings"
            isActive={currentTab === 'Settings'}
            onClick={() => handleTabChange('Settings')}
          />
        </div>
      </aside>

      {/* ============================================================
          右メインコンテンツエリア
          ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'Home' && (
            <HomeTab
              events={events}
              tasks={tasks}
              onNavigate={handleTabChange}
              onItemClick={openDetailModal}
            />
          )}
          {currentTab === 'Review' && (
            <YearReviewTab
              items={items}
              onNavigate={handleTabChange}
              onItemClick={openDetailModal}
              onDiaryClick={handleDiaryClick}
              onOpenDailyPhoto={handleOpenDailyPhoto}
            />
          )}
          {currentTab === 'Calendar' && (
            <CalendarTab
              appSettings={appSettings}
              onUpdateSettings={setAppSettings}
              data={events}
              task={tasks}
              diaries={diaries}
              onDiaryMonthChange={fetchDiaries}
              googleEvents={googleEvents}
              onItemClick={openDetailModal}
              onDiaryClick={handleDiaryClick}
              onOpenCreate={handleOpenCreate}
              onOpenDairyPhoto={handleOpenDailyPhoto}
              isDetailModalOpen={detailModalConfig.isOpen}
              isDiaryModalOpen={diaryModalConfig.isOpen}
            />
          )}
          {currentTab === 'Week' && (
            <WeekCalendarTab
              events={events}
              tasks={tasks}
              googleEvents={googleEvents}
              showTasks={appSettings.showTaskInCal}
              showGoogleEvents={appSettings.showGcalInCal}
              onItemClick={openDetailModal}
            />
          )}
          {currentTab === 'Diary' && (
            <DiaryTab
              diaries={diaries}
              onDiaryMonthChange={fetchDiaries}
              onDiaryClick={handleDiaryClick}
              onOpenTodayDiary={() => void handleOpenTodayDiary()}
            />
          )}
          {currentTab === 'Photo' && (
            <PhotoTab onDateClick={handleOpenDailyPhoto} />
          )}
          {currentTab === 'People' && <PeopleTab />}
          {ITEM_TAB_PRESETS.includes(currentTab as ItemTabPreset) && (
            <ItemTab
              key={currentTab}
              preset={currentTab as ItemTabPreset}
              data={items}
              activeView={appSettings.itemTabViews[currentTab as ItemTabPreset]}
              onViewChange={handleItemTabViewChange}
              onItemClick={openDetailModal}
              onOpenCreate={handleOpenCreate}
            />
          )}
          {currentTab === 'Settings' && (
            <ConfigTab
              appSettings={appSettings}
              onUpdateSettings={setAppSettings}
              onSync={() => handleNotionSync(true)}
              onLogout={() => {
                localStorage.removeItem('atlas_auth');
                setIsAuthenticated(false);
              }}
            />
          )}
        </main>

        {/* ============================================================
            [スマホ版] ボトムナビゲーション（4枠: Search / Home / Calendar / More）
            ============================================================ */}
        <div className="md:hidden shrink-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-safe z-40">
          <nav className="grid grid-cols-4 items-center px-2 pt-2 pb-4">
            <MobileNavButton
              icon={<Search />}
              label="Search"
              isActive={false}
              onClick={() => setIsSearchOpen(true)}
            />
            <MobileNavButton
              icon={<Compass />}
              label="Home"
              isActive={currentTab === 'Home'}
              onClick={() => handleTabChange('Home')}
            />
            <MobileNavButton
              icon={<CalendarIcon />}
              label="Calendar"
              isActive={currentTab === 'Calendar' || currentTab === 'Week'}
              onClick={() => handleTabChange('Calendar')}
            />
            <MobileNavButton
              icon={<MoreHorizontal />}
              label="More"
              isActive={isMoreSheetOpen}
              onClick={() => setIsMoreSheetOpen(true)}
            />
          </nav>
        </div>
      </div>

      {/* ============================================================
          [スマホ版] More ボトムシート（カテゴリ別整理）
          ============================================================ */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMoreSheetOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl pt-2 pb-8 px-5 animate-in slide-in-from-bottom-full duration-300 max-h-[88%] overflow-y-auto no-scrollbar space-y-5">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />

            {/* Year in Review */}
            <button
              type="button"
              onClick={() => handleTabChange('Review')}
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
                  <p className="text-sm font-bold leading-tight">
                    Year in Review
                  </p>
                  <p className="text-[11px] text-gray-500">
                    1年の振り返りダッシュボード
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            {/* Calendar */}
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
                      onClick={() => handleTabChange(tab.id)}
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

            {/* Piece（3列タイルグリッド） */}
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
                      onClick={() => handleTabChange(tab.id)}
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

            {/* Diary / People / Immich */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
                Library
              </p>
              <div className="grid grid-cols-3 gap-2">
                {LIBRARY_TABS.map((tab) => {
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-2xl border transition-colors ${
                        isActive
                          ? 'bg-primary-50 border-primary-200 text-primary-700'
                          : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 [&>svg]:w-full [&>svg]:h-full ${
                          isActive ? 'text-primary-600' : 'text-gray-500'
                        }`}
                      >
                        {tab.icon}
                      </div>
                      <span className="text-xs font-bold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Settings */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleTabChange('Settings')}
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
      )}

      {/* ============================================================
          Modals
          ============================================================ */}
      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          items={items}
          googleEvents={googleEvents}
          onItemClick={openDetailModal}
        />
      )}

      <DetailModal
        isOpen={detailModalConfig.isOpen}
        item={detailModalConfig.item}
        initialValues={detailModalConfig.initialValues}
        onClose={() =>
          setDetailModalConfig({
            isOpen: false,
            item: null,
            initialValues: null,
          })
        }
      />
      <DiaryModal
        isOpen={diaryModalConfig.isOpen}
        diary={diaryModalConfig.diary}
        lifeItems={items.filter(
          (item) =>
            item.start_date?.slice(0, 10) === diaryModalConfig.diary?.date,
        )}
        onClose={() =>
          setDiaryModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
        onChangeDate={handleChangeDiaryDate}
        onSelectLifeItem={(item) => openDetailModal(item)}
      />
      <DailyPhotoModal
        isOpen={isPhotoModalOpen}
        date={selectedPhotoDate}
        onClose={handleCloseDailyPhoto}
      />
    </div>
  );
}

export default function AppPage() {
  return (
    <ToastProvider>
      <AppMain />
    </ToastProvider>
  );
}

// ============================================================================
// UI Components
// ============================================================================
function SidebarGroup({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
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
  icon: React.ReactNode;
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
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
