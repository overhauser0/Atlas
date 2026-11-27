import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/spark.repository', () => ({
  getSparks: vi.fn(),
  createSpark: vi.fn(),
  updateSpark: vi.fn(),
  consumeSpark: vi.fn(),
  consumeSparksBulk: vi.fn(),
  deleteSpark: vi.fn(),
}));

vi.mock('../utils/websocket', () => ({
  broadcast: vi.fn(),
}));

import * as sparkRepository from '../repositories/spark.repository';
import { broadcast } from '../utils/websocket';
import {
  getTargetDateFromRecordedAt,
  updateSpark,
} from '../services/spark.service';

describe('spark.service getTargetDateFromRecordedAt', () => {
  it('assigns times before 04:00 JST to the previous calendar day', () => {
    expect(getTargetDateFromRecordedAt('2026-03-01T03:59:59+09:00')).toBe(
      '2026-02-28',
    );
    expect(getTargetDateFromRecordedAt('2026-01-01T00:00:00+09:00')).toBe(
      '2025-12-31',
    );
  });

  it('assigns times at or after 04:00 JST to the same calendar day', () => {
    expect(getTargetDateFromRecordedAt('2026-03-01T04:00:00+09:00')).toBe(
      '2026-03-01',
    );
    expect(getTargetDateFromRecordedAt('2026-03-01T23:59:59+09:00')).toBe(
      '2026-03-01',
    );
  });

  it('handles UTC timestamps across JST 04:00 boundary', () => {
    // 2026-05-01T18:59:00Z = 2026-05-02T03:59:00+09:00 -> 2026-05-01
    expect(getTargetDateFromRecordedAt('2026-05-01T18:59:00Z')).toBe(
      '2026-05-01',
    );
    // 2026-05-01T19:00:00Z = 2026-05-02T04:00:00+09:00 -> 2026-05-02
    expect(getTargetDateFromRecordedAt('2026-05-01T19:00:00Z')).toBe(
      '2026-05-02',
    );
  });
});

describe('spark.service updateSpark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recomputes target_date when recorded_at changes and broadcasts refresh', async () => {
    const updatedRow = {
      id: 'spark-1',
      content: 'Edited spark',
      recorded_at: new Date('2026-05-02T02:30:00+09:00'),
      target_date: '2026-05-01',
      discord_message_id: null,
      consumed_at: null,
      created_at: new Date(),
    };
    vi.mocked(sparkRepository.updateSpark).mockResolvedValue(updatedRow);

    const result = await updateSpark('spark-1', {
      content: 'Edited spark',
      recorded_at: '2026-05-02T02:30:00+09:00',
    });

    expect(sparkRepository.updateSpark).toHaveBeenCalledWith('spark-1', {
      content: 'Edited spark',
      recorded_at: '2026-05-02T02:30:00+09:00',
      target_date: '2026-05-01',
    });
    expect(broadcast).toHaveBeenCalledWith(
      JSON.stringify({ type: 'REFRESH_SPARKS' }),
    );
    expect(result).toEqual(updatedRow);
  });

  it('respects explicit target_date when provided', async () => {
    const updatedRow = {
      id: 'spark-1',
      content: 'Edited spark',
      recorded_at: new Date('2026-05-02T02:30:00+09:00'),
      target_date: '2026-05-02',
      discord_message_id: null,
      consumed_at: null,
      created_at: new Date(),
    };
    vi.mocked(sparkRepository.updateSpark).mockResolvedValue(updatedRow);

    await updateSpark('spark-1', {
      recorded_at: '2026-05-02T02:30:00+09:00',
      target_date: '2026-05-02',
    });

    expect(sparkRepository.updateSpark).toHaveBeenCalledWith('spark-1', {
      recorded_at: '2026-05-02T02:30:00+09:00',
      target_date: '2026-05-02',
    });
  });
});
