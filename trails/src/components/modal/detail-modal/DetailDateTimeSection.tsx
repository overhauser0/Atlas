'use client';

import { Calendar, Clock, X } from 'lucide-react';
import { normalizeTimeForInput } from './sparkUtils';

interface DetailDateTimeSectionProps {
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  onChange: (updates: {
    start_date?: string | null;
    start_time?: string | null;
    end_date?: string | null;
    end_time?: string | null;
  }) => void;
}

export default function DetailDateTimeSection({
  startDate,
  startTime,
  endDate,
  endTime,
  onChange,
}: DetailDateTimeSectionProps) {
  const startDateValue = startDate?.slice(0, 10) || '';
  const endDateValue = endDate?.slice(0, 10) || '';
  const startTimeValue = normalizeTimeForInput(startTime);
  const endTimeValue = normalizeTimeForInput(endTime);

  const isDateRangeInvalid = Boolean(
    startDateValue && endDateValue && endDateValue < startDateValue,
  );
  const isTimeRangeInvalid = Boolean(
    startDateValue &&
      (!endDateValue || endDateValue === startDateValue) &&
      startTimeValue &&
      endTimeValue &&
      endTimeValue < startTimeValue,
  );

  const handleStartDateChange = (nextStart: string) => {
    if (!nextStart) {
      onChange({
        start_date: null,
        start_time: null,
        end_date: null,
        end_time: null,
      });
      return;
    }
    onChange({ start_date: nextStart });
  };

  const handleEndDateChange = (nextEnd: string) => {
    if (!nextEnd) {
      onChange({ end_date: null, end_time: null });
      return;
    }
    onChange({ end_date: nextEnd });
  };

  const handleEndTimeChange = (nextEndTime: string) => {
    if (!nextEndTime) {
      onChange({ end_time: null });
      return;
    }
    onChange({
      end_date: endDateValue || startDateValue || null,
      end_time: nextEndTime,
    });
  };

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary-500" />
          <span className="trails-section-label">Schedule</span>
        </div>
        {startDateValue && (
          <button
            type="button"
            onClick={() => handleStartDateChange('')}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-3 h-3" />
            クリア
          </button>
        )}
      </div>

      {/* Start Date & Time */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-500">開始</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative min-w-0">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="Start Date"
              type="date"
              value={startDateValue}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full min-w-0 box-border appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-2.5 text-sm font-medium text-gray-700 focus:border-primary-400 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
          <div className="relative min-w-0">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="Start Time"
              type="time"
              value={startTimeValue}
              disabled={!startDateValue}
              onChange={(e) =>
                onChange({ start_time: e.target.value || null })
              }
              className="w-full min-w-0 box-border appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-2.5 text-sm font-medium text-gray-700 focus:border-primary-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* End Date & Time */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-500">終了</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative min-w-0">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="End Date"
              type="date"
              min={startDateValue || undefined}
              value={endDateValue}
              disabled={!startDateValue}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full min-w-0 box-border appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-2.5 text-sm font-medium text-gray-700 focus:border-primary-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-40"
            />
          </div>
          <div className="relative min-w-0">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="End Time"
              type="time"
              value={endTimeValue}
              disabled={!startDateValue}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="w-full min-w-0 box-border appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-2.5 text-sm font-medium text-gray-700 focus:border-primary-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {isDateRangeInvalid && (
        <p role="alert" className="text-xs font-medium text-red-600">
          終了日は開始日以降を指定してください
        </p>
      )}
      {!isDateRangeInvalid && isTimeRangeInvalid && (
        <p role="alert" className="text-xs font-medium text-red-600">
          終了時刻は開始時刻以降を指定してください
        </p>
      )}
    </section>
  );
}
