'use client';
import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import EditReviewModal from '../modals/EditReviewModal';
import { atlasFetch } from '@/utils/api';
import MonthSelector from '../ui/MonthSelector';

const formatWeekTitle = (weekName: string) => weekName.split('-')[1];

const today = new Date();

export default function ReviewView() {
  const [targetDate, setTargetDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    isOpen: boolean;
    pageId: string;
    propName: string;
    title: string;
    value: string;
  }>({ isOpen: false, pageId: '', propName: '', title: '', value: '' });

  const isCurrentWeek = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return today >= start && today < end;
  };

  useEffect(() => {
    const targetYM = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
    setLoading(true);
    atlasFetch(`/reviews?month=${targetYM}`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [targetDate]);

  // 保存処理
  const handleSave = async (newValue: string) => {
    await atlasFetch(`/reviews/${editing.pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ propertyName: editing.propName, text: newValue }),
    });
    // 保存後、再取得して画面を更新
    const targetYM = `${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
    atlasFetch(`/reviews?month=${targetYM}`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .then(setData);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="shrink-0 flex items-center justify-between mb-6 px-2 mx-auto w-full">
        <MonthSelector currentDate={targetDate} onChange={setTargetDate} />
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto noir-scrollbar w-full">
        <div className="p-4 md:p-6 space-y-6">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Loading...
            </div>
          ) : !data ? (
            <div className="p-8 text-center text-red-500 text-sm">
              No data found.
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* 2. 左ペイン (メインコンテンツ: Monthly & Weekly) */}
              <div className="flex-1 w-full space-y-6">
                {/* Monthly Focus */}
                <section className="noir-glass rounded-2xl border border-white/10">
                  <div className="px-6 py-4 border-b border-white/10 bg-white/2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase">
                      Monthly Focus
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {/* Business Goal */}
                    <div className="p-6 flex gap-4 transition-all group hover:bg-white/2">
                      <div className="flex-1 space-y-1">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase">
                          Business Goal
                        </h4>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-300">
                            {data.monthly?.business || '-'}
                          </p>
                          <button
                            onClick={() =>
                              setEditing({
                                isOpen: true,
                                pageId: data.monthly.id,
                                propName: 'Business',
                                title: 'Business Goal',
                                value: data.monthly?.business || '',
                              })
                            }
                            aria-label="Edit Business Goal"
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Life Goal */}
                    <div className="p-6 flex gap-4 transition-all group hover:bg-white/2">
                      <div className="flex-1 space-y-1">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase">
                          Life Goal
                        </h4>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-300">
                            {data.monthly?.life || '-'}
                          </p>
                          <button
                            onClick={() =>
                              setEditing({
                                isOpen: true,
                                pageId: data.monthly.id,
                                propName: 'Life',
                                title: 'Life Goal',
                                value: data.monthly?.life || '',
                              })
                            }
                            aria-label="Edit Life Goal"
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-6 flex gap-4 transition-all group hover:bg-white/2">
                      <div className="flex-1 space-y-1">
                        <h4 className="text-[10px] font-bold text-neon uppercase">
                          Summary
                        </h4>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-300 italic">
                            {data.monthly?.summary || '-'}
                          </p>
                          <button
                            onClick={() =>
                              setEditing({
                                isOpen: true,
                                pageId: data.monthly.id,
                                propName: 'Summary',
                                title: 'Monthly Summary',
                                value: data.monthly?.summary || '',
                              })
                            }
                            aria-label="Edit Monthly Summary"
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Weekly Notebook */}
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
                                    value: week.summary || '',
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
              </div>

              {/* 3. 右ペイン (集計・統計情報 / スマホでは下に落ちる) */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6"></div>
            </div>
          )}
        </div>
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
