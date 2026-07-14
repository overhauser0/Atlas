'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  Archive,
  Plane,
  BookOpen,
  CalendarIcon,
  MoreHorizontal,
} from 'lucide-react';
import { AppTab, LifeItem, DiaryItem } from '@/types';

import HomeView from '@/components/HomeView';
import CalendarView from '@/components/CalendarView';
import BucketView from '@/components/BucketView';
import TravelView from '@/components/TravelView';
import ExploreView from '@/components/ExploreView';
import DetailModal from '@/components/DetailModal';
import ConfigModal from '@/components/ConfigModal';
import ViewHeader from '@/components/ViewHeader';
import AuthView from '@/components/AuthView';
import { usePieceSync } from '@/hooks/usePieceSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useDiarySync } from '@/hooks/useDiarySync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import DiaryModal from '@/components/DiaryModal';

export default function AppMain() {
  // ============================================================================
  // 1. States (状態管理)
  // ============================================================================

  // Auth & Settings (認証・設定)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appSettings, setAppSettings] = useState({
    showTaskInCal: false,
  });

  // Global UI & View (画面・メニュー状態)
  const [currentTab, setCurrentTab] = useState<AppTab>('Home');

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [activeRequests, setActiveRequests] = useState(0);
  const incrementRequest = () => setActiveRequests((prev) => prev + 1);
  const decrementRequest = () =>
    setActiveRequests((prev) => Math.max(0, prev - 1));

  // モーダル系
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [detailModalConfig, setDetailModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item: Partial<LifeItem> | null;
  }>({ isOpen: false, mode: 'create', item: null });

  const [diaryModalConfig, setDiaryModalConfig] = useState<{
    isOpen: boolean;
    diary: DiaryItem | null;
  }>({ isOpen: false, diary: null });

  // ============================================================================
  // 2. Custom Hooks (計算・フォーマット)
  // ============================================================================
  const {
    events,
    tasks,
    isPiecesLoading,
    lastSyncTime,
    fetchPieces,
    handleNotionSync,
  } = usePieceSync(isAuthenticated, incrementRequest, decrementRequest);

  const handleRefreshPieces = useCallback(() => {
    fetchPieces(true);
  }, [fetchPieces]);

  const { diaries, fetchDiaries, syncDiary } = useDiarySync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );
  const handleRefreshDiaries = useCallback(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  const { wsStatus, connectedDevices } = useAtlasWebSocket(
    handleRefreshPieces,
    handleRefreshDiaries,
  );

  const { googleEvents, fetchGoogleEvents } = useGoogleCalendar(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );

  // ============================================================================
  // 3. Effects (ライフサイクル・イベント監視)
  // ============================================================================

  // Auth Init
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // Moreメニューの外側をクリックしたときにメニューを閉じる処理
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  // 設定のロード・保存
  useEffect(() => {
    const saved = localStorage.getItem('trails_settings');
    if (saved) setAppSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('trails_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // ---------------- データ取得・同期 ----------------

  // Initial Data Fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    const isFirstTime = events.length === 0;
    fetchPieces(!isFirstTime);
    fetchDiaries();
    fetchGoogleEvents();
  }, [isAuthenticated, fetchPieces, fetchDiaries, fetchGoogleEvents]);

  // ============================================================================
  // 4. Handlers (イベント・UI操作関連)
  // ============================================================================

  const openDetailModal = useCallback((item: LifeItem) => {
    setDetailModalConfig({
      isOpen: true,
      mode: 'edit',
      item: item,
    });
  }, []);
  // FABクリック時のハンドラ
  const handleOpenCreate = useCallback((item?: Partial<LifeItem>) => {
    setDetailModalConfig({
      isOpen: true,
      mode: 'create',
      item: item || null,
    });
  }, []);
  const handleTabChange = (tab: AppTab) => {
    setCurrentTab(tab);
    setIsMoreOpen(false);
  };

  const handleDiaryClick = (diary: DiaryItem | null) => {
    setDiaryModalConfig({
      isOpen: true,
      diary,
    });
  };

  // ============================================================================
  // 5. Render (UI描画)
  // ============================================================================

  if (isAuthChecking) return <div className="h-screen bg-gray-100" />;
  if (!isAuthenticated)
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      {/* 1. 固定ヘッダー */}
      <ViewHeader
        title={currentTab}
        isSyncing={activeRequests > 0}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* 2. メインエリア */}
      <main className="flex-1 overflow-hidden relative">
        {currentTab === 'Home' && (
          <HomeView
            data={events}
            onNavigate={setCurrentTab}
            onItemClick={openDetailModal}
          />
        )}
        {currentTab === 'Calendar' && (
          <CalendarView
            appSettings={appSettings}
            data={events}
            task={tasks}
            diaries={diaries}
            googleEvents={googleEvents}
            onItemClick={openDetailModal}
            onDiaryClick={handleDiaryClick}
            onOpenCreate={(item) => handleOpenCreate(item)}
          />
        )}
        {currentTab === 'Bucket' && (
          <BucketView
            data={events.filter((i) => i.category?.includes('Bucket'))}
            onItemClick={openDetailModal}
            onOpenCreate={(item) => handleOpenCreate(item)}
          />
        )}
        {currentTab === 'Travel' && (
          <TravelView
            data={events.filter((i) => i.category?.includes('Travel'))}
            onItemClick={openDetailModal}
            onOpenCreate={handleOpenCreate}
          />
        )}
        {currentTab === 'Explore' && (
          <ExploreView
            data={events.filter((i) => i.category?.includes('Explore'))}
            onItemClick={openDetailModal}
            onOpenCreate={handleOpenCreate}
          />
        )}
      </main>

      {/* 3. ナビゲーションバー (固定) */}
      <div className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 z-40">
        <nav className="max-w-5xl mx-auto flex justify-around items-center px-4 pb-6 pt-3 md:pb-4 md:px-8">
          <NavButton
            tab="Home"
            current={currentTab}
            icon={<Compass />}
            onClick={setCurrentTab}
          />
          <NavButton
            tab="Calendar"
            current={currentTab}
            icon={<CalendarIcon />}
            onClick={setCurrentTab}
          />
          <NavButton
            tab="Bucket"
            current={currentTab}
            icon={<Archive />}
            onClick={setCurrentTab}
          />
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isMoreOpen
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">
                <MoreHorizontal />
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>

            {/* ポップアップメニュー */}
            {isMoreOpen && (
              <div className="absolute bottom-16 right-0 w-40 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => handleTabChange('Travel')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                    currentTab === 'Travel'
                      ? 'text-primary-600 bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  <span>Travel</span>
                </button>
                <button
                  onClick={() => handleTabChange('Explore')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-t border-gray-100 ${
                    currentTab === 'Explore'
                      ? 'text-primary-600 bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* モーダル系 */}
      <DetailModal
        isOpen={detailModalConfig.isOpen}
        mode={detailModalConfig.mode}
        item={detailModalConfig.item}
        onClose={() =>
          setDetailModalConfig({
            isOpen: false,
            mode: 'create',
            item: null,
          })
        }
      />
      <ConfigModal
        isOpen={isConfigOpen}
        appSettings={appSettings}
        onUpdateSettings={(s) => setAppSettings(s)}
        onClose={() => setIsConfigOpen(false)}
        onSync={() => {
          handleNotionSync(true);
          syncDiary();
          setIsConfigOpen(false);
        }}
        onLogout={() => {
          localStorage.removeItem('atlas_auth');
          setIsAuthenticated(false);
          setIsConfigOpen(false);
        }}
      />
      <DiaryModal
        isOpen={diaryModalConfig.isOpen}
        diary={diaryModalConfig.diary}
        onClose={() =>
          setDiaryModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}

function NavButton({
  tab,
  current,
  icon,
  onClick,
}: {
  tab: AppTab;
  current: AppTab;
  icon: React.ReactNode;
  onClick: (t: AppTab) => void;
}) {
  const isActive = current === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex flex-col items-center gap-1 ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      <span className="text-[10px] font-medium">{tab}</span>
    </button>
  );
}
