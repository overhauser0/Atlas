'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Compass, Archive, Plane, BookOpen, ImageIcon } from 'lucide-react';
import { AppTab, Piece, LifeItem } from '@/types';

import HomeView from '@/components/HomeView';
import BucketView from '@/components/BucketView';
import TravelView from '@/components/TravelView';
import ExploreView from '@/components/ExploreView';
import DiaryView from '@/components/DiaryView';
import DetailModal from '@/components/DetailModal';
import ConfigModal from '@/components/ConfigModal';
import ViewHeader from '@/components/ViewHeader';
import AuthView from '@/components/AuthView';
import { usePieceSync } from '@/hooks/usePieceSync';
import { useAtlasWebSocket } from '@/hooks/useAtlasWebSocket';

export default function AppMain() {
  // ============================================================================
  // 1. States (状態管理)
  // ============================================================================

  // Auth & Settings (認証・設定)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Global UI & View (画面・メニュー状態)
  const [currentTab, setCurrentTab] = useState<AppTab>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>(
    'synced',
  );

  const [activeRequests, setActiveRequests] = useState(0);
  const incrementRequest = () => setActiveRequests((prev) => prev + 1);
  const decrementRequest = () =>
    setActiveRequests((prev) => Math.max(0, prev - 1));

  // モーダル系
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [detailModalConfig, setDetailModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item: LifeItem | null;
    defaultFlags: string[];
  }>({ isOpen: false, mode: 'create', item: null, defaultFlags: [] });

  // ============================================================================
  // 2. Custom Hooks (計算・フォーマット)
  // ============================================================================
  const {
    items,
    setItems,
    isPiecesLoading,
    lastSyncTime,
    fetchPieces,
    handleNotionSync,
  } = usePieceSync(isAuthenticated, incrementRequest, decrementRequest);

  const handleRefresh = useCallback(() => {
    fetchPieces(true);
  }, [fetchPieces]);
  const { wsStatus, connectedDevices } = useAtlasWebSocket(handleRefresh);

  // ============================================================================
  // 3. Handlers (イベント・UI操作関連)
  // ============================================================================

  const openDetailModal = (item: LifeItem) => {
    // setSelectedItem(item);
    setDetailModalConfig({
      isOpen: true,
      mode: 'edit',
      item: item,
      defaultFlags: [],
    });
  };
  // FABクリック時のハンドラ
  const handleOpenCreate = () => {
    const flags =
      currentTab === 'Bucket'
        ? ['Bucket']
        : currentTab === 'Travel'
          ? ['Travel']
          : ['Explore'];
    setDetailModalConfig({
      isOpen: true,
      mode: 'create',
      item: null,
      defaultFlags: flags,
    });
  };

  // ============================================================================
  // 4. Effects (ライフサイクル・イベント監視)
  // ============================================================================

  // Auth Init
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // ---------------- データ取得・同期 ----------------

  // fetchPiecesの最新版の参照を作る
  const fetchPiecesRef = useRef(fetchPieces);
  useEffect(() => {
    fetchPiecesRef.current = fetchPieces;
  }, [fetchPieces]);

  // Initial Data Fetch
  useEffect(() => {
    const isFirstTime = items.length === 0;
    fetchPieces(!isFirstTime);
  }, [fetchPieces, items.length]);

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

      {/* 2. スクロール可能なメインエリア */}
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {currentTab === 'Home' && (
          <HomeView
            data={items}
            onNavigate={setCurrentTab}
            onItemClick={openDetailModal}
          />
        )}
        {currentTab === 'Bucket' && (
          <BucketView
            data={items.filter((i) => i.category?.includes('Bucket'))}
            onItemClick={openDetailModal}
            onOpenCreate={handleOpenCreate}
          />
        )}
        {currentTab === 'Travel' && (
          <TravelView
            data={items.filter((i) => i.category?.includes('Travel'))}
            onItemClick={openDetailModal}
            onOpenCreate={handleOpenCreate}
          />
        )}
        {currentTab === 'Explore' && (
          <ExploreView
            data={items.filter((i) => i.category?.includes('Explore'))}
            onItemClick={openDetailModal}
            onOpenCreate={handleOpenCreate}
          />
        )}
        {currentTab === 'Diary' && <DiaryView />}
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
            tab="Bucket"
            current={currentTab}
            icon={<Archive />}
            onClick={setCurrentTab}
          />
          <NavButton
            tab="Travel"
            current={currentTab}
            icon={<Plane />}
            onClick={setCurrentTab}
          />
          <NavButton
            tab="Explore"
            current={currentTab}
            icon={<BookOpen />}
            onClick={setCurrentTab}
          />
          <NavButton
            tab="Diary"
            current={currentTab}
            icon={<ImageIcon />}
            onClick={setCurrentTab}
          />
        </nav>
      </div>

      {/* モーダル系 */}
      <DetailModal
        isOpen={detailModalConfig.isOpen}
        mode={detailModalConfig.mode}
        item={detailModalConfig.item}
        defaultFlags={detailModalConfig.defaultFlags}
        onClose={() =>
          setDetailModalConfig({
            isOpen: false,
            mode: 'create',
            item: null,
            defaultFlags: [],
          })
        }
        onUpdate={fetchPieces}
      />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSync={() => {
          handleNotionSync(true);
          setIsConfigOpen(false);
        }}
        onLogout={() => {
          localStorage.removeItem('atlas_auth');
          setIsAuthenticated(false);
          setIsConfigOpen(false);
        }}
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
