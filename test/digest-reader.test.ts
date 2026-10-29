import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl as 5 jobs and 1 bad line', () => {
    const { rows, badLines } = readNight('runs', '2026-10-28');
    expect(badLines).toBe(1);
    expect(rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const render = rows.find((row) => row.job === 'digest/render');
    expect(render).toMatchObject({ owner: null, runs: 1, retries: 0, lastStatus: 'ok', lastError: null });

    const refresh = rows.find((row) => row.job === 'fixtures/refresh');
    expect(refresh).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });

    const sync = rows.find((row) => row.job === 'lane/sync');
    expect(sync).toMatchObject({
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });

    const backup = rows.find((row) => row.job === 'notes/backup');
    expect(backup).toMatchObject({
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      owner: 'lane-07',
    });
  });
});
