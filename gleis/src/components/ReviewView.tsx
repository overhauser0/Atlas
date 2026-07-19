'use client';
import { useState, useEffect } from 'react';
import { Edit2, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
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
  completedTasks = [],
}: {
  initialYearMonth: string;
  completedTasks?: any[];
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

  // カレンダー配置の草グラフ
  const ContributionGraph = () => {
    const y = parseInt(currentYM.substring(0, 4));
    const m = parseInt(currentYM.substring(4, 6)) - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = new Date(y, m, 1).getDay(); // 0:日, 1:月...

    // completedTasks から日付ごとの完了数を集計
    const taskCounts: Record<string, number> = {};
    completedTasks?.forEach((task) => {
      if (task.date) {
        // YYYY-MM-DD 形式で抽出
        const dateStr = task.date.split('T')[0];
        taskCounts[dateStr] = (taskCounts[dateStr] || 0) + 1;
      }
    });

    // カレンダーの空白部分
    const blanks = Array.from({ length: firstDayOfWeek });
    // 日付ごとのデータ生成
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dateNum = i + 1;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
      return { dateNum, count: taskCounts[dateStr] || 0 };
    });

    // 件数に応じたカラーレベル
    const getColor = (count: number) => {
      if (count === 0) return 'bg-white/5 border border-white/10';
      if (count <= 2) return 'bg-neon/30 border border-neon/40';
      if (count <= 5) return 'bg-neon/60 border border-neon/70';
      return 'bg-neon shadow-[0_0_8px_rgba(0,112,243,0.6)] border-neon';
    };

    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div
              key={`head-${i}`}
              className="text-center text-[10px] text-gray-500 font-bold"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="w-full aspect-square" />
          ))}
          {days.map((d) => (
            <div
              key={d.dateNum}
              className={`w-full aspect-square rounded-[3px] ${getColor(d.count)} transition-all hover:scale-110`}
              title={`${m + 1}/${d.dateNum}: ${d.count} tasks done`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="shrink-0 flex items-center justify-between mb-6 px-2 mx-auto w-full">
        <h2 className="text-xl font-bold text-gray-400 tracking-wide flex items-center gap-3">
          {formatMonthTitle(currentYM)}

          {isCurrentMonth(currentYM) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-neon/50 text-neon bg-neon/10 uppercase tracking-widest font-normal">
              Current
            </span>
          )}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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
                <section className="noir-glass p-6 rounded-2xl border border-white/10 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase">
                      Monthly Focus
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {/* Business Goal */}
                    <div className="group">
                      <h4 className="text-[10px] font-bold text-neon uppercase mb-1">
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
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon self-start mt-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Life Goal */}
                    <div className="group">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">
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
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-neon"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Summary */}
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
                              value: data.monthly?.summary || '',
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
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6">
                {/* 草グラフ */}
                <div className="noir-glass p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-neon" />
                    Activity
                  </h3>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Completions in {formatMonthTitle(currentYM)}
                  </p>
                  <ContributionGraph />
                </div>
              </div>
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
