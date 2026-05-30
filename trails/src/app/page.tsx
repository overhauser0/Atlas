'use client';

import { useState, useEffect, useCallback } from 'react';
import { Compass, Archive, Plane, BookOpen, ImageIcon } from 'lucide-react';
import { AppTab, LifeItem } from '@/types';
import { markCategory } from '@/utils/grouping';

import HomeView from '@/components/HomeView';
import BucketView from '@/components/BucketView';
import TravelView from '@/components/TravelView';
import ExploreView from '@/components/ExploreView';
import DiaryView from '@/components/DiaryView';
import DetailModal from '@/components/DetailModal';
import ConfigModal from '@/components/ConfigModal';
import ViewHeader from '@/components/ViewHeader';
import AuthView from '@/components/AuthView';

export default function AppMain() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [items, setItems] = useState<LifeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('Home');
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>(
    'synced',
  );

  // モーダル系
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [detailModalConfig, setDetailModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item: LifeItem | null;
    defaultFlags: string[];
  }>({ isOpen: false, mode: 'create', item: null, defaultFlags: [] });

  // ビューごとのタイトルを定義
  const viewTitles: Record<AppTab, string> = {
    Home: 'Trails',
    Bucket: 'Bucket',
    Travel: 'Travel',
    Explore: 'Explore',
    Diary: 'Diary',
  };

  // ---------------- 認証チェック ----------------
  useEffect(() => {
    if (localStorage.getItem('atlas_auth') === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
  }, []);

  // ---------------- データ取得・同期 ----------------
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isAuthenticated) return;
      if (!isSilent) setIsLoading(true);

      try {
        const res = await fetch(
          '/api/v1/pieces?area=Life&excludeStatus=Canceled',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
            },
          },
        );

        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        // gleisのタスク型をLifeItemへ変換
        const mappedItems: LifeItem[] = data.pieces
          .filter((p: any) => p.type === 'Event')
          .map((p: any) => {
            return {
              id: p.id,
              title: p.title,
              status: p.status,
              date: p.date,
              area: p.area,
              type: p.type,
              topics: p.topics || [],
              flags: p.flags || [],
              fkw: p.fkw || [],
              note: p.note || '',
              url: p.url || '',
              prefs: p.prefs || [],
              imageUrl: p.imageUrl || '',
              iconType: p.flags?.includes('Food') ? 'food' : 'leaf',
              category: markCategory(p),
            };
          });

        setItems(mappedItems);
        setSyncStatus('synced');
      } catch (e) {
        console.error(e);
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      await fetch('/api/v1/pieces/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      await fetchData(true);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const openDetailModal = (item: LifeItem) => {
    // setSelectedItem(item);
    setDetailModalConfig({ isOpen: true, mode: 'edit', item: item });
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

  // ---------------- 描画 ----------------
  if (isAuthChecking) return <div className="h-screen bg-gray-100" />;
  if (!isAuthenticated)
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      {/* 1. 固定ヘッダー */}
      <ViewHeader
        title={viewTitles[currentTab]}
        syncStatus={syncStatus}
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
        onClose={() => setDetailModalConfig({ isOpen: false })}
        onUpdate={fetchData}
      />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSync={() => {
          handleSync(); // 既存の同期関数
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
