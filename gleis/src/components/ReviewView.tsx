'use client';
import { useState, useEffect } from 'react';
import { Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import EditReviewModal from './EditReviewModal';
import { atlasFetch } from '@/utils/api';

// 月の変換 (202605 -> May 2026)
const formatMonthTitle = (ym: string) => {
  const y = parseInt(ym.substring(0, 4));
  const m = parseInt(ym.substring(4, 6)) - 1;
  return new Date(y, m).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const formatWeekTitle = (weekName: string) => weekName.split('-')[1];

// --- 判定ロジック ---
const today = new Date();
const todayYM = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}`;

export default function ReviewView({
  initialYearMonth,
}: {
  initialYearMonth: string;
}) {
  const [currentYM, setCurrentYM] = useState(initialYearMonth);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    isOpen: boolean;
    pageId: string;
    propName: string;
    title: string;
    value: string;
  }>({ isOpen: false, pageId: '', propName: '', title: '', value: '' });

  // --- 月移動ロジック ---
  const changeMonth = (delta: number) => {
    const y = parseInt(currentYM.substring(0, 4));
    const m = parseInt(currentYM.substring(4, 6)) - 1;
    const date = new Date(y, m + delta);
    const newYM = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    setCurrentYM(newYM);
  };

  // --- 判定ロジック ---
  const isCurrentMonth = (ym: string) => ym === todayYM;

  const isCurrentWeek = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return today >= start && today < end;
  };

  useEffect(() => {
    setLoading(true);
    atlasFetch(`/reviews?month=${currentYM}`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [currentYM]);

  // 保存処理
  const handleSave = async (newValue: string) => {
    await atlasFetch(`/reviews/${editing.pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ propertyName: editing.propName, text: newValue }),
    });
    // 保存後、再取得して画面を更新
    atlasFetch(`/reviews?month=${currentYM}`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .then(setData);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 w-full noir-scrollbar">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        {/* Navigation & Title */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
            isCurrentMonth(currentYM)
              ? 'bg-black/40 border-neon/50'
              : 'bg-black/40 border-white/5'
          }`}
        >
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:text-neon transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-white tracking-widest">
            {formatMonthTitle(currentYM)}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:text-neon transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Loading...
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-red-500 text-sm">
            No data found.
          </div>
        ) : (
          <>
            {/* 1. Monthly Card */}
            <section className="noir-glass p-6 rounded-2xl border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase">
                  Monthly Focus
                </h3>
              </div>
              <div className="space-y-4">
                <div className="group">
                  <h4 className="text-[10px] font-bold text-neon uppercase mb-1">
                    Business Goal
                  </h4>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-300">
                      {data.monthly.business || '-'}
                    </p>
                    <button
                      onClick={() =>
                        setEditing({
                          isOpen: true,
                          pageId: data.monthly.id,
                          propName: 'Business',
                          title: 'Business Goal',
                          value: data.monthly.business,
                        })
                      }
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="group">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Life Goal
                  </h4>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-300">
                      {data.monthly.life || '-'}
                    </p>
                    <button
                      onClick={() =>
                        setEditing({
                          isOpen: true,
                          pageId: data.monthly.id,
                          propName: 'Life',
                          title: 'Life Goal',
                          value: data.monthly.life,
                        })
                      }
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="group">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Summary
                  </h4>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-300 italic">
                      {data.monthly.summary || '-'}
                    </p>
                    <button
                      onClick={() =>
                        setEditing({
                          isOpen: true,
                          pageId: data.monthly.id,
                          propName: 'Summary',
                          title: 'Monthly Summary',
                          value: data.monthly.summary,
                        })
                      }
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-500 hover:text-neon"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Weekly Notebook */}
            <section className="noir-glass rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-white/2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">
                  Weekly Log
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {data.weekly.map((week: any) => {
                  const current = isCurrentWeek(week.startDate);
                  return (
                    <div
                      key={week.id}
                      className={`p-6 flex gap-4 transition-all group ${
                        current
                          ? 'bg-neon/4 border-l-2 border-l-neon'
                          : 'hover:bg-white/2'
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neon font-mono">
                            {formatWeekTitle(week.name)}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {week.startDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-300">
                            {week.summary || (
                              <span className="text-gray-800">...</span>
                            )}
                          </p>
                          <button
                            onClick={() =>
                              setEditing({
                                isOpen: true,
                                pageId: week.id,
                                propName: 'Summary',
                                title: 'Weekly Summary',
                                value: week.summary,
                              })
                            }
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
      <EditReviewModal
        isOpen={editing.isOpen}
        onClose={() => setEditing((prev) => ({ ...prev, isOpen: false }))}
        title={editing.title}
        initialValue={editing.value}
        onSave={handleSave}
      />
    </div>
  );
}
