'use client';

import { useState } from 'react';
import {
  Leaf,
  Settings,
  ChevronRight,
  Key,
  Utensils,
  Mountain,
  Compass,
  Archive,
  Plane,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import BucketModal from '@/components/BucketModal';
import { BucketItem } from '@/types';

// モックデータ
const DUMMY_DATA: BucketItem[] = [
  {
    id: '1',
    title: 'Must Not Do Prison Escape',
    location: 'SCRAP',
    type: 'Event',
    state: 'Todo',
    date: '2026-08-10',
    note: 'リアル脱出ゲームの新作。早めにチケットを確保しておくこと。',
    url: 'https://realdgame.jp/',
    imageUrl:
      'https://images.unsplash.com/photo-1512813117056-118f6fdf18cb?auto=format&fit=crop&w=800&q=80',
    tags: ['Event', 'Escape', 'Tokyo'],
    iconType: 'key',
  },
  {
    id: '2',
    title: 'Hakata Udon Establishments',
    location: 'Fukuoka',
    type: 'Food',
    state: 'Todo',
    date: '2026-08-12',
    note: '福岡に行ったら絶対に食べたい。柔らかい麺と、透き通った出汁が特徴。ごぼ天うどんがおすすめ。',
    url: 'https://tabelog.com/fukuoka/',
    imageUrl:
      'https://images.unsplash.com/photo-1618355284248-735c026dbab8?auto=format&fit=crop&w=800&q=80',
    tags: ['Food', 'Fukuoka', 'Trip'],
    iconType: 'food',
  },
  {
    id: '3',
    title: 'Montbell Winter Mountain Trekking',
    location: 'Outdoor Challenge',
    type: 'Outdoor',
    state: 'Idea',
    date: '',
    note: '冬山登山の装備リストを再確認する。',
    url: 'https://event.montbell.jp/',
    imageUrl:
      'https://images.unsplash.com/photo-1522210871320-1617bdff3e2e?auto=format&fit=crop&w=800&q=80',
    tags: ['Outdoor', 'Trekking', 'Winter'],
    iconType: 'mountain',
  },
];

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<BucketItem | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'key':
        return <Key className="w-5 h-5 text-blue-500" />;
      case 'food':
        return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'mountain':
        return <Mountain className="w-5 h-5 text-green-600" />;
      default:
        return <Leaf className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'key':
        return 'bg-blue-50';
      case 'food':
        return 'bg-orange-50';
      case 'mountain':
        return 'bg-green-50';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <div className="max-w-5xl mx-auto w-full p-5 md:p-8">
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Leaf className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Trails
              </h1>
            </div>
            <button className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center shadow-sm transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </header>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bucket List
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0 no-scrollbar">
              <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium shrink-0">
                All
              </button>
              <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-medium shrink-0 hover:bg-gray-50">
                Food
              </button>
              <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-medium shrink-0 hover:bg-gray-50">
                Event
              </button>
            </div>
          </div>

          <div className="bg-white border border-black/5 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col divide-y divide-gray-100 overflow-hidden">
            {DUMMY_DATA.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconBg(item.iconType)}`}
                >
                  {getIcon(item.iconType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {item.title}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 font-medium">
                      {item.location}
                    </span>
                    <span className="text-[10px] text-gray-400">•</span>
                    <span
                      className={`text-[10px] font-medium ${item.state === 'Todo' ? 'text-amber-600' : 'text-gray-500'}`}
                    >
                      {item.state}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <BucketModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 z-50">
        <nav className="max-w-5xl mx-auto flex justify-around items-center px-4 pb-6 pt-3 md:pb-4 md:px-8">
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <Compass className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-amber-600">
            <Archive className="w-6 h-6" />
            <span className="text-[10px] font-medium">Bucket</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <Plane className="w-6 h-6" />
            <span className="text-[10px] font-medium">Travel</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <BookOpen className="w-6 h-6" />
            <span className="text-[10px] font-medium">Explore</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Diary</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
