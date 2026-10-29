import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

function tempRuns(): string {
  return mkdtempSync(join(tmpdir(), 'rig-runs-'));
}

function appOn(runsDir: string) {
  return createApp({ ...base, runsDir });
}

describe('GET /digest/:night', () => {
  it('returns 200 and the jobs in order', async () => {
    const runsDir = tempRuns();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), readFileSync('runs/2026-10-28.jsonl'));
    const res = await appOn(runsDir).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const jobs = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];
    let at = -1;
    for (const job of jobs) {
      const next = html.indexOf(job);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
    expect(html).toContain('—');
    expect(html).toContain('class="warn"');
    expect(html).toContain('+01:00');
  });

  it('returns 404 when the night file is missing', async () => {
    const res = await appOn(tempRuns()).request('/digest/2099-01-01');
    expect(res.status).toBe(404);
  });

  it('renders nothing ran for an empty file', async () => {
    const runsDir = tempRuns();
    writeFileSync(join(runsDir, '2099-06-01.jsonl'), '');
    const html = await (await appOn(runsDir).request('/digest/2099-06-01')).text();
    expect(html).toContain('nothing ran');
  });

  it('returns 200 when a line does not parse', async () => {
    const runsDir = tempRuns();
    writeFileSync(
      join(runsDir, '2099-07-01.jsonl'),
      '{"at":"2026-10-28T23:00:02+01:00","job":"a/job","status":"ok","owner":"lane-07"}\n{broken\n',
    );
    const res = await appOn(runsDir).request('/digest/2099-07-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('a/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 with the same jobs in the same order as the page', async () => {
    const runsDir = tempRuns();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), readFileSync('runs/2026-10-28.jsonl'));
    const app = appOn(runsDir);
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = await (await app.request('/api/digest/2026-10-28')).json() as { rows: { job: string }[] };
    expect(body.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    let at = -1;
    for (const row of body.rows) {
      const next = html.indexOf(row.job);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });

  it('returns 404 when the night file is missing', async () => {
    const res = await appOn(tempRuns()).request('/api/digest/2099-01-01');
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty file', async () => {
    const runsDir = tempRuns();
    writeFileSync(join(runsDir, '2099-06-01.jsonl'), '');
    const body = await (await appOn(runsDir).request('/api/digest/2099-06-01')).json() as { rows: unknown[] };
    expect(body.rows).toEqual([]);
  });

  it('returns 200 when a line does not parse', async () => {
    const runsDir = tempRuns();
    writeFileSync(
      join(runsDir, '2099-07-01.jsonl'),
      '{"at":"2026-10-28T23:00:02+01:00","job":"a/job","status":"ok","owner":"lane-07"}\n{broken\n',
    );
    const res = await appOn(runsDir).request('/api/digest/2099-07-01');
    expect(res.status).toBe(200);
    const body = await res.json() as { badLines: number; rows: { job: string }[] };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row) => row.job)).toEqual(['a/job']);
  });
});

describe('status board', () => {
  it('links both nights with parsed ok / retry / fail counts', async () => {
    const html = await (await createApp(base).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok 7 · retry 0 · fail 0');
  });
});
