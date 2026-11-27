'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ITEM_TAB_PRESETS,
  ItemTabPreset,
  Views,
  LifeItem,
  DiaryItem,
  Person,
  SparkItem,
  TrailsAppSettings,
} from '@/types';

import { usePieceSync } from '@/hooks/usePieceSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useDiarySync } from '@/hooks/useDiarySync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePeopleSync } from '@/hooks/usePeopleSync';
import { useSparkSync } from '@/hooks/useSparkSync';

import HomeTab from '@/components/tabs/HomeTab';
import YearReviewTab from '@/components/tabs/YearReviewTab';
import CalendarTab from '@/components/tabs/CalendarTab';
import WeekCalendarTab from '@/components/tabs/WeekCalendarTab';
import PhotoTab from '@/components/tabs/PhotoTab';
import DiaryTab from '@/components/tabs/DiaryTab';
import SparksTab from '@/components/tabs/SparksTab';
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
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ATLAS_UNAUTHORIZED_EVENT, atlasFetch } from '@atlas/shared/api';
import { formatTimeFromIso, getDateFullString } from '@atlas/shared/date';

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
  const { addToast } = useToast();

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
  const [searchModalConfig, setSearchModalConfig] = useState<{
    isOpen: boolean;
    initialQuery: string;
  }>({ isOpen: false, initialQuery: '' });
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
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
    pendingSparkId: string | null;
  }>({ isOpen: false, item: null, initialValues: null, pendingSparkId: null });

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

  const {
    people,
    isLoading: isPeopleLoading,
    error: peopleError,
    fetchPeople,
  } = usePeopleSync(isAuthenticated);

  const {
    sparks,
    setSparks,
    isLoading: isSparksLoading,
    error: sparksError,
    fetchSparks,
  } = useSparkSync(isAuthenticated);

  useAtlasWebSocket(handleRefreshPieces, handleRefreshDiaries, isAuthenticated);

  const { googleEvents, fetchGoogleEvents } = useGoogleCalendar(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );

  // ============================================================================
  // 3. Effects
  // ============================================================================
  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as { authenticated?: boolean };
          setIsAuthenticated(Boolean(data.authenticated));
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsAuthChecking(false);
      }
    };
    void verifySession();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener(ATLAS_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener(ATLAS_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
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
  const openSearchModal = useCallback((initialQuery = '') => {
    setSearchModalConfig({ isOpen: true, initialQuery });
  }, []);

  const openDetailModal = useCallback((item: LifeItem) => {
    setDetailModalConfig({
      isOpen: true,
      item,
      initialValues: null,
      pendingSparkId: null,
    });
  }, []);

  const handleOpenCreate = useCallback(
    (initialValues?: Partial<LifeItem> | null) => {
      setDetailModalConfig({
        isOpen: true,
        item: null,
        initialValues: initialValues || null,
        pendingSparkId: null,
      });
    },
    [],
  );

  const handleCreatePieceFromSpark = useCallback((spark: SparkItem) => {
    const firstLine =
      spark.content
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean) ?? '';
    const suggestedTitle =
      firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
    const startTime = formatTimeFromIso(spark.recorded_at) || null;

    setDetailModalConfig({
      isOpen: true,
      item: null,
      initialValues: {
        title: suggestedTitle,
        start_date: spark.target_date,
        start_time: startTime,
        note: spark.content,
        type: 'Event',
      },
      pendingSparkId: spark.id,
    });
  }, []);

  const handleDetailModalSaved = useCallback(async () => {
    const sparkId = detailModalConfig.pendingSparkId;
    if (!sparkId) return;
    try {
      const res = await atlasFetch(`/sparks/${sparkId}/consume`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error(`Sparkの消化更新に失敗しました (${res.status})`);
      }
      setSparks((prev) => prev.filter((item) => item.id !== sparkId));
      addToast('Pieceを作成し、Sparkを消化しました');
    } catch (consumeError) {
      console.error('Failed to consume spark after piece creation:', consumeError);
      addToast(
        'Pieceを作成しましたが、Sparkの消化更新に失敗しました',
        'alert',
      );
    }
  }, [detailModalConfig.pendingSparkId, setSparks, addToast]);

  const handleOpenPerson = useCallback((personOrId: Person | string) => {
    const id = typeof personOrId === 'string' ? personOrId : personOrId.id;
    setSelectedPersonId(id);
    setCurrentTab('People');
    setIsMoreSheetOpen(false);
  }, []);

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

  const handleOpenDiaryByDate = useCallback(
    async (dateStr: string) => {
      setIsMoreSheetOpen(false);
      let targetDiary = diaries.find((item) => item.date === dateStr) ?? null;

      if (!targetDiary) {
        try {
          const res = await atlasFetch(`/diaries/${dateStr}`);
          if (res.ok) {
            const json = await res.json();
            targetDiary = json.diary ?? null;
          }
        } catch (e) {
          console.error('Failed to fetch diary', e);
        }
      }

      setDiaryModalConfig({
        isOpen: true,
        diary: targetDiary ?? {
          date: dateStr,
          rate: null,
          content: '',
          flag: false,
          piece_ids: [],
        },
      });
    },
    [diaries],
  );

  const handleOpenTodayDiary = useCallback(async () => {
    const todayStr = getDateFullString(new Date(), 'hyphen');
    await handleOpenDiaryByDate(todayStr);
  }, [handleOpenDiaryByDate]);

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
    onOpenSearchModal: () => openSearchModal(''),
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
        sparksCount={sparks.length}
        isCalendarGroupOpen={isCalendarGroupOpen}
        isPieceGroupOpen={isPieceGroupOpen}
        onToggleCalendarGroup={() => setIsCalendarGroupOpen((open) => !open)}
        onTogglePieceGroup={() => setIsPieceGroupOpen((open) => !open)}
        onTabChange={handleTabChange}
        onOpenSearch={() => openSearchModal('')}
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
              onTagClick={(tag) => openSearchModal(`#${tag}`)}
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
          {currentTab === 'Sparks' && (
            <SparksTab
              sparks={sparks}
              isLoading={isSparksLoading}
              error={sparksError}
              items={items}
              onRefresh={fetchSparks}
              onRemoveSparks={(ids) => {
                const idSet = new Set(ids);
                setSparks((prev) => prev.filter((item) => !idSet.has(item.id)));
              }}
              onCreatePieceFromSpark={handleCreatePieceFromSpark}
              onOpenDiaryDate={(date) => void handleOpenDiaryByDate(date)}
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
          {currentTab === 'People' && (
            <PeopleTab
              people={people}
              isLoading={isPeopleLoading}
              error={peopleError}
              onRefresh={fetchPeople}
              initialPersonId={selectedPersonId}
              onClearInitialPersonId={() => setSelectedPersonId(null)}
              items={items}
              onOpenPiece={openDetailModal}
            />
          )}
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
                void (async () => {
                  try {
                    await fetch('/api/auth/logout', {
                      method: 'POST',
                      credentials: 'same-origin',
                    });
                  } catch (e) {
                    console.warn('Logout request failed:', e);
                  }
                  if ('caches' in window) {
                    void caches.delete('api-data-cache');
                  }
                  setIsAuthenticated(false);
                })();
              }}
            />
          )}
        </main>

        <TrailsMobileBottomNav
          currentTab={currentTab}
          isMoreSheetOpen={isMoreSheetOpen}
          onTabChange={handleTabChange}
          onOpenSearch={() => openSearchModal('')}
          onOpenMoreSheet={() => setIsMoreSheetOpen(true)}
        />
      </div>

      {isMoreSheetOpen && (
        <TrailsMoreSheet
          currentTab={currentTab}
          sparksCount={sparks.length}
          onTabChange={handleTabChange}
          onClose={() => setIsMoreSheetOpen(false)}
        />
      )}

      {/* ============================================================
          Modals
          ============================================================ */}
      {searchModalConfig.isOpen && (
        <SearchModal
          isOpen={searchModalConfig.isOpen}
          initialQuery={searchModalConfig.initialQuery}
          onClose={() =>
            setSearchModalConfig({ isOpen: false, initialQuery: '' })
          }
          items={items}
          googleEvents={googleEvents}
          people={people}
          onItemClick={openDetailModal}
          onPersonClick={handleOpenPerson}
        />
      )}

      <DetailModal
        isOpen={detailModalConfig.isOpen}
        item={detailModalConfig.item}
        initialValues={detailModalConfig.initialValues}
        onSaved={handleDetailModalSaved}
        onPersonClick={(personId) => handleOpenPerson(personId)}
        onTagClick={(tag) => openSearchModal(`#${tag}`)}
        onClose={() =>
          setDetailModalConfig({
            isOpen: false,
            item: null,
            initialValues: null,
            pendingSparkId: null,
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
