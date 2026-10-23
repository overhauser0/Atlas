'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  Archive,
  Plane,
  BookOpen,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { Views, LifeItem, DiaryItem } from '@/types';

import { usePieceSync } from '@/hooks/usePieceSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';
import { useDiarySync } from '@/hooks/useDiarySync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import HomeView from '@/components/views/HomeView';
import CalendarView from '@/components/views/CalendarView';
import BucketView from '@/components/views/BucketView';
import TravelView from '@/components/views/TravelView';
import ExploreView from '@/components/views/ExploreView';
import ConfigView from '@/components/views/ConfigView';
import AuthView from '@/components/views/AuthView';
import DetailModal from '@/components/modal/DetailModal';
import DiaryModal from '@/components/modal/DiaryModal';
import SearchModal from '@/components/modal/SearchModal';

// メニュー定義
const MAIN_TABS = [
  { id: 'Home', label: 'Home', icon: <Compass /> },
  { id: 'Calendar', label: 'Calendar', icon: <CalendarIcon /> },
] as const;

const EXTRA_TABS = [
  { id: 'Bucket', label: 'Bucket', icon: <Archive /> },
  { id: 'Travel', label: 'Travel', icon: <Plane /> },
  { id: 'Explore', label: 'Explore', icon: <BookOpen /> },
] as const;

export default function AppMain() {
  // ============================================================================
  // 1. States
  // ============================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [appSettings, setAppSettings] = useState({
    showTaskInCal: true,
    showGcalInCal: true,
  });

  const [currentTab, setCurrentTab] = useState<Views>('Home');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // ============================================================================
  // 2. Custom Hooks
  // ============================================================================
  const { events, tasks, fetchPieces, handleNotionSync } = usePieceSync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );

  const handleRefreshPieces = useCallback(
    () => fetchPieces(true),
    [fetchPieces],
  );

  const { diaries, fetchDiaries, syncDiary } = useDiarySync(
    isAuthenticated,
    incrementRequest,
    decrementRequest,
  );
  const handleRefreshDiaries = useCallback(
    () => fetchDiaries(),
    [fetchDiaries],
  );

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
      setAppSettings((currentSettings) => ({
        ...currentSettings,
        ...JSON.parse(saved),
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
    fetchDiaries();
    fetchGoogleEvents();
  }, [isAuthenticated, fetchPieces, fetchDiaries, fetchGoogleEvents]);

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

  const handleTabChange = (tab: Views) => {
    setCurrentTab(tab);
    setIsMoreSheetOpen(false);
  };

  const handleDiaryClick = (diary: DiaryItem | null) => {
    setDiaryModalConfig({ isOpen: true, diary });
  };

  useKeyboardShortcuts({
    onOpenSearchModal: () => setIsSearchOpen(true),
  });

  // ============================================================================
  // 5. Render
  // ============================================================================
  if (isAuthChecking) return <div className="h-screen bg-gray-100" />;
  if (!isAuthenticated)
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;

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
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors mb-6"
          >
            <Search className="w-5 h-5" />
            <span className="text-sm font-medium">Search...</span>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {MAIN_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={currentTab === tab.id}
              onClick={() => handleTabChange(tab.id as Views)}
            />
          ))}

          <div className="my-4 border-t border-gray-100" />

          {EXTRA_TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={currentTab === tab.id}
              onClick={() => handleTabChange(tab.id as Views)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <SidebarItem
            icon={<Settings />}
            label="Settings"
            isActive={false}
            onClick={() => handleTabChange('Settings')}
          />
        </div>
      </aside>

      {/* ============================================================
          右メインコンテンツエリア
          ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* メインビュー（スマホ版のヘッダーは削除されました） */}
        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'Home' && (
            <HomeView
              events={events}
              tasks={tasks}
              onNavigate={setCurrentTab}
              onItemClick={openDetailModal}
            />
          )}
          {currentTab === 'Calendar' && (
            <CalendarView
              appSettings={appSettings}
              onUpdateSettings={setAppSettings}
              data={events}
              task={tasks}
              diaries={diaries}
              googleEvents={googleEvents}
              onItemClick={openDetailModal}
              onDiaryClick={handleDiaryClick}
              onOpenCreate={handleOpenCreate}
            />
          )}
          {currentTab === 'Bucket' && (
            <BucketView
              data={events.filter((i) => i.category?.includes('Bucket'))}
              onItemClick={openDetailModal}
              onOpenCreate={handleOpenCreate}
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
          {currentTab === 'Settings' && (
            <ConfigView
              appSettings={appSettings}
              onUpdateSettings={setAppSettings}
              onSync={() => {
                handleNotionSync(true);
                syncDiary();
              }}
              onLogout={() => {
                localStorage.removeItem('atlas_auth');
                setIsAuthenticated(false);
              }}
            />
          )}
        </main>

        {/* ============================================================
            [スマホ版] ボトムナビゲーション
            ============================================================ */}
        <div className="md:hidden shrink-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-safe z-40">
          <nav className="flex justify-around items-center px-2 pt-2 pb-4">
            <MobileNavButton
              icon={<Search />}
              label="Search"
              isActive={false}
              onClick={() => setIsSearchOpen(true)}
            />
            {MAIN_TABS.map((tab) => (
              <MobileNavButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={currentTab === tab.id}
                onClick={() => handleTabChange(tab.id as Views)}
              />
            ))}
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
          [スマホ版] More ボトムシート
          ============================================================ */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMoreSheetOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl pt-2 pb-8 px-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex flex-col gap-1">
              {EXTRA_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as Views)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700 font-bold"
                >
                  <div className="w-6 h-6 text-primary-500 [&>svg]:w-full [&>svg]:h-full">
                    {tab.icon}
                  </div>
                  {tab.label}
                </button>
              ))}
              <div className="my-2 border-t border-gray-100" />
              <button
                onClick={() => handleTabChange('Settings')}
                className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700 font-bold"
              >
                <div className="w-6 h-6 text-gray-500 [&>svg]:w-full [&>svg]:h-full">
                  <Settings />
                </div>
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
          events={events}
          tasks={tasks}
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
        onClose={() =>
          setDiaryModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}

// ============================================================================
// UI Components
// ============================================================================
function SidebarItem({
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
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div
        className={`w-5 h-5 [&>svg]:w-full [&>svg]:h-full ${isActive ? 'text-primary-600' : 'text-gray-400'}`}
      >
        {icon}
      </div>
      {label}
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
      onClick={onClick}
      className={`flex flex-col items-center gap-1 w-16 ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
