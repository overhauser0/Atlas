'use client';

import {
  MONTH_LABELS,
  type MonthlyChartData,
  type MonthlyMetric,
} from './computeYearReview';

interface MonthlyActivityChartProps {
  selectedYear: number;
  monthlyMetric: MonthlyMetric;
  onChangeMetric: (metric: MonthlyMetric) => void;
  chart: MonthlyChartData;
}

const METRIC_TABS: readonly { id: MonthlyMetric; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'photos', label: 'Photos' },
  { id: 'diary', label: 'Diary ★' },
];

export default function MonthlyActivityChart({
  selectedYear,
  monthlyMetric,
  onChangeMetric,
  chart,
}: MonthlyActivityChartProps) {
  const peakValue = Math.max(...chart.values, 0);

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Monthly Rhythm
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            月別アクティビティ
          </h2>
        </div>

        <div className="inline-flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          {METRIC_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeMetric(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                monthlyMetric === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-44 pt-6">
        {chart.values.map((val, idx) => {
          const heightPct =
            val > 0 ? Math.max(8, Math.round((val / chart.max) * 100)) : 0;
          const isPeak = val > 0 && val === peakValue;
          return (
            <div
              key={MONTH_LABELS[idx]}
              className="flex flex-col items-center h-full justify-end gap-1.5"
              title={`${selectedYear}年${idx + 1}月: ${val}${chart.unit}`}
            >
              <span className="text-[10px] font-semibold text-gray-400 tabular-nums h-4">
                {chart.formatValue(val)}
              </span>
              <div className="w-full flex-1 flex items-end justify-center">
                <div
                  className={`w-full max-w-8 rounded-t-lg transition-all duration-500 ${
                    val === 0
                      ? 'bg-gray-100 h-1 rounded-b-lg'
                      : isPeak
                        ? chart.barColor
                        : chart.mutedColor
                  }`}
                  style={val > 0 ? { height: `${heightPct}%` } : undefined}
                />
              </div>
              <span
                className={`text-[10px] font-bold ${
                  isPeak ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {idx + 1}月
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
