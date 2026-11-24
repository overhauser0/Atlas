import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getAllRoutinesMock, insertBatchLocalPiecesMock, broadcastMock } =
  vi.hoisted(() => ({
    getAllRoutinesMock: vi.fn(),
    insertBatchLocalPiecesMock: vi.fn(),
    broadcastMock: vi.fn(),
  }));

vi.mock('../repositories/routine.repository', () => ({
  getAllRoutines: getAllRoutinesMock,
  createRoutine: vi.fn(),
  updateRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}));

vi.mock('../repositories/piece.repository', () => ({
  insertBatchLocalPieces: insertBatchLocalPiecesMock,
}));

vi.mock('../utils/websocket', () => ({
  broadcast: broadcastMock,
}));

import { generateRoutineTasks } from '../services/routine.service';

describe('routine.service generateRoutineTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertBatchLocalPiecesMock.mockImplementation(async (items: unknown[]) =>
      items,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses JST calendar dates, clamps month-end day 31 to Feb 28, and skips non-existent 5th weekdays', async () => {
    vi.useFakeTimers();
    // 2026-01-26 00:30 JST (4th Monday of Jan 2026; still Jan 25 in UTC)
    vi.setSystemTime(new Date('2026-01-26T00:30:00+09:00'));

    getAllRoutinesMock.mockResolvedValue([
      {
        id: 1,
        title: 'Weekly Mon',
        frequency: 'weekly',
        day_of_week: 1,
        note: '',
        url: '',
        parent_id: 'parent-1',
        is_active: true,
      },
      {
        id: 2,
        title: 'Weekly Sun',
        frequency: 'weekly',
        day_of_week: 0,
        note: '',
        url: '',
        parent_id: null,
        is_active: true,
      },
      {
        id: 3,
        title: 'Monthly 31st',
        frequency: 'monthly',
        type: 'date',
        day: 31,
        note: '',
        url: '',
        parent_id: null,
        is_active: true,
      },
      {
        id: 4,
        title: 'Monthly 2nd Wed',
        frequency: 'monthly',
        type: 'nthWeekday',
        week: 2,
        day_of_week: 3,
        note: '',
        url: '',
        parent_id: null,
        is_active: true,
      },
      {
        id: 5,
        title: 'Monthly 5th Mon (none in Feb 2026)',
        frequency: 'monthly',
        type: 'nthWeekday',
        week: 5,
        day_of_week: 1,
        note: '',
        url: '',
        parent_id: null,
        is_active: true,
      },
    ]);

    const result = await generateRoutineTasks();

    expect(result.base_monday).toBe('2026-01-26');
    expect(result.is_fourth_monday).toBe(true);
    expect(result.generated_count).toBe(4);
    expect(result.generated_tasks).toEqual([
      expect.objectContaining({
        title: 'Weekly Mon',
        start_date: '2026-01-26',
        parent_id: 'parent-1',
      }),
      expect.objectContaining({
        title: 'Weekly Sun',
        start_date: '2026-02-01',
      }),
      expect.objectContaining({
        title: 'Monthly 31st',
        start_date: '2026-02-28',
      }),
      expect.objectContaining({
        title: 'Monthly 2nd Wed',
        start_date: '2026-02-11',
      }),
    ]);
    expect(broadcastMock).toHaveBeenCalledWith(
      JSON.stringify({ type: 'REFRESH_PIECES' }),
    );
  });

  it('clamps month-end day 31 to Feb 29 in a leap year and skips monthly tasks when not 4th Monday', async () => {
    vi.useFakeTimers();
    // 2028-01-24 09:00 JST (4th Monday of Jan 2028, leap year!)
    vi.setSystemTime(new Date('2028-01-24T09:00:00+09:00'));

    getAllRoutinesMock.mockResolvedValue([
      {
        id: 1,
        title: 'Monthly 31st',
        frequency: 'monthly',
        type: 'date',
        day: 31,
        note: '',
        url: '',
        parent_id: null,
        is_active: true,
      },
    ]);

    const leapResult = await generateRoutineTasks();
    expect(leapResult.generated_tasks[0].start_date).toBe('2028-02-29');

    // Non-4th Monday: 2026-01-12
    vi.setSystemTime(new Date('2026-01-12T09:00:00+09:00'));
    const nonFourthResult = await generateRoutineTasks();
    expect(nonFourthResult.is_fourth_monday).toBe(false);
    expect(nonFourthResult.generated_count).toBe(0);
  });
});
