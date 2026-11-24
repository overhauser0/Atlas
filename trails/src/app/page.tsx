'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ITEM_TAB_PRESETS,
  ItemTabPreset,
  Views,
  LifeItem,
  DiaryItem,
  TrailsAppSettings,
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
import {
  TrailsDesktopSidebar,
  TrailsMobileBottomNav,
  TrailsMoreSheet,
} from '@/components/layout/TrailsNavigation';
import DetailModal from '@/components/modal/DetailModal';
import DiaryModal from '@/components/modal/DiaryModal';
import SearchModal from '@/components/modal/SearchModal';
import DailyPhotoModal from '@/components/modal/DailyPhotoModal';
import { ToastProvider } from '@/components/ui/Toast';
import { atlasFetch } from '@atlas/shared/api';
import { getDateFullString } from '@atlas/shared/date';

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
  const [appSettings, setAppSettings] = useState<TrailsAppSettings>({
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
      <TrailsDesktopSidebar
        currentTab={currentTab}
        isCalendarGroupOpen={isCalendarGroupOpen}
        isPieceGroupOpen={isPieceGroupOpen}
        onToggleCalendarGroup={() => setIsCalendarGroupOpen((open) => !open)}
        onTogglePieceGroup={() => setIsPieceGroupOpen((open) => !open)}
        onTabChange={handleTabChange}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

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

        <TrailsMobileBottomNav
          currentTab={currentTab}
          isMoreSheetOpen={isMoreSheetOpen}
          onTabChange={handleTabChange}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenMoreSheet={() => setIsMoreSheetOpen(true)}
        />
      </div>

      {isMoreSheetOpen && (
        <TrailsMoreSheet
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onClose={() => setIsMoreSheetOpen(false)}
        />
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
