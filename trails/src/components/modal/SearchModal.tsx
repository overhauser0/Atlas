'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { LifeItem } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import ListItem from '@/components/ui/ListItem';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LifeItem[];
  googleEvents: GoogleEvent[];
  onItemClick: (item: LifeItem) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  items,
  googleEvents,
  onItemClick,
}: SearchModalProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // ====== データの統合 ======
  const allItems = useMemo(() => {
    // GCalイベントをLifeItem型にマッピング
    const gcalMapped: any[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note,
      date: ev.date,
      type: 'Event',
      source: 'GCAL',
      iconType: 'Calendar',
      url: ev.url,
      status: 'Done',
      area: '',
      topics: [],
      flags: [],
      prefs: [],
      category: [],
    }));

    return [...items, ...gcalMapped];
  }, [items, googleEvents]);

  // ====== 検索フィルタリング ======
  const filteredItems = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();

    return allItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.note?.toLowerCase().includes(query) ||
        item.fkw?.some((tag: string) => tag.toLowerCase().includes(query)),
    );
  }, [search, allItems]);

  // ====== キーボードナビゲーション ======
  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (filteredItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredItems.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex(
            (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
          );
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredItems[activeIndex];
          if (selected) {
            onItemClick(selected);
            onClose();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, activeIndex, onClose, onItemClick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* 背景オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[70vh]">
        {/* 検索入力エリア */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 shrink-0">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items,events..."
            className="flex-1 bg-transparent border-none text-gray-900 focus:outline-none placeholder:text-gray-400 text-lg"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 結果表示エリア */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {filteredItems.length > 0 ? (
            <div className="flex flex-col">
              {filteredItems.map((item, index) => {
                const isActive = index === activeIndex;

                return (
                  <ListItem
                    key={item.id}
                    item={item}
                    description={item.note || undefined}
                    isActive={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="mx-2 rounded-xl"
                    onItemClick={() => {
                      onItemClick(item);
                      onClose();
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              {search.trim()
                ? 'No results found.'
                : 'Start typing to search...'}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-medium flex justify-between shrink-0">
          <span>↑↓ to navigate • Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
